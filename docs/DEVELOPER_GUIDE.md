# Citizen Budget Lab — Developer Guide

This guide provides technical information for developers working on the Citizen Budget Lab project.

## 1. Local Development Setup

### 1.1. Backend (Python/FastAPI)

1.  **Create a Python 3.11+ environment** and install dependencies:

    ```bash
    pip install -r services/api/requirements.txt
    ```

2.  **Configure Environment Variables:** See the "Secrets & Environment Variables" section below.

3.  **Start the API server** (with hot-reloading):

    ```bash
    uvicorn services.api.app:app --reload
    ```

*   **GraphQL Playground:** [http://127.0.0.1:8000/graphql](http://127.0.0.1:8000/graphql)
*   **Metrics Endpoint:** [http://127.0.0.1:8000/metrics](http://127.0.0.1:8000/metrics)

### 1.2. Frontend (Next.js)

1.  **Install dependencies:**

    ```bash
    cd frontend
    npm install
    ```

2.  **Run the development server:**

    ```bash
    npm run dev
    ```

*   **Application:** [http://localhost:3000](http://localhost:3000)
*   The frontend automatically proxies GraphQL requests from `/api/graphql` to the backend running on port 8000, as configured in `next.config.js`.

### 1.3. Docker

*   **Run both services** (API on 8000, frontend on 3000):

    ```bash
    docker compose up --build
    ```

*   **For Windows users** running the API on the host and the frontend in Docker, use the Windows-specific compose file:

    ```bash
    docker compose -f docker-compose.windows.yml up --build frontend
    ```

## 2. Data Pipeline & Management

The project uses two primary mechanisms for managing data: a transparent HTTP cache for live API calls and a "warmer" system for pre-fetching and normalizing key datasets.

### 2.1. Data Caching & Warmers

The API includes two complementary caching layers:

*   **HTTP GET cache:** transparent on-disk cache for upstream APIs (INSEE, Eurostat, data.gouv, geo.api.gouv). Configured via env and stored under `data/.http_cache`.
*   **Dataset warmers:** explicit CLI that fetches and writes normalized snapshots under `data/cache/` for essential budgets and comparisons so the app doesn’t need live calls at runtime.

#### HTTP cache (transparent)

- Enabled by default. Env vars:
  - `HTTP_CACHE_ENABLED=1|0`
  - `HTTP_CACHE_DIR=data/.http_cache`
  - `HTTP_CACHE_TTL_DEFAULT=86400`, `HTTP_CACHE_TTL_INSEE=21600`, `HTTP_CACHE_TTL_EUROSTAT=86400`, `HTTP_CACHE_TTL_DATAGOUV=86400`, `HTTP_CACHE_TTL_GEO=604800`
- Deletes: remove files under `data/.http_cache`.

#### Warmers (explicit prefetch)

- Run from repo root using Python 3.11+ (virtualenv recommended):

  1) **PLF/LFI mission-level credits via Opendatasoft (MEFSIN):**

     ```bash
     python -m services.api.cache_warm plf \
       --base https://data.economie.gouv.fr \
       --dataset plf25-depenses-2025-selon-destination \
       --year 2025
     ```

     Output: `data/cache/state_budget_mission_2025.csv`

  2) **Eurostat COFOG shares per country/year:**

     ```bash
     python -m services.api.cache_warm eurostat-cofog --year 2026 --countries FR,DE,IT,ES
     ```

     Output: `data/cache/eu_cofog_shares_2026.json`

  3) **LEGO baseline (Eurostat SDMX XML):**

     ```bash
     make warm-eurostat YEAR=2026
     ```

     or end-to-end with summary and EU shares:

     ```bash
     make warm-all YEAR=2026 COUNTRIES=FR,DE,IT
     ```

     Output: `data/cache/lego_baseline_2026.json`

  4) **Eurostat COFOG subfunction shares (GFxx.y):**

     ```bash
     make warm-eurostat-sub YEAR=2026 COUNTRIES=FR,DE,IT
     ```

     Output: `data/cache/eu_cofog_subshares_2026.json`

#### Makefile Helpers

- Warm and summarize in one go (YEAR and COUNTRIES overridable):

  `make warm-all YEAR=2026 COUNTRIES=FR,DE,IT`

- Only Eurostat warmers (LEGO baseline + COFOG shares):

  `make warm-eurostat YEAR=2026 COUNTRIES=FR,DE,IT`

- Sanity-check sources before warming (fast probes):

  `make verify-warmers YEAR=2026`

- DECP procurement (consolidated ODS):

  `make warm-decp YEAR=2024`

### 2.2. Semantic Layer (dbt)

- **Overview:** dbt project lives under `warehouse/` with a DuckDB default target and optional Postgres target via env vars.
- **Sources:** read warmed CSVs under `data/cache/` and fall back to sample CSVs in `data/`.
- **Models:** provide cleaned, aggregated views for the API.
- **Setup:**
    - `make dbt-install`
    - `make dbt-seed`
    - `make dbt-build`
    - `make dbt-test`
- **API Integration:** The FastAPI/GraphQL layer prefers dbt models when `WAREHOUSE_ENABLED=1` and the DuckDB file exists.

## 3. GraphQL API

