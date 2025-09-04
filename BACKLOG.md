Citizen Budget Lab — Backlog (MVP → MVP+ → V1 → V2)

Purpose

- Single source of truth for scope, grouped by milestones. Each epic links to concrete acceptance criteria (AC) and maps to the product brief in readme.md. Use labels [MVP], [MVP+], [V1], [V2], [Tech], [Data], [API], [UI], [Ops], [Docs], [QA].

Legend & Verification

- Checkboxes:
  - [x] Implemented and verified in this repo.
  - [~] Partially implemented; gaps noted in ACs.
  - [ ] Not implemented yet.
- How to verify quickly:
  - Run tests: `pytest -q` (CI also runs `.github/workflows/ci.yml`).
  - Warm caches: `make warm-all YEAR=2026 COUNTRIES=FR,DE,IT` then `make summary YEAR=2026`.
  - Inspect LEGO baseline: open `data/cache/lego_baseline_2026.json` and check `meta.warning` and totals.
  - Exercise GraphQL: start API (`uvicorn services.api.app:app --reload`) then hit GraphQL Playground (`http://127.0.0.1:8000/graphql`) with sample queries from `README_DEV.md`.
  - Verify HTTP caching/retries: see `services/api/http_client.py` and environment TTLs in `docs/CACHING.md`.

Roadmap Overview

- MVP (8–12 weeks): Explorer, procurement, mechanical scenarios, EU lights, macro‑lite.
- MVP+ (4–8 weeks after MVP): LEGO Budget Builder (public‑facing expenditure/revenue pieces), beneficiary lens, permalinks/exports.
- V1 (12–20 weeks): Distributional (OpenFisca), EU compare, classroom mode.
- V2 (20–32 weeks): Macro priors + uncertainty, local finance module + constraints.

New Epics — Playground ↔ Workshop (MVP+ → V1)

- Budget Dials & Pending State [UI]
  - AC:
    - Changing a mass via a dial sets a target and applies a striped “Pending” skin on the mass.
    - A Δ chip appears under the relevant bar (e.g., “Defense −€6B (Unspecified)”).
    - Global HUD shows a Resolution Meter “Specified X%”. Partial shares watermark Share Cards.
- Policy Workshop (families → levers) [UI][API]
  - AC:
    - Reform Library lists `policyLevers(family, search)` with feasibility and conflicts.
    - Scoped view shows a **Progress‑to‑Target** bar (e.g., “€3.9B/€6B specified”) and presets.
    - `runScenario` returns `resolution` with `overallPct` and `byMass` entries.
    - Conflict/overlap guard raises `ConflictNudge` in UI and API validation errors on conflicting levers.
- Lens Switch [UI]
  - AC:
    - Toggle By Mass ⇄ By Reform Family ⇄ By Named Reform recolors without breaking totals.
    - Hovering a reform ribbon highlights where it paints across multiple masses.
- Compare & Remix [UI][API]
  - AC:
    - Load a published plan (locked levers, “as proposed” badge) and show side‑by‑side twin bars + Δ waterfall.
    - `scenarioCompare(a,b)` returns ribbons/waterfall deltas JSON.
    - Duplicate & Edit forks a scenario preserving lineage; share card shows lineage tag.
- Share Cards [UI][Ops]
  - AC:
    - OG renderer outputs stamped image (title, mini twin‑bars, top reforms, deficit/debt, EU lights, Specified X% watermark when partial) with methods/version.
    - Cache invalidates on methods/version or `policy_catalog.version` changes.
- Challenges & Classroom [UI]
  - AC:
    - Challenges enforce `Resolution ≥80%` before submit; share card includes a challenge badge.
    - Classroom: Room with live leaderboard (Balance, Equity, Compliance, Resolution) and auto‑debrief slides.

Milestone: MVP

Product outcomes
- Explore €1 with ADMIN/COFOG lenses and sources; Procurement (table+map); run simple scenarios; show EU rule lights; macro‑lite deltas.

Epics
- Data Ingestion & Provenance [Data]
  - Central budget via ODS (PLF/LFI/PLR): incremental pulls, dedupe, per‑year vintage; mission/program/action; AE/CP/execution when available.
    - Current: mission‑level snapshot warmer implemented (`cache_warm.py: warm_plf_state_budget`) with server‑side/group‑by and local fallback; sidecar provenance written. 2024 (dataset `plf-2024-depenses-2024-selon-nomenclatures-destination-et-nature`) and 2025 warmed; improved field heuristics select human‑readable mission labels.
