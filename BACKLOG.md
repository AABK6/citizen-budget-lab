Citizen Budget Lab — Backlog (MVP → MVP+ → V1 → V2)

Purpose

- Single source of truth for scope, grouped by milestones. Each epic links to concrete acceptance criteria (AC) and maps to the product brief in readme.md. Use labels [MVP], [MVP+], [V1], [V2], [Tech], [Data], [API], [UI], [Ops], [Docs], [QA].

Roadmap Overview

- MVP (8–12 weeks): Explorer, procurement, mechanical scenarios, EU lights, macro‑lite.
- MVP+ (4–8 weeks after MVP): LEGO Budget Builder (public‑facing expenditure/revenue pieces), beneficiary lens, permalinks/exports.
- V1 (12–20 weeks): Distributional (OpenFisca), EU compare, classroom mode.
- V2 (20–32 weeks): Macro priors + uncertainty, local finance module + constraints.

Milestone: MVP

Product outcomes
- Explore €1 with ADMIN/COFOG lenses and sources; Procurement (table+map); run simple scenarios; show EU rule lights; macro‑lite deltas.

Epics
- Data Ingestion & Provenance [Data]
  - Central budget via ODS (PLF/LFI/PLR): incremental pulls, dedupe, per‑year vintage; mission/program/action; AE/CP/execution when available.
  - COFOG mapping (programme/action, year‑aware): weights sum to 1.0; schema+tests; fallback for unknowns.
  - Procurement (DECP) pipeline: ingest consolidated; dedup id+publication; lot→contract; amount quality flags.
  - SIRENE join: normalize SIREN/SIRET; NAF/size; cache + rate limiting.
  - Macro series (INSEE BDM): GDP/deflators/employment; provenance.
  - Source registry: `Source(id, dataset, url, license, cadence, vintage, checksum)`.
- Semantic Layer (dbt + DuckDB/Postgres) [Data]
  - Admin↔COFOG aggregates; procurement semantic views; APU subsector tagging.
- GraphQL API (Explorer & Procurement) [API]
  - `allocation(year, basis, lens)` from warehouse; P95 < 1.5s.
  - `procurement(year, region)` with filters; export fields.
  - `sources()` lists datasets w/ vintages/links.
- Scenario DSL & Engine (Mechanical) [API]
  - DSL schema finalize; resolver & guardrails (target→ids, year aware); offsets; AE/CP arithmetic.
- Compliance Checks [API]
  - EU 3%/60% flags; Net expenditure rule (simplified, env reference rate).
- Macro Kernel (Lite) [API]
  - IRF store + convolution (ΔGDP/Δemployment/Δdeficit); apply stabilizers.
- Front‑end — Full Scope (Next.js) [UI]
  - Shell & nav; Explore ADMIN/COFOG; outcome panel; Procurement map/table; What‑if builder + results cards; Sources page; a11y+i18n; performance; tests.
- Quality, Ops, Security [Ops][QA]
  - Tests & QA; caching & rate limiting; observability; Docker & CI.

Milestone: MVP+

Product outcomes
- “Build your budget” with intuitive pieces (expenditure/revenue), beneficiary lens, live balance/deficit/debt/EU lights, distance‑to‑current, shareable scenarios.

Epics
- LEGO Budget Builder — Data & Config [Data]
  - Define pieces (config): `data/lego_pieces.json` v0 (≥30 spend, ≥15 revenue) with public‑friendly labels, examples, precise COFOG/ESA mapping, implied beneficiaries, bounds/locks, revenue elasticities, sources.
  - LEGO baseline warmer (S13): `python -m services.api.cache_warm lego --year 2026` writes `data/cache/lego_baseline_YYYY.json` — v0 covers expenditures (amounts/shares per expenditure piece, total expenditures) + GDP and metadata; v0.1 adds revenue baselines. Consistency: sum of pieces = APU S13 totals (tolerance < 0.1%).
- LEGO Budget Builder — GraphQL API [API]
  - SDL: `Scope`, `LegoPiece`, `LegoBaseline`, `Distance`; queries `legoPieces`, `legoBaseline`, `legoDistance`.
  - Resolvers & loaders: read `lego_pieces.json` and warmed baseline; graceful fallbacks.
  - Allocation lens: `BENEFICIARY` returns households/enterprises/collective; implemented via LEGO baseline + beneficiary weights; tests added.
  - DSL extension: targets `piece.<id>`; `delta_pct|amount_eur`; `recurring`; readable validation.
- LEGO Budget Builder — Calculation Engine [API]
  - Apply deltas on pieces → (COFOG×na_item | ESA revenue) vectors; update mechanical deficit/debt; enforce locks/bounds.
  - Static v0 elasticities for revenue (VAT/PIT/CIT/excises/CSG/contributions) with guardrails + docs.
  - Distance‑to‑budget metric (L1 share delta + cosine similarity) exposed via `legoDistance`.
