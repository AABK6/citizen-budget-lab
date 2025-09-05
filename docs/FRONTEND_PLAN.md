Frontend Plan — Citizen Budget Lab

Scope

- Implement the fused Playground ↔ Workshop UX: Explore €1 (ADMIN/COFOG), Procurement map, Budget Playground with Budget Dials, Policy Workshop with Reform Families/Levers, Compare & Remix, Challenges, Sources; plus V1 “My household” and Classroom mode.

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

- `/` Home: navigation + 10‑sec onboarding (two equal CTAs: Start with Budget · Start with Policy) and a quick explainer; carousel with weekly Challenges and trending public scenarios.
- `/explore` Explore €1: lens toggle (ADMIN/COFOG), basis (CP/AE), year slider, sunburst/treemap, outcomes panel, export, source links.
- `/procurement` Who gets paid?: map + table, filters (sector/size/geo), competition flags, export.
- `/build` Budget Playground & Policy Workshop: two‑column command center with a cockpit HUD. Left = Controls (Spending vs Revenue twin columns, grouped lists, inline configurators); Right = Canvas (TwinBars, Waterfall) + slim Scoreboard and expandable Results Tray (Accounting, Debt path, Macro fan, Distribution, Workshop, DSL, Save). Scenario state persists to URL. See detailed spec in `docs/BUILD_PAGE_SPEC.md`.
- `/compare-eu` Compare EU: country selector, COFOG shares, deficit/debt ratios (Eurostat-backed), export.
- `/sources` Sources: dataset registry with license/vintage/cadence links and search.
- V1: `/my-household` OpenFisca view (static synthetic grid first, optional local input).

Data Contracts & Codegen

- Use canonical SDL at `graphql/schema.sdl.graphql`.
- Place documents in `graphql/queries/` and `graphql/mutations/`; generate TS hooks via `graphql/codegen.yml`.
- Adopt generated hooks in the UI after API stabilizes; keep `graphqlFetch` for initial wiring.

API behavior with dbt semantic layer

- When the dbt semantic layer (DuckDB/Postgres) is present, the API prefers dbt views for ADMIN allocation and Procurement. If not present, it falls back to warmed CSV caches/samples. COFOG S13 still uses warmed Eurostat shares scaled by the warmed baseline.

Components (selected)

- Explore: `Sunburst`, `Treemap`, `LensToggle`, `YearSlider`, `BasisToggle`, `OutcomePanel`, `ExportButton`.
- Procurement: `ProcurementMap`, `SupplierTable`, `FiltersPanel`, `ExportButton`.
- Playground & Workshop (two‑column command center + HUD):
  - Cockpit HUD (sticky): `BudgetHUD` (ΔExp/ΔRev, Net Δ, Resolution bar, EU rule lights, Run/Reset, keyboard hints); future: debt sparkline, %GDP badge, Undo/Redo.
  - Left (Controls): `PiecesPanel` split into twin lists — `SpendingList` (grouped by COFOG with collapsible headers) and `RevenueList` (flat list). Each row: label, amount, pin, delta slider, target input, micro progress bar, Explain button. Sticky `SearchBox` and filters (Adjusted‑only). `PinnedRow` above lists for quick Δ/Target edits. `PinnedLevers` inline configurators render params + mass select + Apply as Target/Change.
  - Right (Canvas + Scoreboard): `TwinBars` (baseline vs scenario; pending stripes), optional `WaterfallDelta`. Slim `ScoreStrip` mirrors HUD basics and stays sticky. `ResultsTray` expands to show `DeficitPathChart`, `MacroFan`, `DistributionChart`, `PolicyWorkshop`, `DslPanel`, `SaveBlock`.
  - Explain Overlay (progressive disclosure): `ExplainOverlay` focused on one piece or mass; background dims; shows description, assumptions, links, and quick actions.
  - Editors/utilities: `TargetPicker`, `TaxParamEditor`, `AmountSlider`, `OffsetsEditor`, `DslDrawer`.
