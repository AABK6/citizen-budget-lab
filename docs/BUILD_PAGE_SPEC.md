Build Page — Playground & Workshop (Polished UX Spec)

Overview

The Build page fuses two entry points into one coherent, playful, and rigorous experience:

- Budget Playground: Adjust mass and piece dials; see instant consequences on balance, debt, macro, and EU rule lights.
- Policy Workshop: Pick named reforms (levers) grouped by families; specify goals (targets) and the concrete measures (changes) that explain them.

Core Concepts

- Mass: A COFOG major (01..10). Masses aggregate multiple LEGO pieces; controls accept Δ€ (target/change).
- Piece: A granular LEGO item (expenditure or revenue). Controls accept Δ% or Δ€ (depending on type and policy).
- Target vs Change:
  - Target (role: target): contributes to resolution but does not alter accounting/macro.
  - Change: alters accounting/macro and contributes to “specified” in resolution.
- Resolution Meter: overallPct = |specified| / |target|; per mass progress bars show specified vs target; pending = target − specified.
- Levers: Named reforms organized by family; each has a fixed, pre-estimated budgetary impact. Conflicts are detected server‑side.

User Journeys

1) Budget‑first
   - User sets Mass targets (e.g., Defense −€6B; Education +€1B) and a few Piece changes.
   - Resolution shows large “Pending” zones; user opens Workshop to add levers to explain deltas.
2) Policy‑first
   - User selects a few reforms; params auto‑derive Δ€ by mass (heuristics); user applies as Targets or Changes.
   - Combined with dials, user iterates until resolution ≥80% and Rule lights ok.

Page Structure

- Top HUD Bar: Global controls and scenario feedback (Resolution Meter, Year Selector, EU Lights, Undo/Redo, Reset).
- Main Content (Three-Column Layout):
  - Left Panel (Spending): Lists spending categories. Users can select a category to view details, set targets, and explore related reforms.
  - Center Panel (Canvas): An interactive treemap visualizes budget allocations. Below the treemap, charts display the impact of scenarios on debt, deficit, and growth.
  - Right Panel (Revenues): Lists revenue categories with controls for adjustments.

Data Contracts

- Queries
  - legoPieces(year): id, label, type, amountEur, share, cofogMajors
  - legoBaseline(year): depensesTotal, recettesTotal
  - legoDistance(year, dsl): score, byPiece{id, shareDelta}
  - policyLevers(family?, search?): id, family, label, paramsSchema, feasibility, conflictsWith, sources
  - shareCard(scenarioId): title, deficit, debtDeltaPct, resolutionPct, masses, eu3, eu60
- Mutation
  - runScenario(input:{dsl}): id, accounting{deficitPath, debtPath}, compliance{eu3pct, eu60pct, netExpenditure, localBalance}, macro{…}, resolution{overallPct, byMass{massId, targetDeltaEur, specifiedDeltaEur}}
  - saveScenario(id, title?, description?): bool

Key Algorithms

- Resolution (server): overallPct = sum(|specified_by_mass|)/sum(|target_by_mass|); byMass provided for progress bars.
- Pending stripes (client): width% = clamp((|target|−|specified|)/max(base_mass_amount, 1e-9)).
- DSL serialization: includes both mass and piece actions; id is required by schema.
  - piece.<id> with role target for targets
  - piece.<id> without role for changes
  - cofog.<major> for mass targets/changes
  - lever id as neutral (amount_eur:0) for conflicts/attribution
- DSL restore: parse YAML and rehydrate UI state (piece targets/changes, mass targets/changes, selected levers).

Accessibility & i18n

- Full keyboard navigation, visible focus, 4.5:1 contrast; DSFR components and tokens.
- All interactive controls have labels and aria attributes; WAI‑ARIA roles for tabs and progress.
- FR/EN catalogs for all labels; ICU formatting for numbers.

Performance & DX

- Performance budgets (P95):
  - First interaction → response (runScenario): ≤ 500ms on warmed caches
  - Render updates: ≤ 16ms/frame for HUD updates
  - Bundle: keep shared < 100 kB; lazy‑load heavy charts
- Codegen for GraphQL once schema stabilizes; keep fetch minimal until then.
- Types: strict TS for components and data shapes.

Telemetry

- Events: target_set, change_set, lever_selected, lever_applied, scenario_run, rule_breach_shown, conflict_nudge_shown, share_clicked
- Anonymous, no PII; opt‑out via env.

Acceptance Criteria (AC)

1) Mass & Piece Dials
   - Target (role) and Change inputs present; locked/bounds flagged; shows pending overlay.
2) Resolution
   - Global meter and per‑mass progress from server data; pending stripes visible on Canvas.
3) Workshop
   - Levers listed by family; params render from schema; Apply as Target/Change into DSL; conflicts cause visible nudge and server error.
4) Scoreboard
   - Shows ΔExp/ΔRev estimates, Deficit (y0), EU lights (y0), Distance score; responsive.
5) Permalinks
   - URL `?dsl=<base64>` sync + restore on load; shareCard twin‑bars reflect top masses.
6) A11y/i18n
   - Axe passes for /build; FR/EN translation for all new labels.
7) Perf
   - Meets budgets; no severe layout shifts; charts lazy‑loaded.

Open Questions

- Calibrate lever param → Δ mapping rules; surface “assumptions” tooltip in UI.
- Add presets bundles; integrate with Challenges gating (Resolution ≥80%).

