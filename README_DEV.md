Citizen Budget Lab — Developer Notes

Overview

- Minimal scaffold to match the README spec:
  - Python FastAPI + Strawberry GraphQL API in `services/api/`.
  - Sample datasets in `data/` to drive example queries.
  - Scenario DSL JSON Schema in `schemas/scenario.schema.json`.
  - Backlog and schema contract under `BACKLOG.md` and `docs/GRAPHQL_CONTRACT.md`.
  - Client codegen config in `graphql/codegen.yml` with canonical SDL in `graphql/schema.sdl.graphql`.

Run locally

1) Create a Python 3.11+ environment and install deps:

   pip install -r services/api/requirements.txt

2) Start the API server (hot reload):

   uvicorn services.api.app:app --reload

3) Visit GraphQL Playground at:

  http://127.0.0.1:8000/graphql

Frontend

- The full frontend scope is tracked in `BACKLOG.md` and `docs/FRONTEND_PLAN.md`. No scaffold is included here to avoid duplication.

Example queries

- Allocation by mission (CP basis):

  query { allocation(year: 2026, basis: CP, lens: ADMIN) { mission { code label amountEur share } } }

- Allocation by COFOG lens:

  query { allocation(year: 2026, basis: CP, lens: COFOG) { cofog { code label amountEur share } } }

- Top suppliers in département 75 for 2024 (filters supported):

  query {
    procurement(year: 2024, region: "75", cpvPrefix: "30", minAmountEur: 100000) {
      supplier { siren name }
      amountEur cpv procedureType
    }
  }

- Run a scenario (encode the YAML as base64):

  mutation {
    runScenario(input: { dsl: "<base64>" }) {
      id
      scenarioId
      accounting { deficitPath debtPath }
      compliance { eu3pct eu60pct netExpenditure localBalance }
      macro { deltaGDP deltaEmployment deltaDeficit assumptions }
      distanceScore
      shareSummary { title deficit debtDeltaPct highlight }
    }
  }

Encode the YAML (macOS/Linux):

  base64 -w0 << 'EOF'
  version: 0.1
  baseline_year: 2026
  assumptions:
    horizon_years: 5
  actions:
    - id: ed_invest_boost
      target: mission.education
      dimension: cp
      op: increase
      amount_eur: 1000000000
      recurring: true
    - id: ir_cut_T3
      target: tax.ir.bracket_T3
      dimension: tax
      op: rate_change
      delta_bps: -50
  EOF

- Scenario persistence (in-memory):

  mutation { saveScenario(id: "<scenario-id>", title: "My scenario", description: "demo") }
  mutation { deleteScenario(id: "<scenario-id>") }

- Share card DTO (for OG image):

  query { shareCard(scenarioId: "<scenario-id>") { title deficit debtDeltaPct highlight } }

Use the `scenarioId` from `runScenario` to resolve `shareCard` and feed your frontend OG route (e.g., `/api/og?scenarioId=...`).

- List data sources (provenance registry placeholder):

  query { sources { id datasetName url license refreshCadence vintage } }

- EU comparisons (stubs until Eurostat integration):

  query { euCofogCompare(year: 2026, countries: ["FR","DE"]) { country code label share } }

  query { euFiscalPath(country: "FR", years: [2026,2027,2028]) { years deficitRatio debtRatio } }

- List data sources (provenance registry placeholder):

  query { sources { id datasetName url license refreshCadence vintage } }

- EU comparisons (stubs until Eurostat integration):

  query { euCofogCompare(year: 2026, countries: ["FR","DE"]) { country code label share } }

  query { euFiscalPath(country: "FR", years: [2026,2027,2028]) { years deficitRatio debtRatio } }

Notes

- Data and calculations are placeholders for demo/testing. Replace with real warehouse and services per the main README.
- Compliance flags implement a minimal, illustrative logic only.
- The JSON Schema is a starting point for validating the DSL payload.
- Macro outputs now include ΔGDP/Δemployment/Δdeficit using a simple IRF convolution with COFOG mapping and default elasticities.
 - See `docs/GRAPHQL_CONTRACT.md` for the full GraphQL contract targeted by MVP/V1/V2. Implement resolvers incrementally.

TwinBars & Canvas fixtures (frontend)

- Create a small local fixture scenario showing a shrinking deficit gap to validate `TwinBars` animations and `DeficitGapGauge` rendering.
- Seed via a hardcoded DSL in the app or by calling `runScenario` on load in dev mode; ensure chips above the bars reflect scheduled year changes.
- Preview social image locally by hitting your OG image route (e.g., `http://localhost:3000/api/og?scenarioId=...`).

Official API wiring

- Env vars (required for INSEE):
  - `INSEE_CLIENT_ID`, `INSEE_CLIENT_SECRET`
    - Get credentials from https://api.insee.fr (Scopes used: `seriesbdm.read`, `sireneV3`).
    - Local: copy `.env.example` to `.env` and fill in values (git‑ignored).
    - CI: add repository secrets `INSEE_CLIENT_ID` and `INSEE_CLIENT_SECRET` (see `docs/SECRETS.md`).
  - HTTP cache (enabled by default):
    - `HTTP_CACHE_ENABLED=1|0` — toggle on/off (default 1)
    - `HTTP_CACHE_DIR` — override cache dir (default `data/.http_cache`)
    - `HTTP_CACHE_TTL_DEFAULT` — seconds (default 86400)
    - `HTTP_CACHE_TTL_INSEE` — seconds (default 21600)
    - `HTTP_CACHE_TTL_EUROSTAT` — seconds (default 86400)
    - `HTTP_CACHE_TTL_DATAGOUV` — seconds (default 86400)
    - `HTTP_CACHE_TTL_GEO` — seconds (default 604800)
  - Compliance parameters:
    - `NET_EXP_REFERENCE_RATE` — annual allowed growth for net primary expenditure (default 0.015 = 1.5%)
  - Eurostat (SDMX / JSON):
    - `EUROSTAT_SDMX_BASE` — dissemination SDMX XML base (default `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1`)
    - `EUROSTAT_BASE` — legacy SDMX‑JSON base (default `https://ec.europa.eu/eurostat/wdds/rest/data/v2.1/json`)
    - `EUROSTAT_LANG` — language segment for JSON (default `en`)
    - `EUROSTAT_COOKIE` — optional cookie if JSON endpoints are gated on your edge