- **Source of Truth:** The canonical schema is `graphql/schema.sdl.graphql`. This is the contract for all client-server communication.
- **Playground:** [http://127.0.0.1:8000/graphql](http://127.0.0.1:8000/graphql)

### 3.1. Schema (SDL)

```graphql
schema {
  query: Query
  mutation: Mutation
}

enum BasisEnum { CP AE }
enum LensEnum { ADMIN COFOG BENEFICIARY REFORM_FAMILY REFORM_NAMED }

type MissionAllocation {
  code: String!
  label: String!
  amountEur: Float!
  share: Float!
}

type Allocation {
  mission: [MissionAllocation!]!
  cofog: [MissionAllocation!]
  beneficiary: [MissionAllocation!]
}

type Supplier {
  siren: String!
  name: String!
}

type ProcurementItem {
  supplier: Supplier!
  amountEur: Float!
  cpv: String
  procedureType: String
  locationCode: String
  sourceUrl: String
}

type Accounting {
  deficitPath: [Float!]!
  debtPath: [Float!]!
}

type Compliance {
  eu3pct: [String!]!
  eu60pct: [String!]!
  netExpenditure: [String!]!
  localBalance: [String!]!
}

type Macro {
  deltaGDP: [Float!]!
  deltaEmployment: [Float!]!
  deltaDeficit: [Float!]!
  assumptions: JSON!
}

scalar JSON

enum ScopeEnum { S13 CENTRAL }

type LegoPiece {
  id: ID!
  label: String!
  type: String!
  amountEur: Float
  share: Float
  cofogMajors: [String!]!
  beneficiaries: JSON!
  examples: [String!]!
  sources: [String!]!
  locked: Boolean!
}

type LegoBaseline {
  year: Int!
  scope: ScopeEnum!
  pib: Float!
  depensesTotal: Float!
  recettesTotal: Float!
  pieces: [LegoPiece!]!
}

type DistanceByPiece { id: ID!, shareDelta: Float! }
type Distance { score: Float!, byPiece: [DistanceByPiece!]! }

type Source {
  id: ID!
  datasetName: String!
  url: String!
  license: String!
  refreshCadence: String!
  vintage: String!
}

enum PolicyFamily { PENSIONS TAXES HEALTH DEFENSE STAFFING SUBSIDIES CLIMATE SOCIAL_SECURITY PROCUREMENT OPERATIONS OTHER }

type PolicyLever {
  id: ID!
  family: PolicyFamily!
  label: String!
  description: String
  paramsSchema: JSON!
  fixedImpactEur: Float
  feasibility: JSON!
  conflictsWith: [ID!]!
  sources: [String!]!
}

type MassTarget { massId: String!, targetDeltaEur: Float!, specifiedDeltaEur: Float! }
type Resolution { overallPct: Float!, byMass: [MassTarget!]! }

input RunScenarioInput {
  dsl: String!
}

type RunScenarioPayload {
  id: ID!
  scenarioId: ID!
  accounting: Accounting!
  compliance: Compliance!
  macro: Macro!
  resolution: Resolution
}

type Query {
  allocation(year: Int!, basis: BasisEnum = CP, lens: LensEnum = ADMIN): Allocation!
  procurement(
    year: Int!
    region: String!
    cpvPrefix: String
    procedureType: String
    minAmountEur: Float
    maxAmountEur: Float
  ): [ProcurementItem!]!
  sources: [Source!]!
  sirene(siren: String!): JSON!
  inseeSeries(dataset: String!, series: [String!]!, sinceYear: Int): JSON!
  dataGouvSearch(query: String!, pageSize: Int = 5): JSON!
  communes(department: String!): JSON!
  legoPieces(year: Int!, scope: ScopeEnum = S13): [LegoPiece!]!
  legoBaseline(year: Int!, scope: ScopeEnum = S13): LegoBaseline!
  legoDistance(year: Int!, dsl: String!, scope: ScopeEnum = S13): Distance!
  policyLevers(family: PolicyFamily, search: String): [PolicyLever!]!
}

type Mutation {
  runScenario(input: RunScenarioInput!): RunScenarioPayload!
  saveScenario(id: ID!, title: String, description: String): Boolean!
  deleteScenario(id: ID!): Boolean!
}
```

### 3.2. Example Queries

- Allocation by mission:
  ```graphql
  query { allocation(year: 2026, basis: CP, lens: ADMIN) { mission { code label amountEur share } } }
  ```

- Run a scenario (encode the YAML as base64):
  ```graphql
  mutation {
    runScenario(input: { dsl: "<base64>" }) {
      id
      scenarioId
      accounting { deficitPath debtPath }
    }
  }
  ```

## 4. Secrets & Environment Variables

- **Setup:** Copy `.env.example` to `.env` and fill in the values. The `.env` file is git-ignored.
- **Required:**
  - `INSEE_CLIENT_ID`: Your OAuth client ID from api.insee.fr.
  - `INSEE_CLIENT_SECRET`: Your OAuth client secret.
- **Optional:**
  - `EUROSTAT_COOKIE`: A cookie for accessing gated Eurostat endpoints.
  - `HTTP_CACHE_ENABLED`: Toggle the HTTP cache.
  - `CORS_ALLOW_ORIGINS`: Comma-separated list of allowed origins for CORS.
  - `NET_EXP_REFERENCE_RATE`: Annual allowed growth for net primary expenditure.
  - `OPENFISCA_URL`: URL for a self-hosted OpenFisca instance.

## 5. CI/CD

- The CI pipeline is defined in `.github/workflows/ci.yml`.
- It runs backend tests (`pytest`), builds the dbt semantic layer, builds the frontend, and runs accessibility checks (`axe`).