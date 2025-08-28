Frontend Plan — Citizen Budget Lab

Scope

- Implement the full UX described in readme.md: Explore €1 (admin/COFOG), Procurement map, What‑if scenario builder, Compare EU, Sources; plus V1 “My household” and Classroom mode.

Tech Stack

- Framework: Next.js 14 (App Router optional later), React 18.
- Data: GraphQL over HTTP; Apollo Client or URQL (start minimal fetch + codegen, then adopt client as needed).
- Charts: ECharts or Recharts (sunburst/treemap; time series); lightweight tables (TanStack Table) with CSV export.
- Maps: MapLibre GL JS or Leaflet + OpenMapTiles; clustering for procurement.
- State: XState (scenario state machine) + URL sync; or Zustand for lightweight state.
- i18n: next-intl (FR/EN); message catalogs in JSON; ICU formatting.
- Styling: CSS Modules or Tailwind (accessibility-friendly tokens); color-blind palettes.
- Testing: React Testing Library + Playwright; axe-core for a11y.

Routing & Pages

- `/` Home: navigation + quick explainer.
- `/explore` Explore €1: lens toggle (ADMIN/COFOG), basis (CP/AE), year slider, sunburst/treemap, outcomes panel, export, source links.
- `/procurement` Who gets paid?: map + table, filters (sector/size/geo), competition flags, export.
- `/what-if` Scenario Builder: target pickers, sliders/inputs, offsets UI, DSL drawer, results cards (Accounting, EU lights, Macro, Distribution placeholder), share.
- `/compare-eu` Compare EU: country selector, COFOG shares, deficit/debt ratios (Eurostat-backed), export.
- `/sources` Sources: dataset registry with license/vintage/cadence links and search.
- V1: `/my-household` OpenFisca view (static synthetic grid first, optional local input).

Data Contracts & Codegen

- Use canonical SDL at `graphql/schema.sdl.graphql`.
- Place documents in `graphql/queries/` and `graphql/mutations/`; generate TS hooks via `graphql/codegen.yml`.
- Adopt generated hooks in the UI after API stabilizes; keep `graphqlFetch` for initial wiring.

Components (selected)

- Explore: `Sunburst`, `Treemap`, `LensToggle`, `YearSlider`, `BasisToggle`, `OutcomePanel`, `ExportButton`.
- Procurement: `ProcurementMap`, `SupplierTable`, `FiltersPanel`, `ExportButton`.
- What‑if: `TargetPicker`, `TaxParamEditor`, `AmountSlider`, `OffsetsEditor`, `DslDrawer`, `ResultsCards` (AccountingChart, RuleLights, MacroChart, DistributionChart), `ShareLink`.
- Shared: `Layout`, `LangSwitcher`, `SourceLink`, `ErrorBoundary`, `Loading`.

Scenario UX Details

- Targets: searchable dropdowns for mission/program/action; tax parameters grouped (IR brackets, thresholds).
- Offsets: rule selection (share across pools, exclude list), cap levels; visual summary.
- Validation: inline messages mapped from API schema errors.
- Share: serialize scenario id to URL; resolve from server on load.

Accessibility & i18n

- Keyboard navigation for all interactive elements; focus styles; aria-labels.
- Color palettes tested for common CVD; high-contrast mode.
- FR/EN parity; pluggable locales.

Performance

- P95 < 1.5s for explorer/queries; code-splitting per page; memoized charts; graph cache for repeated queries.

Testing

- Unit: components render + simple interactions.
- e2e: core flows (run scenario, switch lenses, filters on procurement).
- a11y: axe checks; CI fails on critical issues.

Timeline & Dependencies

- Weeks 0–2: Skeleton, Explore (ADMIN), Sources; codegen plumbing.
- Weeks 2–4: COFOG lens + outcomes; Procurement map + table.
- Weeks 4–6: What‑if builder, results cards, share; i18n + a11y pass.
- Weeks 6–8: Polish, exports, tests → MVP.
- V1: My household + Compare EU + Classroom mode.