- Shared: `Layout`, `LangSwitcher`, `SourceLink`, `ErrorBoundary`, `Loading`, `GlobalControls` (FR/EN, color‑blind, Show table, Share/Remix, Assumptions), `BudgetHUD` (bottom: balance €/ %GDP, debt sparkline with fan, EU lights, real/nominal, year, undo/redo, reset).

Scenario UX Details

- Onboarding: single panel, 10 seconds; two equal CTAs (Start with Budget · Start with Policy). Micro note: “You can switch anytime; both views are synced.”
- Targets: mass selection lifts with a **BudgetDial** (dial + slider + numeric input). Pending stripes appear on unresolved masses; Δ chips collect under Spending/Revenue.
- Workshop: hierarchical families → levers; **ProgressToTarget** shows € specified vs target; presets (fast savings, protect readiness, cut projects) fill mixes.
- Lens: **LensSwitch** recolors stacks to Reform Families or Named Reforms; ribbons show cross‑mass painting.
- Offsets: rule selection (share across pools, exclude list), cap levels; visual summary.
- Validation: inline messages mapped from API schema errors; `ConflictNudge` highlights overlaps/double counting and links to affected controls.
- Share: serialize scenario id to URL; resolve from server on load; stamped **Share Card** includes methods/version and “Specified X%” watermark if partial.
- Compare & Remix: side‑by‑side twin bars + Δ waterfall; “Duplicate & Edit” unlocks levers; lineage tag persists.
- Challenge Mode: preset DSLs with success conditions (e.g., “Resolution ≥80%” and balance target); scoreboard UI hooks.
- Classroom: teacher opens a Room; students join; live leaderboard (Balance, Equity, Compliance, Resolution); auto‑debrief slides.

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

Micro‑interactions & states

- Loading: skeletons for bars/treemap and tables; values snap in when ready.
- Optimistic edits: slider drags update twin bars immediately with precise settle‑back.
- Pending state: diagonal animated stripes on unresolved masses; stripe speed slows as specification increases.
- Mix sliders: when splitting a target across paths, sliders snap to nice ratios (50/30/20) but accept exact numbers.
- Empty states: coaching card on new scenario; neutral message + nearest available year when data missing.
- Toasts: short, neutral confirmations (e.g., “You set a save of €6B. Choose how to get there.”) with click‑through to the Workshop.
- Micro‑celebrations: meet target → subtle confetti; disabled in a11y mode.

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
  - RuleLights uses the `--ok`/`--warn`/`--error` tokens consistently across the app.
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
 - Action: Remix this slice in Builder (pre‑selects the slice on the canvas)

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
  - Clicking a region filters the table; show a small bar of top‑5 local recipients
- Action
  - Add this programme to Builder (seeds the canvas with the selected slice)

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

Implementation Plan — Build Page (Polished)

Phase A (Scaffold & Data Wiring)
  - Add `/build` page with twin lists (Spending/Revenue). Wire GraphQL for `legoPieces`, `legoBaseline`, `policyLevers`.
  - Serialize DSL (mass + piece + lever IDs); `runScenario`; display HUD + ScoreStrip with Resolution/EU.
  - Permalink sync (`?dsl=<base64>`) and robust restore using YAML/YAML‑lite parser.

- Phase B (Workshop & Resolution)
  - Dynamic lever parameter forms from `paramsSchema`; heuristics to derive Δ€.
  - Apply lever as Target or Change on selected Mass; conflict nudge on runScenario errors.
  - Global Resolution meter and per‑mass progress; striped pending overlay on TwinBars.

Phase C (HUD & Consequences)
  - Cockpit HUD (ΔExp/ΔRev, Net Δ, EU lights, resolution bar, shortcuts). Add debt sparkline and %GDP badge.
  - Slim ScoreStrip under Canvas; ResultsTray with Debt path, Macro, Distribution. Lazy‑load heavy charts.

