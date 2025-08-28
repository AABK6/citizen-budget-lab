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

  mutation { runScenario(input: { dsl: "<base64>" }) { id accounting { deficitPath debtPath } compliance { eu3pct eu60pct netExpenditure localBalance } macro { deltaGDP deltaEmployment deltaDeficit assumptions } } }

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

Official API wiring

- Env vars (required for INSEE):
  - `INSEE_CLIENT_ID`, `INSEE_CLIENT_SECRET`
    - Get credentials from https://api.insee.fr (Scopes used: `seriesbdm.read`, `sireneV3`).
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

Client codegen (optional)

- Ensure the API runs at `http://localhost:8000/graphql`.
- Put your `.graphql` documents under `graphql/queries/` and `graphql/mutations/`.
- Generate types/hooks (requires Node and @graphql-codegen):

  npx graphql-code-generator --config graphql/codegen.yml