- COFOG mapping (programme/action, year‑aware): weights sum to 1.0; schema+tests; fallback for unknowns.
    - DONE: programme‑level precedence and year‑aware overrides implemented in `allocation_by_cofog` with support for `programme_to_cofog` and `programme_to_cofog_years` in `data/cofog_mapping.json`. Tests cover precedence and year overrides.
    - Tech: COFOG subfunctions caching — warmer writes `data/cache/eu_cofog_subshares_YYYY.json`; GraphQL `cofogSubfunctions(year,country,major)` prefers warmed cache and falls back to Eurostat JSON/SDMX live fetch. Note: Eurostat gating may require `EUROSTAT_COOKIE` to populate JSON; SDMX fallback is used when possible.
  - Procurement (DECP) pipeline: ingest consolidated; dedup id+publication; lot→contract; amount quality flags.
    - DONE: CLI warmer (`cache_warm.py: decp`) ingests CSV/ODS, deduplicates and rolls up lots→contracts, flags amount quality, writes cache + sidecar. API prefers warmed cache in `procurement_top_suppliers`.
  - SIRENE join: normalize SIREN/SIRET; NAF/size; cache + rate limiting.
    - Current: INSEE clients (`clients/insee.py`) in place; best‑effort API enrichment adds `naf`/`companySize` to procurement; full warehouse join pending.
  - Macro series (INSEE BDM): GDP/deflators/employment; provenance.
    - Current: INSEE BDM client implemented; GDP used from local CSV; deflators/employment pending.
  - Source registry: `Source(id, dataset, url, license, cadence, vintage, checksum)`.
    - Current: `list_sources()` reads `data/sources.json` and exposed via GraphQL `sources()`.
- Semantic Layer (dbt + DuckDB/Postgres) [Data]
  - Admin↔COFOG aggregates; procurement semantic views; APU subsector tagging.
  - Current: dbt project implemented (`warehouse/`) with DuckDB default target and optional Postgres; staging (`stg_*`), dims (`dim_*`), facts (`fct_*`) and views (`vw_*`) created; CI builds and tests.
  - Acceptance Criteria (AC):
    - [x] DuckDB or Postgres target configured with connection/envs.
    - [x] dbt models for admin↔COFOG aggregates with tests (weights sum to 1; totals match inputs within tolerance).
    - [x] Procurement semantic views (buyers, suppliers, amounts, CPV, geo) with deduplication rules.
    - [x] APU subsector tagging (APUC/APUL/ASSO) for lines and scenarios.
    - [x] CI job runs `dbt build` and unit tests.
- GraphQL API (Explorer & Procurement) [API]
  - `allocation(year, basis, lens)` from warehouse; P95 < 1.5s.
    - Current: implemented (`schema.Query.allocation`); ADMIN lens and procurement prefer warehouse/dbt views when available; COFOG lens uses warmed Eurostat S13 shares (scaled by baseline) with SDMX fallback; performance targets to validate.
  - `procurement(year, region)` with filters; export fields.
    - Current: implemented with cpv/procedure/amount filters; warehouse/dbt path preferred, falls back to normalized DECP cache when needed.
  - `sources()` lists datasets w/ vintages/links.
    - Current: implemented, reads `data/sources.json`.
- Scenario DSL & Engine (Mechanical) [API]
  - DSL schema finalize; resolver & guardrails (target→ids, year aware); offsets; AE/CP arithmetic.
  - Acceptance Criteria (AC):
    - [x] JSON Schema validated in resolver; descriptive errors.
    - [x] Deterministic scenario id from canonicalized DSL (tests).
    - [x] AE/CP arithmetic applied consistently; recurring flag supported.
    - [x] Guardrails: reject unknown targets; enforce locked/bounds (from piece policy) with user-friendly messages.
    - [x] Offsets support with pool rules (spending/revenue) and exclusions (schema support; v0 applies pool-level offsets mechanically).
    - Current: schema + resolver implemented (`schemas/scenario.schema.json`, `schema.Mutation.runScenario`); guardrails/basic validation present; offsets/advanced guards TBD.
