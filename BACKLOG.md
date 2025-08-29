Citizen Budget Lab â€” Backlog (MVP â†’ V1 â†’ V2)

Purpose

- Single source of truth for scope, broken into epics and issues that align with readme.md. Use labels [MVP], [V1], [V2], [Tech], [Data], [API], [UI], [Ops], [Docs], [QA].

Delivery Milestones

- MVP (8â€“12 weeks): Explorer, procurement, scenarios (mechanical), EU lights, macro-lite.
- V1 (12â€“20 weeks): Distributional (OpenFisca), EU compare, classroom mode.
- V2 (20â€“32 weeks): Macro priors + uncertainty, local finance module + constraints.

Epic: Data Ingestion & Provenance [MVP] [Data]

- Issue: Central budget ingestion via ODS (PLF/LFI/PLR)
  - AC: Incremental pulls, dedup, per-year vintage; mission/programme/action fields with AE/CP and execution where available.
- Issue: COFOG mapping (programme/action, year-aware)
  - AC: Weighted mappings sum to 1.0 per source code; schema + tests; fallback for unknowns.
- Issue: Procurement (DECP) pipeline
  - AC: Ingest consolidated datasets; dedup by id+publication; lotâ†’contract aggregation; amount quality flags.
- Issue: SIRENE join
  - AC: Supplier normalization by SIREN/SIRET; NAF/size fields; cache and rate limiting.
- Issue: Macro series (INSEE BDM)
  - AC: GDP, deflators, employment; provenance recorded.
- Issue: Source registry
  - AC: Table `Source(id, dataset, url, license, cadence, vintage, checksum)` populated per ingestion.

Epic: Semantic Layer (dbt + DuckDB/Postgres) [MVP] [Data]

- Issue: Adminâ†”COFOG aggregates
  - AC: Models for mission/program/action and COFOG rollups; tested totals.
- Issue: Procurement semantic views
  - AC: Contract-level, supplier rollups by geo/sector/size; competition flag derivations.
- Issue: APU subsector tagging
  - AC: Central/local/social tagging for reporting.

Epic: GraphQL API (Explorer & Procurement) [MVP] [API]

- Issue: Swap CSV readers to semantic views
  - AC: `allocation(year, basis, lens)` reads warehouse; P95 <1.5s.
- Issue: Procurement queries
  - AC: `procurement(year, region)` returns top suppliers with filters; export fields.
- Issue: Sources endpoint
  - AC: `sources()` lists datasets with vintages/links.

Epic: Scenario DSL & Engine (Mechanical) [MVP] [API]

- Issue: DSL schema finalize
  - AC: Offsets (`share_across`, `cap`), guardrails, better messages.
- Issue: Resolver & guardrails
  - AC: Targetâ†’ids with year-awareness; deterministic scenario ids.
- Issue: Offsets application
  - AC: Distribute reductions across pools (with exclusions), caps priority.
- Issue: Accounting arithmetic
  - AC: AE/CP rules, rolling recurring changes; baseline merge.

Epic: Compliance Checks [MVP] [API]

- Issue: EU 3% and 60%
  - AC: Correct sign conventions; path over horizon; explainable flags.
- Issue: Net expenditure rule (simplified)
  - AC: Compute growth of net primary expenditure adjusted; country reference rate input.

Epic: Macro Kernel (Lite) [MVP] [API]

- Issue: IRF store and convolution
  - AC: Single prior set; Î”GDP/Î”employment/Î”deficit; documented parameters.
- Issue: Integrate macro deltas with accounting
  - AC: Automatic stabilizers applied to deficit path.

Epic: Front-end â€” Full Scope (Next.js) [MVP] [UI]

- Issue: Core shell & navigation
  - AC: Top tabs (Explore â‚¬1 â€¢ Who gets paid? â€¢ Whatâ€‘if? â€¢ Compare EU â€¢ Sources), EN/FR toggle, keyboard-friendly nav.
- Issue: Explore â‚¬1 â€” Administrative lens
  - AC: Sunburst/treemap by mission/program/action; basis toggle (CP/AE/execution); time slider with vintage badges; â€œshow the tableâ€; export PNG/SVG/PDF.
- Issue: Explore â‚¬1 â€” COFOG lens (parallel view)
  - AC: Switch to COFOG view with consistent colors; cross-highlight between lenses; tooltips with code/label/source link.
- Issue: Outcome indicators panel (PAP/RAP)
  - AC: Side panel listing selected programme indicators and latest execution/targets with sourcing.
- Issue: Procurement â€” Map view
  - AC: MapLibre/Leaflet map with clustering; filters (sector/NAF or CPV, firm size, geography); top counterparties by selected area; competition flags; export.
- Issue: Procurement â€” Table view
  - AC: Sortable table; CSV export; source links per row; pagination.
- Issue: Whatâ€‘if â€” Scenario builder
  - AC: Target pickers (searchable mission/program/action & tax params), sliders/inputs for amounts and recurrence, offsets UI (share_across/cap), validation messages, DSL drawer copy.
