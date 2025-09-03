Citizen Budget Lab — Semantic Layer (dbt)

Overview

- dbt project lives under `warehouse/` with a DuckDB default target and optional Postgres target via env vars.
- Sources read warmed CSVs under `data/cache/` and fall back to sample CSVs in `data/`.
- Models provide:
  - `stg_state_budget_lines`: mission/programme CP/AE lines
  - `stg_procurement_contracts`: normalized procurement rows
  - `dim_cofog_mapping`: admin→COFOG weights (seeded from `data/cofog_mapping.json`)
  - `dim_apu_subsector`: simple APUC/APUL/ASSO tagging (APUC default for admin/`MIN-` buyers)
  - `fct_admin_by_mission`: admin aggregates by mission
  - `fct_admin_by_cofog`: functional aggregates (COFOG major) with labels
  - `fct_procurement_suppliers`: supplier rollups with `competition_flag`
  - `vw_procurement_contracts`: typed passthrough view of raw procurement

Setup

- Install dbt:

  make dbt-install

- Build seeds and models (uses DuckDB at `data/warehouse.duckdb`):

  make dbt-seed
  make dbt-build

- Tests

  make dbt-test

API wiring

- The FastAPI/GraphQL layer prefers dbt models when `WAREHOUSE_ENABLED=1` and the DuckDB file exists:
  - Admin allocation: `allocation(year, basis, lens: ADMIN)` uses `fct_admin_by_mission`.
  - Procurement: `procurement(year, region, ...)` aggregates over `vw_procurement_contracts`.
  - COFOG (S13) continues to use warmed Eurostat shares (baseline-scaled) as designed.

Profiles

- DuckDB (default) path: `data/warehouse.duckdb`.
- Postgres (optional): set envs and switch target by exporting `DBT_TARGET=postgres` or editing `profiles.yml`.
  - `DBT_PG_HOST`, `DBT_PG_PORT`, `DBT_PG_DB`, `DBT_PG_USER`, `DBT_PG_PASSWORD`, `DBT_PG_SCHEMA`.

Integrity tests

- Mapping weights sum to 1 per source code.
- Admin→COFOG totals match admin totals within 0.1% per year.

Notes

- The mapping seed is generated from `data/cofog_mapping.json` by `tools/build_seeds.py`.
- Programme/action mappings and year-aware overrides will be included automatically if present in JSON (defaults used for `programme_to_cofog_years`).