- Compliance Checks [API]
  - EU 3%/60% flags; Net expenditure rule (simplified, env reference rate).
  - Acceptance Criteria (AC):
    - [x] EU 3%: deficit ratio check vs GDP per year.
    - [x] EU 60%: debt ratio info/above flags.
    - [x] Net expenditure rule with env reference rate; year-over-year growth assessed.
    - [x] Local balance (équilibre réel) for APUL scenarios; require offsets or flag violations (simple per-year net delta ≈ 0 rule).
- Macro Kernel (Lite) [API]
  - IRF store + convolution (ΔGDP/Δemployment/Δdeficit); apply stabilizers.
  - Current: implemented (`data/macro_irfs.json` + `_macro_kernel`), wired into `run_scenario`.
  - Acceptance Criteria (AC):
    - [x] IRFs loaded from versioned JSON; horizon documented.
    - [x] Convolution transforms mechanical shocks to macro deltas with correct units (pct GDP → EUR).
    - [ ] Sensitivity toggles/priors prepped for V2 (configurable kernels).
- Front‑end — Full Scope (Next.js) [UI]
  - Shell & nav; Explore ADMIN/COFOG; outcome panel; Procurement map/table; What‑if builder + results cards; Sources page; a11y+i18n; performance; tests.
    - Current: minimal scaffold present; core charts and pages partially implemented; see status snapshot.
  - Acceptance Criteria (AC):
    - [x] Explore €1: ADMIN and COFOG lenses with table; stacked shares; source links.
    - [x] Procurement table & map with filters; source links; CSV export.
    - [x] What‑if builder minimal UI with scoring panel; EU lights.
    - [x] A11y (keyboard, contrast) and i18n FR/EN; basic tests (axe on key pages).
- Quality, Ops, Security [Ops][QA]
  - Tests & QA; caching & rate limiting; observability; Docker & CI.
    - Current: pytest suite in place; HTTP caching + retries (`http_client.py`); Dockerfiles & CI workflows present; observability pending.
  - Acceptance Criteria (AC):
    - [x] HTTP cache with TTLs per domain; retries exponential backoff.
    - [x] CI runs tests and builds Docker images.
    - [x] Basic logging/metrics; error reporting (Sentry optional).
    - [x] Test coverage threshold documented.

Milestone: MVP+

Product outcomes
- “Build your budget” with intuitive pieces (expenditure/revenue), beneficiary lens, live balance/deficit/debt/EU lights, distance‑to‑current, shareable scenarios.

