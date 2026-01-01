### **Citizen Budget Lab — Developer Guide**

---

### **1. Local Development Setup**

#### **1.1. Prerequisites**

*   **Python:** 3.13.x (matches CI; 3.12 remains supported if you prefer an older interpreter)
*   **Node.js:** 20+ (aligns with frontend build tooling)
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
    > **Use Python 3.13**: `duckdb==1.4.1` ships wheels for Python 3.13 on all major platforms. If you're on 3.12, everything still works—just keep your `pip` up to date.

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
    -   **Macro baselines:** Staging views `stg_macro_gdp` and `stg_baseline_def_debt` expose GDP and baseline deficit/debt series based on warmed CSVs. Derived views `dim_macro_gdp` and `fct_baseline_deficit_debt` are provided for convenience. The Python provider `services/api/baselines.py` reads from these when the warehouse is enabled, otherwise it falls back to CSV.

#### **2.3. Policy Lever Catalog (YAML)**

The policy reform catalog lives in a repo-managed YAML file for readability and easy edits.

*   **Source file:** `data/policy_levers.yaml`
*   **Schema:** `schemas/policy_levers.schema.json`
*   **Override path (optional):** set `POLICY_CATALOG_PATH=/path/to/policy_levers.yaml`

**Validate from CLI:**

```bash
python tools/validate_policy_catalog.py
```

**Admin editor (local-only):**

1. Start the API and frontend with admin mode enabled:
   ```bash
   POLICY_CATALOG_ADMIN_ENABLED=1 uvicorn services.api.app:app --reload
   POLICY_CATALOG_ADMIN_ENABLED=1 npm run dev --prefix frontend
   ```
2. Open `http://localhost:3000/admin/policy-catalog`.
3. Edit YAML, click **Validate**, then **Download** and replace `data/policy_levers.yaml` before committing.

Optional: set `POLICY_CATALOG_ADMIN_TOKEN=...` in both services and the UI will send it as `x-admin-token`.

---

### **3. GraphQL & Schema Management**

