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


Inspiration & Visual Design (from SF Gov Graph)

Overview

- Adopt “trust-by-design” cues (source stars on metrics), clear breadcrumbs, and compact stats cards with YoY deltas, inspired by https://sfgov.civlab.org/.
- Keep navigation scannable and consistent: subtle color accents by entity/lens, generous whitespace, legible type.

Visual System

- Colors (CSS variables in `frontend/app/globals.css`):
  - --color-text: #1f2937 (grey-800); --color-text-subtle: #6b7280 (grey-500); --color-border: #e5e7eb (grey-200)
  - Accents: --accent-admin: #6d28d9 (purple-700); --accent-cofog: #2563eb (blue-600)
  - States: --ok: #16a34a; --warn: #f59e0b; --error: #dc2626
  - Background cards: --card-bg: #ffffff; muted: #f9fafb
- Typography (system stack, no runtime webfonts):
  - Headings: 700 weight; H1 28/36, H2 22/30, H3 18/26
  - Body: 16/24; small: 13/18; monospace for code chips
- Spacing scale: 4, 8, 12, 16, 20, 24, 32 px; page gutters 24–32 px
- Cards: 12 px radius, 1 px border `var(--color-border)`, shadow none or subtle on hover; internal padding 16–20 px
- Breadcrumbs: subdued grey text with accent divider; hover state increases opacity
- Tooltips: small, neutral background (#f3f4f6) with subtle border; used by SourceLink (star)

New/Updated Components (design + usage)

- Breadcrumb
  - Purpose: show location and enable quick backtracking (e.g., Home / Explore / 2026)
  - Props: `items: { label: string; href?: string }[]`
  - Visual: inline, small text; current item in strong grey; links underline on hover
- SourceLink
  - Purpose: trust cue linking to provenance (dataset page or upstream source)
  - Props: `url: string`, `label?: string` (aria), `tooltip?: string = "View source"`
  - Visual: 12–14px superscript star “*” next to metric label; hover shows tooltip; opens in new tab
- StatsCard
  - Purpose: headline metrics above views
  - Props: `label: string`, `value: string`, `yoyPct?: number`, `sourceUrl?: string`
  - Visual: label (subtle), value (prominent), optional YoY arrow (↑/↓) colored blue/purple for positive, blue for negative depending on context; star for source
- YoYBadge
  - Purpose: compact % change indicator for rows
  - Props: `pct: number`
  - Visual: tiny arrow + percent, colored by magnitude thresholds (±10%, ±20%)
- Tag/Chip
  - Purpose: clickable taxonomy tag (COFOG, Budget Vert)
  - Props: `label: string`, `href?: string`, `tone?: "admin"|"cofog"|"neutral"`
  - Visual: pill with subtle background, accent border on hover
- Linkify helper
  - Purpose: render code strings (mission/program/COFOG) as internal links to entity pages
  - API: `linkifyCode(kind: 'mission'|'programme'|'cofog', code: string)` → `<Link />`

Explore €1 — Detailed UX

- Header
  - Breadcrumb: Home / Explore / {Year}
  - Controls row: YearPicker, Basis toggle (AE/CP), Lens toggle (ADMIN/COFOG); lens toggle colors header underline by `--accent-admin` or `--accent-cofog`.
- StatsBar (cards)
  - Cards: Total {basis} for year; YoY vs. (year-1); Optional: share of GDP (if available); Data Vintage (e.g., execution/provisional)
  - Each card includes a SourceLink to `sources` item(s)
- Main content
  - For MVP, table with columns: Code (linkified), Label, Amount (localized), Share (%), YoY (YoYBadge)
  - Future: add sunburst/treemap with lens color accents; export and “show table” toggle
- Data fetch
  - Fetch allocation twice: `year` and `year-1`; merge client-side for YoY; keep error/loading states as-is
- Accessibility
  - All controls keyboard reachable, visible focus, 4.5:1 contrast on text

Procurement — Detailed UX

- Header
  - Breadcrumb: Home / Procurement / {Year}
  - Filters: Year, Department (INSEE/FR dept code), CPV prefix, Min amount; “Apply” triggers fetch
- StatsBar (cards)
  - Cards: Total amount (EUR), Supplier count, Median contract size; Source star links to DECP/SIRENE
- Table
  - Columns: Supplier (linkable to SIRENE detail later), SIREN, CPV, Procedure, Amount (localized)
  - “Export CSV” button; footnote explains thresholds for privacy if any
- Map (V1+)
  - Mini map panel using MapLibre; marker clustering by supplier location

Compare EU — Detailed UX

- Header
  - Breadcrumb: Home / Compare EU / {Year}
  - Controls: year input, country multiselect
- Content
  - COFOG share comparison bar chart; table view below; SourceLink to Eurostat dataset

Sources — Detailed UX

- Table-first page listing dataset name, license, cadence, vintage, link
- Each row uses SourceLink and “Open” external link
- Consider filter/search

Entity Pages (New) — Missions/Programmes/COFOGs

- Routes
  - `/explore/mission/[code]`, `/explore/programme/[code]`, `/explore/cofog/[code]`
- Content
  - Header with code, label, breadcrumb; StatsCards (current allocation, YoY); children table (e.g., programme children of mission)
  - Related tags (COFOG, Budget Vert where applicable); Source links

Implementation Plan (Phased)

- Phase 1 (1 week)
  - Add UI components: Breadcrumb, SourceLink, StatsCard, YoYBadge, Tag
  - Wire Breadcrumb into layout and pages; add SourceLink to page headers and tables
  - Explore: dual fetch (`year` and `year-1`) and YoY column
- Phase 2 (1 week)
  - Explore StatsBar with Total/YoY; lens accent styling; linkify codes
  - Procurement StatsBar; add CSV export on table
- Phase 3 (1–2 weeks)
  - Entity pages for mission/programme/COFOG (basic tables)
  - Topics/Tags pivot (clickable chips → filtered Explore)
- Phase 4 (V1+)
  - Compare EU chart (COFOG shares), Map on Procurement, improved exports

Acceptance Criteria

- Breadcrumb visible and correct on Explore, Procurement, Compare EU, Sources
- Source star appears alongside key labels and opens source link in new tab with tooltip
- Explore table shows YoY column with correct deltas; StatsCards render totals and YoY with correct number formatting
- Linkified codes navigate to corresponding entity pages
- Colors and typography match the defined tokens and sizes; passes basic a11y contrast checks

Tech Notes

- Keep components headless/simple; styling via globals.css + small utility classes
- Consider colocating page-level copies of Source metadata where GraphQL doesn’t yet provide direct source URLs
- Maintain SSR/CSR balance: current pages remain client components; entity pages can be server components if queries stabilize