Epics
- LEGO Budget Builder — Data & Config [Data]
  - Define pieces (config): `data/lego_pieces.json` v0 (≥30 spend, ≥15 revenue) with public‑friendly labels, examples, precise COFOG/ESA mapping, implied beneficiaries, bounds/locks, revenue elasticities, sources.
  - LEGO baseline warmer (S13): `python -m services.api.cache_warm lego --year 2026` writes `data/cache/lego_baseline_YYYY.json` — v0 covers expenditures (amounts/shares per expenditure piece, total expenditures) + GDP and metadata; v0.1 adds revenue baselines. Consistency: sum of pieces = APU S13 totals (tolerance < 0.1%).
  - DONE (2025‑09‑02): SDMX migration + baseline improvements
    - SDMX client [Tech][Data]
      - Added `services/api/clients/eurostat.py::sdmx_value(flow, key, time)` to fetch SDMX 2.1 XML from Eurostat’s dissemination API and parse Obs values.
      - New settings: `EUROSTAT_SDMX_BASE` (default `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1`), reuses `EUROSTAT_COOKIE` when needed.
      - Helper fallback: for series with no Obs in target year, fall back to last available Obs for robust baselining.
    - Expenditures warmer [Data]
      - Implemented two‑pass bucket allocation by (COFOG major × NA_ITEM): collect buckets used in `lego_pieces.json`, fetch each bucket once via SDMX (`gov_10a_exp` A.MIO_EUR.S13.GF{major}.{NA_ITEM}.{geo}?time=YYYY), then distribute by normalized per‑piece weights (cofog weight × na_item weight).
      - Social splits: normalized GF10/D62 weights across relevant pieces so they divide the major bucket instead of each taking the full amount.
      - Health citycare: switched to `D.632` for social transfers in kind (kept a small `D.62` share) to capture realistic magnitudes.
      - Debt interest: filled `debt_interest` from COFOG 01.7 total (GF0107, TE) via SDMX XML since `D.41` is not exposed in `gov_10a_exp`/`gov_10a_main`. Warns in snapshot meta.
      - Fallback: if all SDMX calls resolve to zero, approximate from local COFOG‑major totals as before.
    - Revenues warmer [Data]
      - Migrated to SDMX XML using `gov_10a_taxag` for taxes/social contributions and `gov_10a_main` for sales/service revenue (P.11/P.12) and totals.
      - Implemented mapping/splits in code for pseudo‑codes used by pieces:
        - VAT `D.211`: split 70% standard vs 30% reduced across `rev_vat_standard`/`rev_vat_reduced`.
        - Income taxes `D.51`: split 60% PIT / 40% CIT.
        - Other production taxes `D.29`: 14% wage tax, 10% environment, 2% fines, 24% transfer taxes, remainder to generic `rev_prod_taxes`.
        - Property taxes `D.59_prop` maps to `D.59A`.
        - Social contributions from `gov_10a_taxag`: `D.611` (employees), `D.612` (employers), `D.613` (self‑employed).
      - Left `rev_csg_crds`, `rev_public_income (D.4)`, and `rev_transfers_in (D.7)` at 0 until a dedicated flow/mapping is added to avoid double counting.
      - Warning handling: preserve JSON fetch warning but amounts now come from SDMX XML.
    - Makefile & tooling [Ops][Docs]
      - Makefile targets: `warm-eurostat`, `warm-plf`, `summary`, `warm-all`. Tool `tools/warm_summary.py` prints totals and top 5 pieces.
      - README_DEV updated with usage examples and env settings.
    - Outputs [Data]
      - `data/cache/lego_baseline_2026.json` now has non‑zero revenues and realistic health/social magnitudes; includes `meta.warning` detailing any fallbacks and interest proxy.
      - `data/cache/eu_cofog_shares_YYYY.json` still warmed (JSON fallback noted when Eurostat JSON is gated).
    - Configuration [Data]
      - Revenue splits are configurable under `data/revenue_splits.json` (VAT standard/reduced; PIT/CIT; D.29 sub‑splits) to keep assumptions explicit and auditable.
- LEGO Budget Builder — GraphQL API [API]
  - SDL: `Scope`, `LegoPiece`, `LegoBaseline`, `Distance`; queries `legoPieces`, `legoBaseline`, `legoDistance`.
  - Resolvers & loaders: read `lego_pieces.json` and warmed baseline; graceful fallbacks.
  - Allocation lens: `BENEFICIARY` returns households/enterprises/collective; implemented via LEGO baseline + beneficiary weights; tests added.
  - DSL extension: targets `piece.<id>`; `delta_pct|amount_eur`; `recurring`; readable validation.
  - Acceptance Criteria (AC):
    - [x] `legoPieces(year, scope)` includes amountEur/share when warmed; falls back gracefully.
    - [x] `legoBaseline(year, scope)` returns totals and pieces; scope handling robust.
    - [x] `legoDistance(year, dsl)` computes share deltas and a distance score.
    - [ ] Unit tests for each query with warmed snapshot present/absent.
      - Note: smoke tests for `legoPieces`, `legoBaseline`, and `legoDistance` exist; add explicit tests for the “absent snapshot” path.
- LEGO Budget Builder — Calculation Engine [API]
  - Apply deltas on pieces → (COFOG×na_item | ESA revenue) vectors; update mechanical deficit/debt; enforce locks/bounds.
  - Static v0 elasticities for revenue (VAT/PIT/CIT/excises/CSG/contributions) with guardrails + docs.
  - Distance‑to‑budget metric (L1 share delta + cosine similarity) exposed via `legoDistance`.