- Endpoints exposed via GraphQL:
  - `sirene(siren: String!)`: INSEE SIRENE v3 lookup.
  - `inseeSeries(dataset: String!, series: [String!]!, sinceYear: Int)`: INSEE BDM.
  - `dataGouvSearch(query: String!, pageSize: Int)`: data.gouv.fr dataset search.
  - `communes(department: String!)`: geo.api.gouv.fr communes for a department.

Examples

  query { sirene(siren: "552100554") }

  query { inseeSeries(dataset: "CNA-2014-PIB", series: ["PIB-VALUE"] sinceYear: 2015) }

  query { dataGouvSearch(query: "budget de l'Etat", pageSize: 3) }

  query { communes(department: "75") { code nom population } }

Warm essential datasets (optional but recommended)

- Pre-download and cache key datasets so the app doesn’t hit upstreams at runtime.

  python -m services.api.cache_warm plf \
    --base https://data.economie.gouv.fr \
    --dataset plf25-depenses-2025-selon-destination \
    --year 2025

  python -m services.api.cache_warm eurostat-cofog --year 2026 --countries FR,DE,IT

- Outputs go to `data/cache/`. The API will automatically use `state_budget_mission_{year}.csv` when present for allocation queries; otherwise, it falls back to `data/sample_state_budget.csv`.

Makefile helpers

- Warm and summarize in one go (YEAR and COUNTRIES overridable):

  make warm-all YEAR=2026 COUNTRIES=FR,DE,IT

- Only Eurostat warmers (LEGO baseline + COFOG shares):

  make warm-eurostat YEAR=2026 COUNTRIES=FR,DE,IT

- Optional ODS snapshot (set DATASET):

  make warm-plf YEAR=2025 DATASET=plf25-depenses-2025-selon-destination

- Print summary for a warmed year:

  make summary YEAR=2026

Notes
- The LEGO warmer uses Eurostat SDMX 2.1 (XML) for expenditures via `EUROSTAT_SDMX_BASE`, which is generally reliable without cookies.
- Revenues use SDMX XML (`GOV_10A_TAXAG` for taxes/contributions; `GOV_10A_MAIN` for P.11/P.12 sales/fees). Some ESA lines (e.g., D.4 public income, D.7 transfers received) may require additional flows and are currently left at 0 to avoid double counting. Interest (D.41) is proxied from COFOG 01.7 total (GF0107 TE) until a dedicated ESA series is wired. See `docs/LEGO_METHOD.md` (Known Limitations).

Caching behavior

- All GET requests through the internal HTTP client are cached to disk as JSON by URL+params.
- Cached entries respect domain-specific TTLs (see env vars above). Use `force_refresh: true` (internal) or delete files under `data/.http_cache` to refresh.

Client codegen (optional)

- Ensure the API runs at `http://localhost:8000/graphql`.
- Put your `.graphql` documents under `graphql/queries/` and `graphql/mutations/`.
- Generate types/hooks (requires Node and @graphql-codegen):

  npx graphql-code-generator --config graphql/codegen.yml

Docker

- API (FastAPI + GraphQL):

  - Build: `docker build -f services/api/Dockerfile -t cbl-api .`
  - Run: `docker run --rm -p 8000:8000 cbl-api`
  - GraphQL: http://127.0.0.1:8000/graphql
  - CORS: the API allows `http://localhost:3000` and `http://127.0.0.1:3000` by default.
    - Override with `CORS_ALLOW_ORIGINS` (comma-separated) if your frontend runs elsewhere.

- Frontend (Next.js):

  - Build: `docker build -t cbl-frontend ./frontend`
  - Run (point to API):
    - macOS/Windows: `docker run --rm -p 3000:3000 -e NEXT_PUBLIC_GRAPHQL_URL=http://host.docker.internal:8000/graphql cbl-frontend`
    - Linux: `docker run --rm -p 3000:3000 --add-host=host.docker.internal:host-gateway -e NEXT_PUBLIC_GRAPHQL_URL=http://host.docker.internal:8000/graphql cbl-frontend`

CI

- `/.github/workflows/ci.yml` builds and tests the backend (pytest), builds the frontend, and builds both Docker images on push/PR.

Docker Compose (run both)

- Start both services (API on 8000, frontend on 3000):

  docker compose up --build

  - Frontend talks to API via internal DNS `http://api:8000/graphql` (injected at build time).

- Windows option (Frontend only in Docker hitting host API):

  - Run API on host (e.g., `uvicorn services.api.app:app --reload`).
  - Build/run frontend with Windows override:

    docker compose -f docker-compose.windows.yml up --build frontend

  - If using Docker Desktop on Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` as hinted in `docker-compose.windows.yml`.

Notes

- If your browser console shows a missing `/favicon.ico`, add a favicon under `frontend/public/` or use the default SVG we include (linked in `app/layout.tsx`).