- Issue: Whatâ€‘if â€” Results cards
  - AC: Accounting (deficit/debt), EU lights, Macro (charts), Distribution placeholder; assumptions & sources drawer; permalink share.
- Issue: Sources page
  - AC: Dataset catalog with provenance (license, vintage, cadence), search/filter, direct links.
- Issue: Accessibility & trust
  - AC: WCAG 2.1 AA checks, color-blind palettes, all charts have a "show the table" option, plain-language tooltips.
- Issue: Internationalization
  - AC: Full FR/EN translations; RTL-ready styles baseline; locale routing.
- Issue: State & performance
  - AC: Scenario state machine (XState/Zustand), URL sync (permalinks), Suspense-friendly data layer, code-splitting; P95 < 1.5s for explorer queries.
- Issue: Testing & quality
  - AC: Unit tests (components), e2e (Playwright/Cypress) for core flows; a11y tests (axe) in CI.

Epic: Quality, Ops, Security [MVP] [Ops] [QA]

- Issue: Tests & QA
  - AC: Unit tests (mappings, calculators), GraphQL snapshots; Great Expectations on ingest.
- Issue: Caching & rate limiting
  - AC: HTTP cache for official APIs; semantic query cache; simple rate limits.
- Issue: Observability
  - AC: Structured logs + tracing spans; health checks.
- Issue: Docker & CI
  - AC: Dockerfiles; CI for lint/test/build; secrets via env.

Epic: Distributional (OpenFisca) [V1] [API]

- Issue: Host OpenFisca & wrapper service
  - AC: Batch calls; cache; timeouts.
- Issue: Policy deltas translation
  - AC: Map DSL actions â†’ OpenFisca parameters; tests.
- Issue: GraphQL outputs
  - AC: Deciles/households/regions; assumptions metadata.
- Issue: UI integration
  - AC: Decile charts; assumptions drawer; export.

Epic: EU Comparisons [V1] [API]

- Issue: Eurostat COFOG & deficit/debt
  - AC: Compare France vs peers; GraphQL queries; UI.
- Issue: Front-end â€” Compare EU page [V1] [UI]
  - AC: Country selector (min peer set), COFOG shares chart and deficit/debt ratios over time; export; sourcing notes.

Epic: Macro Priors & Uncertainty [V2] [API]

- Issue: Multiple prior families & fan charts
  - AC: IRF low/base/high; fan charts; toggle.

Epic: Local Finance Module [V2] [Data] [API]

- Issue: Ingest DGFiP/OFGL balances
  - AC: Harmonize frames; provenance.
- Issue: Local constraints
  - AC: Ã‰quilibre rÃ©el validation; scenario enforcement.
- Issue: UI
  - AC: Local entity views; rule feedback in scenarios.

Epic: Classroom Mode [V1] [UI]

- Issue: Guided scenarios & handouts
  - AC: Teacher mode with preset exercises, student view with step-by-step prompts, printable PDFs.


Tracking & Ownership

- Assign owners per epic: Product, Tech Lead, Data Eng, Backend, Front-end, Economist.
- Use labels above; prefix titles with milestone ([MVP], [V1], [V2]).

Status Snapshot (MVP) — 2025-08-29

- [x] GraphQL API skeleton with allocation, procurement, sources; official API wrappers (INSEE/Eurostat/ODS/data.gouv/geo) with HTTP caching.
- [x] Scenario DSL validation + mechanical engine; macro kernel (lite) integrated; compliance lights (EU 3%/60%) minimal.
- [x] Deterministic scenario IDs in runScenario (hash of canonical DSL) with tests.
- [x] Dockerfiles + CI baseline; docker-compose with Windows override to run API+frontend together.
- [~] Frontend scaffold (Explore/Procurement/What‑if/Compare EU/Sources) wired to API; charts/maps/i18n/tests pending.
- [~] Procurement table CSV export implemented; sorting/pagination/source links pending.
- [~] Data cache warmers (PLF mission aggregates, Eurostat COFOG shares). No warehouse/dbt yet.
- [ ] Provenance registry table + ingestion pipelines (ODS/DECP/SIRENE joins), semantic layer (dbt) and Postgres/DuckDB backing.
- [ ] Net expenditure and local balance calculators; offsets/guardrails in scenarios; ops/observability.
- [~] Net expenditure rule (simplified) implemented; local balance calculators pending; offsets/guardrails; ops/observability.

Next Sprint (2 weeks) — Top Priorities

1) Explore charts (sunburst/treemap) [MVP] [UI]
   - AC: Render mission/COFOG allocations with basic tooltips + “show table”; reuse API; client-only acceptable for MVP.

2) Net expenditure rule (simplified) [MVP] [API]
   - DONE: Implemented growth-of-net-primary-expenditure calculator (env `NET_EXP_REFERENCE_RATE`), emits rule lights per year.

3) i18n baseline + a11y pass [MVP] [UI]
   - DONE: EN/FR message catalog for core labels; visible focus states; axe check runs in CI (home route).

Notes
- Keep `docs/GRAPHQL_CONTRACT.md` as contract; implement incrementally.
- Warehouse/dbt tracks to follow in subsequent sprints after MVP feature parity.