- LEGO Budget Builder — Front‑end [UI]
  - Build page (three‑panel): Left LEGO Shelf (Spending/Revenues tabs, search/filters, lock/bounds badges) → Center Canvas with `TwinBars` and animated Deficit Gap → Right Consequence Dashboard (Accounting, EU Rule Lights, Debt path, Macro fan, Distribution).
  - Scoreboard & comparator: balance, debt, EU lights, distance; stacked bars “Your budget vs current”; scale tooltips.
  - Modes & sharing: “From scratch” and “From current”; permalinks (deterministic IDs); share‑card image generator + OG tags; Challenge presets; deterministic IDs wired to OG image.
  - Status: [~]
    - New `/build` page with three panels: Pieces shelf, Baseline canvas (simple shares), and Scoreboard (deficit, debt, EU lights). Distance wired.
    - Per‑piece dials: Target Δ% (role: target) and Change Δ% (action); locked pieces disabled.
    - Per‑mass dials for COFOG majors: Target Δ€ and Change Δ€.
    - Resolution Meter wired; striped “Pending” overlay; Δ chips for Target/Specified/Unresolved; permalinks via `?dsl=<base64>`.
    - Reform Library: lists levers by family/search; adds lever targets (role: target) with Conflict Nudge banner client‑side; server also validates.
    - Share Card: stub SVG route `/api/og?scenarioId=…` ready to replace with renderer.
    - Remaining: richer lever parameter forms; presets; final OG renderer; A11y polish.
  - Accessibility & i18n: full FR/EN, keyboard, contrast; “show the table”.
- LEGO Budget Builder — Documentation [Docs]
  - `docs/LEGO_METHOD.md`: sources, mapping, beneficiary rules, elasticities (v0), limitations, versioning; audit tables.
  - UPDATED: Reflect SDMX XML usage (expenditures via `gov_10a_exp`, taxes via `gov_10a_taxag`, sales via `gov_10a_main`), health `D.632`, social splits normalization, and interest proxy from COFOG 01.7.
  - Acceptance Criteria (AC):
    - [x] Method doc matches implementation; includes Known Limitations and Validation.
    - [x] api-points.md lists SDMX XML flows and series key patterns.
    - [x] README_DEV links to limitations and usage; SECRETS lists relevant envs.

Follow‑ups / TODO (post‑migration)
- DONE (2025‑09‑03): Parameterized revenue splits via `data/revenue_splits.json`; warmer loads from this config instead of code constants.
- Add SDMX caching layer for XML calls to speed up warms for multiple years/countries.
- Identify and wire flows for `D.4` (public income) and `D.7` (transfers received) to populate `rev_public_income` and `rev_transfers_in` precisely.
- Investigate a pure `D.41` series in a complementary Eurostat flow and switch `debt_interest` to ESA‑only basis when available.
- Add basic unit/integrity checks: ensure piece sums match S13 totals within tolerance; assert weights sum to 1 per bucket.

Milestone: V1

Product outcomes
- Add distributional analysis (OpenFisca), full EU comparisons, and classroom mode.

Epics
- Distributional (OpenFisca) [API]
  - Host OpenFisca + wrapper; translate DSL to parameters; GraphQL outputs (deciles/households/regions); UI charts.
- EU Comparisons [API][UI]
  - Eurostat COFOG & deficit/debt comparisons; Front‑end Compare EU page (selector, charts, export, sourcing notes).
  - Acceptance Criteria (AC):
    - [x] EU COFOG shares are warmed (`data/cache/eu_cofog_shares_YYYY.json`) and consumed by the UI for fast renders.
    - [ ] Compare EU charts expose “show table” with exact slice and a source chip.
    - [ ] Pin 1–2 countries and carry the selection across app views.
- Classroom Mode [UI]
  - Guided scenarios, teacher/student modes, printable handouts.

Milestone: V2

Product outcomes
- Add macro prior families (uncertainty) and a local finance module with balance constraints.

Epics
- Macro Priors & Uncertainty [API]
  - Multiple prior families; IRF low/base/high; fan charts; toggle.
- Local Finance Module [Data][API][UI]
  - Ingest DGFiP/OFGL balances; Équilibre réel validation; local entity views + rule feedback.

Milestone‑Wide Conventions

- Definitions
  - AE/CP: Authorisations d’engagement / Crédits de paiement (commitment vs payment authorizations).
  - COFOG: UN functional classification of government outlays (01..10).
  - S13: General Government sector (APU) in ESA (central, local, social security consolidated).
  - ESA codes (D./P.): Revenue/expenditure categories (e.g., D.62 social benefits, P.51g gross fixed capital formation).
- How to validate
  - Every AC implies a test or a demo endpoint/page; add tests under `services/api/tests/` and UI screenshots in PRs.
  - Performance targets refer to P95 measured locally against warmed caches.
