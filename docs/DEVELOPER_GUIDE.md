### **Citizen Budget Lab — Developer Guide**

---

### **1. Local Development Setup**

#### **1.1. Prerequisites**

*   **Python:** 3.12+ (as used in CI)
*   **Node.js:** 18+ (as used in CI)
*   **Docker & Docker Compose:** For running services in containers.
*   **dbt-cli:** Required for managing the data warehouse. See section 2.3.

#### **1.2. Backend (Python/FastAPI)**

1.  **Create a Python virtual environment** and install dependencies:
    ```bash
    # From the project root
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r services/api/requirements.txt
    ```

2.  **Configure Environment Variables:** See the "Secrets & Environment Variables" section below for a complete list. At a minimum, copy the example and provide INSEE credentials if you need to refresh data from their APIs.
    ```bash
    cp .env.example .env
    # Edit .env to add your INSEE_CLIENT_ID and INSEE_CLIENT_SECRET
    ```

3.  **Start the API server** (with hot-reloading):
    ```bash
    # From the project root
    uvicorn services.api.app:app --reload
    ```
    *   **GraphQL Playground:** [http://127.0.0.1:8000/graphql](http://127.0.0.1:8000/graphql)
    *   **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

#### **1.3. Frontend (Next.js)**

1.  **Install dependencies:**
    ```bash
    # From the project root
    cd frontend
    npm install
    ```

2.  **Run the development server:**
    ```bash
    # From the frontend/ directory
    npm run dev
    ```
    *   **Application:** [http://localhost:3000](http://localhost:3000)
    *   The frontend automatically proxies GraphQL requests from its `/api/graphql` path to the backend running on port 8000, as configured in `next.config.js`.

#### **1.4. Docker**

*   **Run both services together** (API on port 8000, frontend on 3000):
    ```bash
    # From the project root
    docker compose up --build
    ```

*   **For Windows users** who prefer to run the API on the host and only the frontend in Docker (e.g., for easier Python debugging), use the Windows-specific compose file:
    ```bash
    # Ensure your backend is running on the host via `uvicorn` first
    docker compose -f docker-compose.windows.yml up --build frontend
    ```

---

### **2. Data Pipeline & Management**

The project uses a hybrid data strategy: a transparent HTTP cache for live API calls, a "warmer" system for pre-fetching key datasets, and a dbt warehouse for semantic modeling.

#### **2.1. Data Caching & Warmers**

The API includes two caching layers:

*   **HTTP GET cache:** A transparent on-disk cache for upstream APIs (INSEE, Eurostat, etc.). It lives in `data/.http_cache` and is configured via environment variables (see below). To clear it, simply delete the directory.
*   **Dataset warmers:** An explicit CLI (`services/api/cache_warm.py`) that fetches and writes normalized snapshots to `data/cache/`. This is the primary mechanism for populating data for local development and for feeding the dbt warehouse.

**Key Warmer Commands (run from project root):**

1.  **Warm Everything:** The most common command for local setup.
    ```bash
    make warm-all YEAR=2026 COUNTRIES=FR,DE,IT
    ```

2.  **LEGO Baseline (Core Budget Data):** Fetches expenditure and revenue data from Eurostat SDMX XML.
    ```bash
    make warm-eurostat YEAR=2026
    # Or directly:
    # python -m services.api.cache_warm lego --year 2026 --country FR
    ```

3.  **State Budget (PLF/LFI):** Fetches mission-level credits from the French government's ODS portal.
    ```bash
    python -m services.api.cache_warm plf --dataset plf-2024-depenses-2024-selon-nomenclatures-destination-et-nature --year 2024
    ```

4.  **Procurement Data (DECP):** Ingests consolidated procurement data.
    ```bash
    make warm-decp YEAR=2024
    # Or directly:
    # python -m services.api.cache_warm decp --year 2024
    ```

5.  **INSEE Macro Series:** Fetches key macroeconomic indicators.
    ```bash
    python -m services.api.cache_warm macro-insee --config data/macro_series_config.json
    ```

#### **2.2. Semantic Layer (dbt)**

-   **Overview:** The dbt project lives in `warehouse/` and uses DuckDB by default. It reads the warmed CSVs from `data/cache/` to produce the semantic models used by the API.
-   **Setup & Usage:**
    ```bash
    # Install dbt dependencies
    make dbt-install

    # Generate the COFOG mapping seed from the canonical JSON file
    make dbt-seed

    # Run all models
    make dbt-build

    # Run all tests
    make dbt-test
    ```
-   **API Integration:** The FastAPI/GraphQL layer automatically prefers dbt models when `WAREHOUSE_ENABLED=1` (the default) and the DuckDB file (`data/warehouse.duckdb`) exists.

---

### **3. GraphQL API**

-   **Source of Truth:** The canonical schema is `graphql/schema.sdl.graphql`. This is the contract for all client-server communication and is used for frontend code generation.
-   **Playground:** [http://127.0.0.1:8000/graphql](http://127.0.0.1:8000/graphql)

#### **3.1. Verified Schema (SDL)**

```graphql
# Canonical SDL for codegen. Update with docs/GRAPHQL_CONTRACT.md

schema { query: Query, mutation: Mutation }

enum BasisEnum { CP AE }
enum LensEnum { ADMIN COFOG BENEFICIARY }

scalar JSON

"""
MVP+ (LEGO Builder) additions
"""

enum ScopeEnum { S13 CENTRAL }

type LegoPiece { id: ID!, label: String!, type: String!, amountEur: Float, share: Float, beneficiaries: JSON!, examples: [String!]!, sources: [String!]!, locked: Boolean! }
type LegoBaseline { year: Int!, scope: ScopeEnum!, pib: Float!, depensesTotal: Float!, recettesTotal: Float!, pieces: [LegoPiece!]! }
type DistanceByPiece { id: ID!, shareDelta: Float! }
type Distance { score: Float!, byPiece: [DistanceByPiece!]! }

type MissionAllocation { code: String!, label: String!, amountEur: Float!, share: Float! }
type Allocation { mission: [MissionAllocation!]!, cofog: [MissionAllocation!], beneficiary: [MissionAllocation!] }

type Supplier { siren: String!, name: String! }
type ProcurementItem { supplier: Supplier!, amountEur: Float!, cpv: String, procedureType: String, locationCode: String, sourceUrl: String }

type Accounting { deficitPath: [Float!]!, debtPath: [Float!]! }
type Compliance { eu3pct: [String!]!, eu60pct: [String!]!, netExpenditure: [String!]!, localBalance: [String!]! }
type Macro { deltaGDP: [Float!]!, deltaEmployment: [Float!]!, deltaDeficit: [Float!]!, assumptions: JSON! }

type DecileImpact { d: Int!, deltaNetIncomePct: Float! }
type Distribution { decile: [DecileImpact!]!, giniDelta: Float!, povertyRateDeltaPp: Float!, assumptions: JSON! }

type Source { id: ID!, datasetName: String!, url: String!, license: String!, refreshCadence: String!, vintage: String! }

input RunScenarioInput { dsl: String! }
type ShareSummary { title: String!, deficit: Float!, debtDeltaPct: Float, highlight: String, resolutionPct: Float, masses: JSON, eu3: String, eu60: String }
type RunScenarioPayload { id: ID!, scenarioId: ID!, accounting: Accounting!, compliance: Compliance!, macro: Macro!, distribution: Distribution, distanceScore: Float, shareSummary: ShareSummary, resolution: ResolutionType, warnings: [String!] }

type EUCountryCofog { country: String!, code: String!, label: String!, amountEur: Float!, share: Float! }
type FiscalPath { years: [Int!]!, deficitRatio: [Float!]!, debtRatio: [Float!]! }

type MassTargetType { massId: String!, targetDeltaEur: Float!, specifiedDeltaEur: Float! }
type ResolutionType { overallPct: Float!, byMass: [MassTargetType!]! }

enum PolicyFamilyEnum {
    PENSIONS
    TAXES
    HEALTH
    DEFENSE
    STAFFING
    SUBSIDIES
    CLIMATE
    SOCIAL_SECURITY
    PROCUREMENT
    OPERATIONS
    OTHER
}

type PolicyLeverType {
    id: ID!
    family: PolicyFamilyEnum!
    label: String!
    description: String
    paramsSchema: JSON!
    fixedImpactEur: Float
    feasibility: JSON!
    conflictsWith: [ID!]!
    sources: [String!]!
    shortLabel: String
    popularity: Float
    massMapping: JSON
}

type MassLabelType {
    id: ID!
    displayLabel: String!
    description: String
    examples: [String!]!
    synonyms: [String!]!
}

type IntentType {
    id: ID!
    label: String!
    emoji: String
    massId: String!
    seed: JSON!
    popularity: Float!
    tags: [String!]!
}

type Query {
  allocation(year: Int!, basis: BasisEnum = CP, lens: LensEnum = ADMIN): Allocation!
  procurement(year: Int!, region: String!, cpvPrefix: String, procedureType: String, minAmountEur: Float, maxAmountEur: Float): [ProcurementItem!]!
  sources: [Source!]!
  sirene(siren: String!): JSON!
  inseeSeries(dataset: String!, series: [String!]!, sinceYear: Int): JSON!
  dataGouvSearch(query: String!, pageSize: Int = 5): JSON!
  communes(department: String!): JSON!
  euCofogCompare(year: Int!, countries: [String!]!, level: Int = 1): [EUCountryCofog!]!
  euFiscalPath(country: String!, years: [Int!]!): FiscalPath!

  # MVP+: LEGO Builder
  legoPieces(year: Int!, scope: ScopeEnum = S13): [LegoPiece!]!
  legoBaseline(year: Int!, scope: ScopeEnum = S13): LegoBaseline!
  legoDistance(year: Int!, dsl: String!, scope: ScopeEnum = S13): Distance!
  shareCard(scenarioId: ID!): ShareSummary!
  policyLevers(family: PolicyFamilyEnum, search: String): [PolicyLeverType!]!
  massLabels: [MassLabelType!]!
  popularIntents(limit: Int = 6): [IntentType!]!
  suggestLevers(massId: String!, limit: Int = 5): [PolicyLeverType!]!
}

type Mutation {
  runScenario(input: RunScenarioInput!): RunScenarioPayload!
  saveScenario(id: ID!, title: String, description: String): Boolean!
  deleteScenario(id: ID!): Boolean!
}
```

---

### **4. Secrets & Environment Variables**

-   **Setup:** Copy `.env.example` to `.env` and fill in the values. The `.env` file is git-ignored.
-   **Source of Truth:** All available variables are defined in `services/api/settings.py`.

| Variable                        | Description                                                                                             | Required |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `INSEE_CLIENT_ID`               | OAuth client ID from api.insee.fr for BDM and SIRENE APIs.                                              | **Yes**  |
| `INSEE_CLIENT_SECRET`           | OAuth client secret for INSEE APIs.                                                                     | **Yes**  |
| `HTTP_TIMEOUT`                  | Timeout in seconds for upstream HTTP requests. Default: `15`.                                           | No       |
| `HTTP_RETRIES`                  | Number of retry attempts for failed HTTP requests. Default: `3`.                                        | No       |
| `EUROSTAT_COOKIE`               | Optional cookie string for accessing gated Eurostat endpoints.                                          | No       |
| `CORS_ALLOW_ORIGINS`            | Comma-separated list of allowed origins for CORS. Default: `http://localhost:3000`.                     | No       |
| `NET_EXP_REFERENCE_RATE`        | Annual growth rate for the Net Expenditure Rule compliance check. Default: `0.015`.                     | No       |
| `WAREHOUSE_ENABLED`             | Toggle for using the dbt/DuckDB warehouse. Default: `1` (on). Set to `0` to disable.                    | No       |
| `WAREHOUSE_DUCKDB_PATH`         | Path to the DuckDB database file. Default: `data/warehouse.duckdb`.                                     | No       |
| `WAREHOUSE_COFOG_OVERRIDE`      | Force API to use warehouse for COFOG data, even if heuristics fail. Default: `0` (off).                 | No       |
| `LOG_LEVEL`                     | Logging level for the API server. Default: `INFO`.                                                      | No       |
| `SENTRY_DSN`                    | DSN for Sentry error reporting.                                                                         | No       |
| `PROCUREMENT_ENRICH_SIRENE`     | Enable/disable SIRENE enrichment for procurement data. Default: `1` (on).                               | No       |
| `MACRO_IRFS_PATH`               | Override the default path to the macroeconomic IRF parameters JSON file.                                | No       |
| `LOCAL_BAL_TOLERANCE_EUR`       | Tolerance in Euros for local government balance checks. Default: `0`.                                   | No       |

---

### **5. CI/CD**

-   The primary CI pipeline is defined in `.github/workflows/ci.yml`.
-   **Key Stages:**
    1.  **Backend:** Installs dependencies and runs the `pytest` suite.
    2.  **Semantic Layer:** Generates dbt seeds, builds all dbt models, and runs dbt tests.
    3.  **Frontend:** Installs dependencies, builds the Next.js application, starts a server, and runs `axe` accessibility checks against the key pages (`/`, `/explore`, `/procurement`, etc.).
    4.  **Docker:** Builds both the backend and frontend Docker images to ensure they are valid.