Phase D (UX Polish & A11y)
  - Keyboard flows for sliders, list navigation, Explain overlay, ResultsTray; ARIA roles for progress/alerts/dialog.
  - Focus management on overlay open/close; trap focus; Esc to close; Restore focus to invoker.
  - i18n labels; Axe checks in CI; color‑blind safe palettes; reduced‑motion support.

- Phase E (Share & Compare)
  - Save scenario (title/description); OG image preview hook; Compare & Remix entrypoint.

Milestone AC tie‑in: See `docs/BUILD_PAGE_SPEC.md` for detailed ACs and `docs/PLAYGROUND_WORKSHOP_PLAN.md` for the complete dual‑path plan, backlog, and storyboard.

See also: `docs/PLAYGROUND_WORKSHOP_PLAN.md` — Budget Playground ↔ Policy Workshop Plan (Detailed)

Playground Design Options (for future iteration)

- Option A — LEGO Desk (blocks on a table)
  - Metaphor: colored blocks represent current masses; you snap blocks out/in to decrease/increase relative to the baseline (not from scratch).
  - Interaction: drag left/right to shrink/grow; pending stripes animate; levers as tool cards dragged onto masses.
  - Why it fits: we operate on the current baseline; the “desk” is your existing budget, and blocks reflect deltas around it.

- Option B — Coin Sandbox (tokens and jars)
  - Metaphor: drop 10M€/100M€ “coins” into labeled jars (masses) or remove them; ring shows target vs specified.
  - Playful on mobile; long‑press opens lever suggestions; great for challenges/remix.

- Option C — Story Cards (targets and reforms as cards)
  - Metaphor: play target cards (Δ€) and reform cards (with params) into lanes; timeline snaps for recurring vs one‑off.
  - Extremely narrative; screenshot‑friendly for social sharing.

Note: We start with Option D (Workshop + Meter) to ship quickly. Options A/B/C are candidates for the “Playground” surface, later gated behind a simple toggle and fed by the same scenario DSL/state.

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
- Playground: mass dial sets a target; Δ chip appears; mass gets pending stripes; **ResolutionMeter** updates overall %.
- Workshop: at least two levers specify part of a mass goal; **ProgressToTarget** updates; **ConflictNudge** appears on overlaps.
- LensSwitch: toggling Mass/Family/Named preserves totals and highlights ribbons across masses.
- ShareCard: exported image shows methods/version and “Specified X%” watermark when partial.
- Linkified codes navigate to corresponding entity pages
- Colors and typography match the defined tokens and sizes; passes basic a11y contrast checks

Tech Notes

- Keep components headless/simple; styling via globals.css + small utility classes
- Consider colocating page-level copies of Source metadata where GraphQL doesn’t yet provide direct source URLs
- Maintain SSR/CSR balance: current pages remain client components; entity pages can be server components if queries stabilize
Build — Visual & Interaction Heuristics

- Information hierarchy: cockpit HUD for instant state; controls on the left for action; canvas on the right for feedback; tray for deeper analysis.
- Density and scannability: 44px min tap targets; compact rows with secondary info in subdued color; sticky group headers and search afford quick scanning.
- Progressive disclosure: Keep heavy analytics in the tray; keep configurators inline; elevate Explain overlay only when needed.
- Micro‑interactions: animate bar widths on changes; use subtle pending stripes; optimistic UI for sliders; toast on save/run; loading skeletons.
- Keyboard: arrow keys on focused sliders; +/- adjust; Cmd/Ctrl+Z/Y (undo/redo, future); F to pin/unpin; / to focus search; Esc to dismiss overlays.
  - Implemented: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo), / focuses search, '+'/'-' adjust focused delta, 'f' pins/unpins focused piece. Next: Esc to close overlays, move focus to group headers.
- Accessibility: list semantics; aria‑expanded on groups; aria‑valuenow/min/max on sliders; live regions for resolution updates.
- Responsiveness: stack columns under Canvas on small screens; HUD and ScoreStrip remain sticky; tray becomes a full‑width drawer.