- Out of scope
  - Legal determinations on compliance; personal data; non‑public datasets.

Tracking & Ownership

- Assign owners per epic: Product, Tech Lead, Data Eng, Backend, Front‑end, Economist.
- Use labels above; prefix titles with milestone ([MVP], [MVP+], [V1], [V2]).

Status Snapshot (MVP) — 2025‑09‑04

- [x] GraphQL API skeleton with allocation, procurement, sources; official API wrappers (INSEE/Eurostat/ODS/data.gouv/geo) with HTTP caching.
- [x] Scenario DSL validation + mechanical engine; macro kernel (lite) integrated; compliance lights (EU 3%/60%) minimal.
- [x] Deterministic scenario IDs in runScenario (hash of canonical DSL) with tests.
- [x] Dockerfiles + CI baseline; docker‑compose with Windows override to run API+frontend together.
- [~] Frontend: Explore charts added (sunburst/treemap with tooltips + table); i18n+a11y in place; Procurement table/map initial; tests pending.
- [x] Procurement table: CSV export, sorting, basic pagination; generic DECP link; per‑row source links (sourceUrl) wired to UI.
- [x] Data cache warmers (PLF mission aggregates, Eurostat COFOG shares). LEGO baseline warmer (MVP+) is implemented separately.
- [ ] Provenance registry table + ingestion pipelines (ODS/DECP/SIRENE joins), semantic layer (dbt) and Postgres/DuckDB backing.
- [ ] Local balance calculators; offsets/guardrails in scenarios; ops/observability.
- [x] Net expenditure rule (simplified) implemented.

Next Sprint (2 weeks) — Top Priorities

1) Explore charts (sunburst/treemap) [MVP] [UI]
   - DONE: Mission/COFOG allocations rendered with tooltips + “show the table”; client‑only via ECharts.

2) Net expenditure rule (simplified) [MVP] [API]
   - DONE: Implemented growth‑of‑net‑primary‑expenditure calculator (env `NET_EXP_REFERENCE_RATE`), emits rule lights per year.

3) i18n baseline + a11y pass [MVP] [UI]
   - DONE: EN/FR message catalog for core labels; visible focus states; axe check runs in CI (home route).

4) Build Page (polish phase 1) [MVP+] [UI]
   - DONE: Grouping by domain, search, beneficiary filter; locked badges & expert mode; expanded scoreboard (baseline totals, total deltas, distance); results drawer (deficit/debt chart + top changes).

5) Explore/Procurement polish [MVP] [UI]
   - DONE: StatCards & SourceLink stars on Explore and Procurement pages; procurement summary cards (total, suppliers, median) and map popups show details with source link; Explore includes 100% stacked shares chart option; ADMIN toggle to exclude RD with tooltip; Click-to-drill: ADMIN→programme (live ODS via sidecar), COFOG→subfunctions where available; lens info tooltip.
  - Acceptance Criteria (AC):
    - [x] ODS client fetches mission-level credits and writes `state_budget_mission_{year}.csv` with CP/AE sums.
    - [x] Warmer retries and falls back to client-side aggregation when server-side `group_by` fails.
    - [x] Persist vintage (extraction timestamp, dataset id/resource id) alongside CSV or in sidecar JSON. Implemented sidecar `data/cache/state_budget_mission_YYYY.meta.json`; tested.
    - [ ] Programme/action level mapping and year-aware joins for COFOG with tests; weights sum to 1 per source code.
      - Added unit test to ensure COFOG weights sum to 1 per mission in `data/cofog_mapping.json`.
    - [x] Procurement ingestion from consolidated DECP, dedup by `id` + `datePublication`, lot→contract rollup, amount quality flags. CLI `python -m services.api.cache_warm decp --year YYYY --csv <path>` writes `data/cache/procurement_contracts_YYYY.csv` + sidecar.
    - [x] INSEE Sirene + BDM clients with token caching and HTTP retries.
    - [x] Join SIRENE attributes (NAF/size) into procurement outputs and expose via API. Best‑effort API enrichment adds `naf`, `companySize` when available (non‑blocking).
    - [x] Macro series reader for GDP; expose BDM series via GraphQL.
    - [x] Add deflators/employment series and provenance entries. CLI warmer `python -m services.api.cache_warm macro-insee --config data/macro_series_config.json` writes `data/cache/macro_series_FR.json` + sidecar; GraphQL `macroSeries(country)` returns warmed JSON. Tests added.
    - [ ] Performance: procurement p95 — consider disabling SIRENE enrichment for bench or pre‑warming company lookups; update docs with measured p95 (tools/bench_api.py).
    - [x] Source registry loads from `data/sources.json` and is exposed via GraphQL `sources()`.