- LEGO Budget Builder — Front‑end [UI]
  - “Build” page: two columns (Expenditures/Revenues), cards (what it funds / who pays, current share, source), search & beneficiary filters, sliders ±% and EUR input; reset.
  - Scoreboard & comparator: balance, debt, EU lights, distance; stacked bars “Your budget vs current”; scale tooltips.
  - Modes & sharing: “From scratch” and “From current”; permalinks (DSL hash) and image export with sources.
  - Accessibility & i18n: full FR/EN, keyboard, contrast; “show the table”.
- LEGO Budget Builder — Documentation [Docs]
  - `docs/LEGO_METHOD.md`: sources, mapping, beneficiary rules, elasticities (v0), limitations, versioning; audit tables.

Milestone: V1

Product outcomes
- Add distributional analysis (OpenFisca), full EU comparisons, and classroom mode.

Epics
- Distributional (OpenFisca) [API]
  - Host OpenFisca + wrapper; translate DSL to parameters; GraphQL outputs (deciles/households/regions); UI charts.
- EU Comparisons [API][UI]
  - Eurostat COFOG & deficit/debt comparisons; Front‑end Compare EU page (selector, charts, export, sourcing notes).
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

Status Snapshot (MVP) — 2025‑08‑29

- [x] GraphQL API skeleton with allocation, procurement, sources; official API wrappers (INSEE/Eurostat/ODS/data.gouv/geo) with HTTP caching.
- [x] Scenario DSL validation + mechanical engine; macro kernel (lite) integrated; compliance lights (EU 3%/60%) minimal.
- [x] Deterministic scenario IDs in runScenario (hash of canonical DSL) with tests.
- [x] Dockerfiles + CI baseline; docker‑compose with Windows override to run API+frontend together.
- [~] Frontend: Explore charts added (sunburst/treemap with tooltips + table); i18n+a11y in place; Procurement table/map initial; tests pending.
- [x] Procurement table: CSV export, sorting, basic pagination; generic DECP link; per‑row source links (sourceUrl) wired to UI.
- [~] Data cache warmers (PLF mission aggregates, Eurostat COFOG shares). No warehouse/dbt yet.
- [ ] Provenance registry table + ingestion pipelines (ODS/DECP/SIRENE joins), semantic layer (dbt) and Postgres/DuckDB backing.
- [ ] Net expenditure and local balance calculators; offsets/guardrails in scenarios; ops/observability.
- [~] Net expenditure rule (simplified) implemented; local balance calculators pending; offsets/guardrails; ops/observability.

Next Sprint (2 weeks) — Top Priorities

1) Explore charts (sunburst/treemap) [MVP] [UI]
   - DONE: Mission/COFOG allocations rendered with tooltips + “show the table”; client‑only via ECharts.

2) Net expenditure rule (simplified) [MVP] [API]
   - DONE: Implemented growth‑of‑net‑primary‑expenditure calculator (env `NET_EXP_REFERENCE_RATE`), emits rule lights per year.

3) i18n baseline + a11y pass [MVP] [UI]
   - DONE: EN/FR message catalog for core labels; visible focus states; axe check runs in CI (home route).

4) Build Page (skeleton) [MVP+] [UI]
   - DONE: Palette (expenditures/revenues), sliders (±% per piece), DSL builder in memory, scoreboard (deficitPath/EU lights), permalink via URL hash; Nav entry added.

5) LEGO Revenue Baseline v0.1 [MVP+] [Data]
   - TODO: Extend warmer to compute revenue baselines from ESA categories; reconcile with S13 totals.

6) Revenue piece handling + elasticities [MVP+] [API]
   - TODO: Support revenue `piece.*` with elasticities and bounds; adjust accounting signs; tests.

7) Locks/bounds enforcement & validation [MVP+] [API]
   - TODO: Respect `policy.locked_default` and per‑piece bounds; user‑friendly errors.

8) LEGO Methodology doc [MVP+] [Docs]
   - TODO: Write `docs/LEGO_METHOD.md` (mapping, beneficiary rules, elasticities, limitations) and link from README_DEV.

Notes
- Keep `docs/GRAPHQL_CONTRACT.md` as the contract; implement incrementally.
- Warehouse/dbt tracks to follow in subsequent sprints after MVP feature parity.

Appendix — Newcomer Guide

- Quick start
  - Backend: `pip install -r services/api/requirements.txt` then `uvicorn services.api.app:app --reload` → GraphQL at http://127.0.0.1:8000/graphql
  - Front‑end: `cd frontend && npm install && npm run dev` → http://127.0.0.1:3000
  - Docker: `docker compose up --build` to run both.
- Key files
  - Product brief: `readme.md` (concept, scope, data contracts)
  - Backlog: `BACKLOG.md` (this file)
  - Purpose: `purpose.md` (why/what/how)
  - GraphQL contract: `docs/GRAPHQL_CONTRACT.md` + `graphql/schema.sdl.graphql`
  - Cache warmers: `services/api/cache_warm.py`
  - API schema/resolvers: `services/api/schema.py`, `services/api/data_loader.py`
  - Front‑end plan: `docs/FRONTEND_PLAN.md`
  - Scenario schema: `schemas/scenario.schema.json`
  - Sample data: `data/` (including `lego_pieces.json` and warmed caches under `data/cache/`)