-   **Source of Truth:** The canonical schema is `graphql/schema.sdl.graphql`. This is the contract for all client-server communication and is used for frontend code generation.
-   **Playground:** [http://127.0.0.1:8000/graphql](http://127.0.0.1:8000/graphql)

#### **3.1. Canonical Schema (SDL)**

- **Source of truth:** `graphql/schema.sdl.graphql` (used for frontend codegen).
- **Contract:** CI enforces that the runtime schema matches the canonical SDL via `services/api/tests/test_schema_contract.py`.

For quick orientation, the core enums used across the app are:

```graphql
enum BasisEnum { CP AE }
enum LensEnum { ADMIN COFOG BENEFICIARY }
enum ScopeEnum { S13 CENTRAL }
```

#### **3.2. Current Runtime Additions**

The `runScenario` mutation returns a JSON blob used by the front-end to display results.

Macro baselines

 - Macro baselines (GDP and baseline deficit/debt) are accessed via `services/api/baselines.py`. Both `runScenario` and `shareCard` use this provider. When the warehouse is enabled, this provider reads from dbt staging views (`stg_macro_gdp`, `stg_baseline_def_debt`); otherwise it falls back to warmed CSV files.

#### 3.3. Parity Tools

- COFOG parity helper: `services/api/data_loader.mapping_cofog_aggregate(year, basis)` computes COFOG totals from the JSON mapping and the sample CSV. Use this for local debugging and parity checks when the warehouse is unavailable.
- Parity tests:
  - `services/api/tests/test_cofog_mapping_parity.py` compares warehouse COFOG totals with the mapping helper when the mapping is marked reliable.
  - `services/api/tests/test_warehouse_parity.py` asserts parity between ADMIN and COFOG totals when the warehouse is used, and validates the `WAREHOUSE_COFOG_OVERRIDE` flag.

---

### **4. Secrets & Environment Variables**

-   **Setup:** Create a `.env` file and fill in the values. The `.env` file is git-ignored.
-   **Source of Truth:** All available variables are defined in `services/api/settings.py`.

#### **4.1. Required Secrets (.env)**

| Variable | Description | Required? |
| --- | --- | --- |
| `INSEE_CLIENT_ID` | Client ID for the INSEE API. | Yes |
| `INSEE_CLIENT_SECRET` | Client Secret for the INSEE API. | Yes |
| `HTTP_TIMEOUT` | Timeout in seconds for upstream HTTP requests. Default: `15`. | No |
| `HTTP_RETRIES` | Number of retries for upstream API calls. Default: `3`. | No |
| `EUROSTAT_BASE` | Override base URL for Eurostat JSON API. Default: `https://ec.europa.eu/eurostat/wdds/rest/data/v2.1/json`. | No |
| `EUROSTAT_SDMX_BASE` | Override base URL for Eurostat SDMX endpoints. Default: `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1`. | No |
| `EUROSTAT_LANG` | Preferred language for Eurostat labels. Default: `en`. | No |
| `EUROSTAT_COOKIE` | Optional cookie string for accessing gated Eurostat endpoints. | No |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of origins for CORS. | No |
| `NET_EXP_REFERENCE_RATE` | Annual growth rate for the Net Expenditure Rule compliance check. Default: `0.015`. | No |
| `LEGO_BASELINE_STATIC` | Force LEGO baseline to use the warmed JSON snapshot even when the warehouse is enabled. Default: `1` (on). | No |
| `MACRO_BASELINE_STATIC` | Force macro/baseline series to load from local snapshots (CSV/JSON) even when warehouse is enabled. Default: same as `LEGO_BASELINE_STATIC`. | No |
| `PLF_2026_PLAFONDS_URL` | Override URL (or local path) for the PLF 2026 mission ceilings source used by the warmer. | No |
| `WAREHOUSE_ENABLED` | If `1`, use the dbt warehouse for baseline and allocations. Default: `1` (on). | No |
| `WAREHOUSE_TYPE` | Warehouse backend (`duckdb` or `postgres`). Default: `duckdb`. | No |
| `WAREHOUSE_PG_DSN` | Postgres DSN used when `WAREHOUSE_TYPE=postgres`. | No |
| `WAREHOUSE_DUCKDB_PATH` | Path to DuckDB file. Default: `data/warehouse.duckdb`. | No |
| `WAREHOUSE_COFOG_OVERRIDE` | Force warehouse COFOG data even when parity heuristics fail. Default: `0` (off). | No |
| `LOG_LEVEL` | Python logging level. Default: `INFO`. | No |
| `SENTRY_DSN` | Sentry DSN for error reporting. | No |
| `VOTES_STORE` | Vote storage backend (`file`, `sqlite`, `postgres`). Default: `file`. | No |
| `VOTES_FILE_PATH` | Path to JSON file for vote storage (file backend). Default: `data/cache/votes.json`. | No |
| `VOTES_SQLITE_PATH` | Path to SQLite file for vote storage (sqlite backend). Default: `data/cache/votes.sqlite3`. | No |
| `VOTES_DB_DSN` | Postgres DSN for vote storage when `VOTES_STORE=postgres`. | No |
| `VOTES_DB_POOL_MIN` | Minimum vote storage pool size. Default: `1`. | No |
| `VOTES_DB_POOL_MAX` | Maximum vote storage pool size. Default: `5`. | No |
| `VOTES_DB_POOL_TIMEOUT` | Seconds to wait for a pooled connection. Default: `30`. | No |
| `VOTES_DB_POOL_MAX_IDLE` | Seconds before recycling idle connections. Default: `300`. | No |
| `VOTES_DB_POOL_MAX_LIFETIME` | Max lifetime (seconds) before recycling connections. Default: `1800`. | No |
| `PROCUREMENT_ENRICH_SIRENE` | If `1`, enrich procurement data using SIRENE. Default: `1` (on). | No |
| `MACRO_IRFS_PATH` | Override path to `macro_irfs.json`. | No |
| `LOCAL_BAL_TOLERANCE_EUR` | Floating tolerance for balance checks. Default: `0`. | No |

---

### **5. CI/CD**

-   The primary CI pipeline is defined in `.github/workflows/ci.yml`.
-   **Key Stages:**
    1.  **Backend:** Installs dependencies and runs the `pytest` suite.
    2.  **Semantic Layer:** Generates dbt seeds, builds all dbt models, and runs dbt tests.
    3.  **Frontend:** Installs dependencies, builds the Next.js application, starts a server, and runs `axe` accessibility checks against the key pages (`/`, `/explore`, `/procurement`, etc.).
    4.  **Docker:** Builds both the backend and frontend Docker images to ensure they are valid.

Example workflow breakdown:

- Backend job sets up Python 3.13, installs `services/api/requirements.txt`, and runs `pytest -q`.
- dbt job installs `dbt-core`/`dbt-duckdb` and runs `dbt seed` + `dbt build` under `warehouse/`.
- Frontend job uses Node 18, runs `npm ci` and `npm run build` under `frontend/`.

#### 5.1. Schema Contract Test

The test `services/api/tests/test_schema_contract.py` asserts that the runtime GraphQL schema contains all types/fields defined in `graphql/schema.sdl.graphql` (allowing a small, documented allowlist for planned fields). This helps prevent contract drift.

#### 5.2. Data Warmers & Determinism

- Warmers emit sidecar `.meta.json` files including `produced_columns` and basic provenance. The summary tool prints these sidecar details:

  `python tools/warm_summary.py <YEAR>`

- In CI, prefer running against warmed data (no network), then `make dbt-build && make dbt-test`. Add lightweight checks to ensure `row_count > 0` and required columns are present. The `data-summary` job in the example workflow runs `tools/warm_summary.py` and `tools/validate_sidecars.py` in best-effort mode to print and validate any available warmed data.
Note: Settings are resolved at instantiation time. To change feature flags like `WAREHOUSE_COFOG_OVERRIDE`, set the environment variable before starting the API process. In unit tests, prefer monkeypatching `services.api.settings.get_settings()` to return a shim object exposing the needed attributes.

#### 5.3. COFOG Parity (Warehouse vs Mapping)

- The test `services/api/tests/test_cofog_mapping_parity.py` compares warehouse COFOG totals with the JSON mapping‑based aggregation from the sample CSV. It only runs when the warehouse is available and `cofog_mapping_reliable(...)` is `True` (skipped otherwise).
- Additional parity tests (`services/api/tests/test_warehouse_parity.py`) assert ADMIN vs COFOG totals match when the warehouse is used, and verify that the `WAREHOUSE_COFOG_OVERRIDE` flag forces GraphQL to use the warehouse mapping.
#### 3.4. Frontend Codegen

- A `graphql/codegen.yml` is provided to generate TypeScript types and hooks from the canonical SDL and `.graphql` documents. It references the local SDL file (`graphql/schema.sdl.graphql`) so a running backend is not required.
- Usage:

  ```bash
  # from repo root
  npx graphql-code-generator --config graphql/codegen.yml
  ```

  Add your GraphQL documents under `graphql/queries/*.graphql` and `graphql/mutations/*.graphql` to generate typed operations. The frontend has an npm script `npm run codegen` wired to the root config.

---

### **6. Deployment (Google Cloud Run)**

The application is deployed as two separate services on Google Cloud Run, providing a scalable and independent architecture for the backend and frontend.

*   **Backend URLs**: [https://citizen-budget-api-613407570343.europe-west1.run.app](https://citizen-budget-api-613407570343.europe-west1.run.app), [https://citizen-budget-api-szwctolrdq-ew.a.run.app](https://citizen-budget-api-szwctolrdq-ew.a.run.app)
*   **Frontend URLs**: [https://citizen-budget-frontend-613407570343.europe-west1.run.app](https://citizen-budget-frontend-613407570343.europe-west1.run.app), [https://citizen-budget-frontend-szwctolrdq-ew.a.run.app](https://citizen-budget-frontend-szwctolrdq-ew.a.run.app)

Cloud Run exposes two default domains per service (project-number `run.app` and legacy `a.run.app`); both map to the same service.

**Current production (reviewflow-nrciu, europe-west1):**
*   Services are public (unauthenticated) and listen on the Cloud Run default port (`PORT=8080`).
*   Backend image: `europe-west1-docker.pkg.dev/reviewflow-nrciu/mcp-cloud-run-deployments/citizen-budget-api`
*   Frontend image: `europe-west1-docker.pkg.dev/reviewflow-nrciu/mcp-cloud-run-deployments/citizen-budget-frontend`
*   Frontend build metadata records a `NEXT_PUBLIC_GRAPHQL_URL` pointing to the backend `run.app` URL; runtime `GRAPHQL_URL` is not set.
*   Backend currently uses `VOTES_STORE=firestore`.

#### **6.1. Architecture**

1.  **Backend (`citizen-budget-api`)**: A Python FastAPI container that serves the GraphQL API. It includes a read-only `warehouse.duckdb` file baked into the image, containing all necessary simulation data.
2.  **Frontend (`citizen-budget-frontend`)**: A Node.js container running the Next.js application. It renders the user interface and makes calls to the backend API.

#### **6.2. Build & Deploy Process**

The deployment process requires building and pushing container images to Artifact Registry, then deploying them to Cloud Run.

**Prerequisites:**

*   `gcloud` CLI installed and authenticated.
*   A GCP project with Cloud Build, Cloud Run, and Artifact Registry APIs enabled.
*   An Artifact Registry Docker repo in your region (create with `gcloud artifacts repositories create [AR_REPO] --repository-format=docker --location [REGION]`).

**Step 1: Prepare Data Warehouse (Mandatory)**

The backend container requires a fully built data warehouse. This must be done locally before building the image.

```bash
# 1. Install Python dependencies and dbt
make dbt-install

# 2. Fetch baseline data from sources (Eurostat, etc.)
make warm-all

# 3. Build the DuckDB warehouse file
make dbt-build
```

**Step 2: Build & Deploy Backend**

The backend is deployed from the root of the repository. A `.gcloudignore` file is used to ensure the `data/warehouse.duckdb` file is included in the upload.

```bash
# Build the container image using Cloud Build
gcloud builds submit --tag [REGION]-docker.pkg.dev/[PROJECT_ID]/[AR_REPO]/citizen-budget-api --file services/api/Dockerfile .

# Deploy the image to Cloud Run
gcloud run deploy citizen-budget-api \
  --image [REGION]-docker.pkg.dev/[PROJECT_ID]/[AR_REPO]/citizen-budget-api \
  --project [PROJECT_ID] \
  --region [REGION] \
  --allow-unauthenticated \
  --port 8080
```
*Replace `[PROJECT_ID]`, `[REGION]`, and `[AR_REPO]` with your GCP settings.*

**Step 3: Build & Deploy Frontend**

The frontend deployment requires the backend's URL to be injected as an environment variable at runtime.

```bash
# Build the container image from the 'frontend' directory
cd frontend
gcloud builds submit --tag [REGION]-docker.pkg.dev/[PROJECT_ID]/[AR_REPO]/citizen-budget-frontend .
cd ..

# Deploy the image to Cloud Run, setting the API URL
gcloud run deploy citizen-budget-frontend \
  --image [REGION]-docker.pkg.dev/[PROJECT_ID]/[AR_REPO]/citizen-budget-frontend \
  --project [PROJECT_ID] \
  --region [REGION] \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars GRAPHQL_URL=[BACKEND_URL]/graphql
```
*Replace `[PROJECT_ID]`, `[REGION]`, `[AR_REPO]`, and `[BACKEND_URL]` with the appropriate values.*

Note: The frontend proxy resolves the backend URL in this order: `GRAPHQL_URL` (runtime) -> `NEXT_PUBLIC_GRAPHQL_URL` (build-time or runtime) -> `http://localhost:8000/graphql` (default). Production currently records `NEXT_PUBLIC_GRAPHQL_URL` at build time.

#### **6.2.1. Manual Deploy (Current Production CLI)**

Use these exact commands to deploy to the current production project (`reviewflow-nrciu`) in `europe-west1`:

```bash
# Set defaults for convenience (optional)
gcloud config set project reviewflow-nrciu
gcloud config set run/region europe-west1

# Build + deploy backend (from repo root)
gcloud builds submit \
  --tag europe-west1-docker.pkg.dev/reviewflow-nrciu/mcp-cloud-run-deployments/citizen-budget-api \
  --file services/api/Dockerfile .

gcloud run deploy citizen-budget-api \
  --image europe-west1-docker.pkg.dev/reviewflow-nrciu/mcp-cloud-run-deployments/citizen-budget-api \
  --project reviewflow-nrciu \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080

# Build + deploy frontend
cd frontend
gcloud builds submit \
  --tag europe-west1-docker.pkg.dev/reviewflow-nrciu/mcp-cloud-run-deployments/citizen-budget-frontend .
cd ..

gcloud run deploy citizen-budget-frontend \
  --image europe-west1-docker.pkg.dev/reviewflow-nrciu/mcp-cloud-run-deployments/citizen-budget-frontend \
  --project reviewflow-nrciu \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars GRAPHQL_URL=https://citizen-budget-api-613407570343.europe-west1.run.app/graphql
```

Tip: The frontend service can also rely on a build-time `NEXT_PUBLIC_GRAPHQL_URL`, but manual deploys should set `GRAPHQL_URL` at runtime to avoid stale defaults.

#### **6.2.2. Build Page Snapshot (Temporary)**

To reduce cold-start latency on the Build page, the API can serve a precomputed snapshot at `/build-snapshot?year=2026`. This is a temporary mitigation and can be removed once the GraphQL response time is consistently fast.

Generate/update the snapshot:

```bash
python tools/build_snapshot.py --year 2026
```

This writes `data/cache/build_page_2026.json` (and a `.meta.json` sidecar) which is baked into the API image at deploy time.

#### **6.3. Votes & Scenarios Persistence (Cloud SQL)**

Both voter preferences (who voted when) and scenario definitions (what they chose) are persisted in a PostgreSQL database (Cloud SQL). This ensures that user data survives container restarts and enables analytics on budget choices.

**Database Structure:**
*   `votes` table: Stores vote timestamp, scenario_id, and user metadata.
*   `scenarios` table: Stores the canonical DSL (JSON) for each unique budget configuration.

**Setup:**

1. **Create a Postgres instance and database** in Cloud SQL, then create a user/password.
2. **Set the store backend** to Postgres:

```bash
VOTES_STORE=postgres
VOTES_DB_DSN=postgresql://[USER]:[PASSWORD]@/[DBNAME]?host=/cloudsql/[PROJECT]:[REGION]:[INSTANCE]
```

3. **(Optional) Tune the pool** with `VOTES_DB_POOL_MIN`, `VOTES_DB_POOL_MAX`, etc.
4. **Deploy the API with the Cloud SQL instance attached:**

```bash
gcloud run deploy citizen-budget-api \
  --image [REGION]-docker.pkg.dev/[PROJECT_ID]/[AR_REPO]/citizen-budget-api \
  --project [PROJECT_ID] \
  --region [REGION] \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances [PROJECT]:[REGION]:[INSTANCE] \
  --set-env-vars VOTES_STORE=postgres,VOTES_DB_DSN="postgresql://[USER]:[PASSWORD]@/[DBNAME]?host=/cloudsql/[PROJECT]:[REGION]:[INSTANCE]"
```

The API applies schema migrations automatically on startup when `VOTES_STORE=postgres` is enabled.

#### **6.4. Custom Domains (Cloud Run)**

Cloud Run can map custom domains to your services and provision TLS automatically.

**Recommended flow (gcloud CLI):**

If you have not installed the beta commands yet, run `gcloud components install beta`.

1. Pick a domain and DNS provider. If DNS is not hosted on Google, you may need to verify domain ownership by adding a TXT record (Cloud Identity verification).
2. Create mappings for the frontend and backend:

```bash
# Frontend (root domain)
gcloud beta run domain-mappings create \
  --service citizen-budget-frontend \
  --domain [DOMAIN] \
  --project [PROJECT_ID] \
  --region [REGION]

# Backend (api subdomain)
gcloud beta run domain-mappings create \
  --service citizen-budget-api \
  --domain api.[DOMAIN] \
  --project [PROJECT_ID] \
  --region [REGION]
```

3. Fetch DNS records to add at your provider:

```bash
gcloud beta run domain-mappings describe \
  --domain [DOMAIN] \
  --project [PROJECT_ID] \
  --region [REGION] \
  --format="yaml(status.resourceRecords)"
```

4. Add the returned records (A/AAAA or CNAME, depending on the domain) in your DNS provider and wait for propagation.
5. Verify status:

```bash
gcloud beta run domain-mappings list \
  --project [PROJECT_ID] \
  --region [REGION]
```

**Apex vs subdomain:** The apex/root domain is `[DOMAIN]` (for example, `budget-ouvert.fr`). Subdomains are `www.[DOMAIN]` or `api.[DOMAIN]`. Cloud Run returns the exact DNS records you must add; apex records are typically A/AAAA, while subdomains are typically CNAME. If your DNS provider does not support apex aliases, use `www.[DOMAIN]` for the frontend and redirect the apex to it.

6. Point the frontend to the custom backend domain (choose one):
   - Set `GRAPHQL_URL=https://api.[DOMAIN]/graphql` at deploy time.
   - Or set `NEXT_PUBLIC_GRAPHQL_URL=https://api.[DOMAIN]/graphql` at build time.

**Cheap and reliable registrar examples (verify current pricing):**
*   Cloudflare Registrar (at-cost, requires Cloudflare DNS).
*   Porkbun (low pricing, solid DNS).
*   Namecheap (frequent promos; watch renewal pricing).
*   OVHcloud (often competitive for .fr domains).

**Provider-specific DNS hints (generic examples):**
*   Cloudflare: create the exact A/AAAA/CNAME values shown by `gcloud beta run domain-mappings describe`. Set Proxy to DNS-only during validation.
*   Porkbun: add the returned A/AAAA/CNAME records under DNS; apex records are supported directly.
*   OVHcloud: add the returned A/AAAA/CNAME records in the DNS zone; if asked, choose an A record for apex and CNAME for subdomains.
*   Namecheap: add records in Advanced DNS. If apex aliasing is unsupported, map `www` and forward the root to `https://www.[DOMAIN]`.

**Domain name ideas (availability checked via RDAP on 2026-01-01; confirm at registrar):**
*   budget-citoyen.fr — available
*   budget-collectif.fr — available
*   budget-ouvert.fr — available
*   budget-public.fr — available
*   budget-transparence.fr — available
*   budget-partage.fr — available
*   labobudget.fr — available
*   labobudgetcitoyen.fr — available
*   budgetcitoyen.org — available
*   budgetcitoyen.eu — available