6) Locks/bounds enforcement & validation [MVP+] [API]
   - DONE: Enforce `policy.locked_default`; reject unknown piece targets; enforce optional per‑piece bounds (`bounds_pct`, `bounds_amount_eur`) with descriptive errors. Tests in `services/api/tests/test_guardrails.py`.

7) LEGO Methodology doc [MVP+] [Docs]
   - DONE: `docs/LEGO_METHOD.md` (mapping, beneficiary rules, elasticities, limitations). Linked from README_DEV.
  - Acceptance Criteria (AC):
    - [x] `allocation(year, basis, lens=ADMIN)` returns mission list with amounts and shares.
    - [x] `allocation(lens=COFOG)` returns COFOG list aggregated from mapping.
    - [x] `allocation(lens=BENEFICIARY)` returns HH/ENT/COL from LEGO baseline + beneficiary weights.
    - [x] `procurement(year, region)` supports cpvPrefix/procedureType/min/max filters.
    - [x] `sources()` reads `data/sources.json` and returns registry items.
    - [ ] P95 < 1.5s locally against warmed caches (document measurement).
    - [ ] Error handling and input validation tests.

Future Phases (UI & Trust)

- Phase 2 — Explore & Procurement polish [MVP]
  - StatCards on Explore; stacked shares; refined tooltips; beneficiary lens polish.
  - Procurement: summary cards, better filters, map popups; privacy footnote.

- Phase 3 — Trust & Sharing [MVP+]
  - Source star component across UI; inline methodology links; EU lights explanations.
  - Saved scenarios list & permalinks; OG images for Build scenarios (title + key stats).

- Phase 4 — A11y & Performance [MVP]
  - Skeletons and empty states; increase hit areas; aria‑live for Run results; code‑split charts.

Notes
- Keep `docs/GRAPHQL_CONTRACT.md` as the contract; implement incrementally.
- Warehouse/dbt tracks to follow in subsequent sprints after MVP feature parity.

Appendix — Newcomer Guide

- Quick start
  - Backend: `pip install -r services/api/requirements.txt` then `uvicorn services.api.app:app --reload` → GraphQL at http://127.0.0.1:8000/graphql
  - Front‑end: `cd frontend && npm install && npm run dev` → http://127.0.0.1:3000
  - Docker: `docker compose up --build` to run both.
- Key files
  - Acceptance Criteria (AC):
    - [x] Pieces config `data/lego_pieces.json` with ≥30 spend and ≥15 revenue entries, mapping to COFOG/NA_ITEM.
    - [x] Expenditures: SDMX XML buckets `GOV_10A_EXP` A.MIO_EUR.S13.GF{MAJOR}.{NA_ITEM}.{geo} fetched once per bucket; weights normalize per bucket; sums match total within tolerance.
    - [x] Revenues: `GOV_10A_TAXAG` (taxes/contrib) + `GOV_10A_MAIN` (P.11/P.12) loaded; splits applied from `data/revenue_splits.json`.
    - [x] Interest: proxied from COFOG 01.7 TE; warning recorded in baseline meta.
    - [x] Summary tool prints totals and top 5 pieces; Makefile targets present.
    
  - Product brief: `readme.md` (concept, scope, data contracts)
  - Backlog: `BACKLOG.md` (this file)
  - Purpose: `purpose.md` (why/what/how)
  - GraphQL contract: `docs/GRAPHQL_CONTRACT.md` + `graphql/schema.sdl.graphql`
  - Cache warmers: `services/api/cache_warm.py`
  - API schema/resolvers: `services/api/schema.py`, `services/api/data_loader.py`
  - Front‑end plan: `docs/FRONTEND_PLAN.md`
  - Scenario schema: `schemas/scenario.schema.json`
  - Sample data: `data/` (including `lego_pieces.json` and warmed caches under `data/cache/`)
