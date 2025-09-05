Citizen Budget Lab — Budget Playground ↔ Policy Workshop Plan (Detailed)

North Star

- Bold, toy‑like, viral: fast “aha!”, fun to tweak, truth‑preserving.
- Dual‑path: start with goals (masses) or with policies (reforms) — always nudge to “explain” goals with named reforms.
- Rigorous backbone: visible assumptions, conflicts guard, EU lights, macro bands, attribution ribbons.

Experience Pillars

- Playground (What): Twin Bars + Dials; Δ chips; striped “Pending”; Waterfall of deltas; cockpit HUD for instant state.
- Workshop (How): Reform families → levers with params; progress‑to‑target; feasibility tags; conflict nudges; scoped Explain overlay anchored to the item.
- Lens Switch: By Mass • By Reform Family • By Named Reform (same scenario, 3 views).
- ScoreStrip & Results Tray: Slim sticky strip mirrors HUD basics; tray expands for debt/macro/distribution; collapses to return focus.
- Share/Remix: permalink + OG card; “Duplicate & Edit”; Challenges/Classroom hooks.

Design Language

- Mass cards with human labels (e.g., “Health”, “Schools”, “Police & Justice”), emoji/icon, 1‑line definition, 2–3 example reforms.
- Intent chips: popular goals and reforms (“Hire more nurses”, “Rural ER coverage”, “Raise top income tax”) → one‑tap seeds targets or reforms.
- Micro‑animations: tactile dials, ribbons, pending stripes slow as you specify more; confetti on 100% (respects prefers‑reduced‑motion).
 - Motion language: short ease‑out anims on bar changes (150–200ms); staggered ribbons in Lens view; reduced‑motion disables non‑essential transitions.

Architecture Additions

- Content: humanized labels and synonyms for masses/pieces; policy tags, popularity; curated “intents”.
- API: reform suggestion and intent discovery; mass specification assistance.
- UI: Mass Cards + Explain Panel; Reform Library with search; Waterfall + Sankey‑lite ribbons; HUD; Compare/Remix.
 - UI: Two‑column command center; Cockpit HUD; Slim ScoreStrip; Results Tray; Explain Overlay; inline configurators; pinned items; sticky headers.

Roadmap (Phased)

Phase 0 — Alignment & Framing
- Wireframes (Frames 1–6) desktop + mobile; 30 intent chips EN/FR; metrics.
- AC: sign‑off on dual‑path mechanic and visuals.

Phase 1 — Option D Baseline (delivered/in hardening)
 - Build page scaffold; twin lists; resolution; permalink; lever params; cockpit HUD + ScoreStrip; i18n seeds; OG preview; axe on /build.
 - Added: Outdated results chip (DSL diff), default Adjusted‑only filters, one‑line rows with steppers (Δ and 🎯), Δ€ chips, MassJumpBar, Waterfall in Canvas, per‑mass progress chips, compact density mode.
- Hardening: numeric inputs, keyboard controls, DSFR ARIA; copy polish.

Phase 2 — Human Labels + Intents (content + API)
- Add ux_labels.json (mass/piece displayLabel, description, examples, synonyms).
- API: expose displayLabel/desc/examples; popularIntents(limit) → chips (id, label, emoji, seedDsl, popularity).
- AC: chips render; mass cards show human names; search hits synonyms.

Phase 3 — Suggest & Specify (server)
- API: suggestLevers(massId) with ranked levers (mapping × popularity × coverage).
- API: specifyMass(input) validates split plan, returns updated resolution/byMass; guards on conflicts/over‑alloc.
- AC: for a mass target, suggestions are sensible; partial plans raise resolution accordingly.

Phase 4 — Explain Panel + Mass Cards (client)
 - Mass Cards: Δ€ input, pending badge, info tooltip; “Explain this” CTA opens overlay scoped to mass or piece.
 - Explain Overlay: progress‑to‑target bar; lever suggestions + presets; split sliders sum‑constrained to target; focus‑trap; Esc closes; restores focus.
  - Pinned levers: inline configurators with mass select and Apply as Target/Change.
- AC: Dial → Pending → Explain → Specified loop in < 90s; progress hits 100% with mixes.

Phase 5 — Visual Rigor: Waterfall + Ribbons + Lens
- WaterfallDelta: Δ by Mass/Family/Reform; lazy‑loaded; export static.
- Sankey‑lite ribbons: hover highlights reform → mass attribution.
- AC: hover answers “which lever contributed most?”; totals reconcile.
- Implemented (initial): Waterfall in Canvas for Mass lens; ribbons available in Results Tray; lens chips scaffolded in Canvas (Mass active). Mass palette applied to TwinBars; Family/Reform lenses pending data.

Phase 6 — Policy‑First Flow
- Reform Library: categories/tags/search; cards with summary, € range, incidence bullets, feasibility tags.
- Configurator: params; incidence and EU lights preview; “Apply as Target/Change”.
- AC: add reform, see room/pressure; hit 100% resolution with two levers and a mass dial.

Phase 7 — Compare & Remix
- ScenarioCompare: side‑by‑side twin bars; Δ waterfall; By‑Reform diff; lineage; Duplicate & Edit; lock “as proposed”.
- AC: remix a plan and share; diff accurate and legible.

Phase 8 — Challenges & Classroom (V1)
- Challenges with weekly prompts and Resolution ≥80% to submit; badges on OG.
- Classroom Room: join code; live leaderboard; Freeze & Debrief slides.
- AC: 20‑min class runs end‑to‑end; submissions meet threshold.

Phase 9 — Polish, A11y, Perf (continuous)
- Axe pass; keyboardable dials; skip links; prefers‑reduced‑motion.
- P95: runScenario ≤ 500ms (warmed); render ≤ 16ms/frame; shared bundle < 100 kB.
- Telemetry: dial_set, explain_opened, lever_applied, scenario_run, share_clicked, resolution_milestone (DNT respected).

Backlog (Granular, Implementable)

Mass/Piece Humanization
- Add ux_labels.json (masses/pieces: displayLabel, description, examples, synonyms).
- GraphQL: mass list + labels; extend legoPieces with displayLabel/desc/examples.
- UI: replace labels; add info tooltips; de‑jargonize copy.

Intent System
- Curate 30 intents (id, label, emoji, seedDsl, popularity, tags).
- GraphQL: popularIntents(limit) → list.
- UI: PopularIntents row; chip click seeds a target or a reform.

Reform Suggestions
- Extend policy_catalog: tags, shortLabel, popularity, massMapping, uiHints.
- suggestLevers(massId): rank (mapping × popularity); return lever, shortHint, default params; tests for ranking.

Specify Mass Plan
- specifyMass(input): sum‑constrained plan; compute resolution/byMass; errors: over‑allocate, conflicts, locked.
- UI: ExplainPanel sliders with “remaining €” and “specified €”.

Explain Panel
- Scoped panel: progress bar; lever suggestions; apply/preset; conflict messages; feasibility badges (Law/Admin/Lag).
- Preset JSON per mass with 2–3 canonical mixes.

Charts
- WaterfallDelta (Mass/Family/Reform); toggle control; lazy import; export image.
- Sankey‑lite ribbons: build matrix (lever→piece→cofog); hover highlight.

Lens Switch
- Recolor Twin Bars and Waterfall by lens; stable totals; persistent selection.

Reform Library
- Cards: label, summary, tags, € range, incidence bullets, feasibility; Configurator; “Apply as Target/Change”.

Compare & Remix
- ScenarioCompare(a,b): ribbons/waterfall deltas JSON; UI side‑by‑side; Duplicate & Edit; lock “as proposed”.

Challenges/Classroom (later)
- Challenge registry; validation (resolution threshold); leaderboard; Room join/freeze; Debrief export.

Polish: A11y/Perf
- Keyboardable dials; aria-live for progress; skeleton states; lazy charts; code‑split Workshop.
- Undo/Redo stack (Cmd/Ctrl+Z / Shift+Z); '/' search focus; 'f' pin/unpin; '+'/'-' adjust focused delta; Esc closes overlays.
 - Next: Shift modifier for ±5; segmented filters per group; mode pill for target editor.

Telemetry
- Emit events; anonymous; DNT support; dashboards for funnel.

Acceptance Criteria (per Track)

Mass Cards + Explain Panel
- Dial shows pending stripes + Δ chip; Explain shows remaining; sum‑constrained sliders; “Specified” badge when 100%.

Workshop
- Two levers reach ≥50% progress within 3 actions; conflict nudge with plain message and link.

Charts
- Waterfall sums reconcile; ribbons 60 FPS hovers; export works.

Lens
- Totals consistent across lenses; colors legible; legend clarifies mapping.

Policy‑first
- Reform adds room/pressure; suggested next actions guide users.

Compare/Remix
- Diff highlights changed masses and reforms; lineage in share card.

Share/OG
- OG card: title, top masses/reforms, Deficit/Debt, EU lights, “Specified X%” watermark if partial.

A11y/Perf
- Axe passes; budgets met; prefers‑reduced‑motion disables confetti; controls reachable.

Decisions to Lock

- Catalog seed scope: 2–3 levers per mass for first ship.
- Visual defaults: palette for masses/families/reforms; ribbons; icons.
- Copy tone: “Make it real?” vs “Explain how”; FR/EN baseline strings.
- Telemetry keys; opt‑out flag.

Risks & Mitigations

- Over‑complex Workshop: progressive disclosure; presets; scoped Explain Panel.
- Jargon creep: humanized labels; tooltips with examples.
- Performance: lazy charts; throttle hovers; memoize lens transforms.
- Double counting: guardrails with precise errors; conflict nudges.

Implementation Notes

- Lead with Option D; then add dual‑path panels (ExplainPanel, PopularIntents), then visuals (Waterfall, Ribbons), then Compare/Remix.
- Keep DSL canonical and deterministic; store lever attributions for ribbons and share card.
- Always surface assumptions and feasibility; never hide uncertainties.

Annotated Storyboard (Frames)

Frame 0 — Home & Onboarding: two equal CTAs (Budget/Policy); promise copy; micro‑preview hovers; FR/EN toggle.
Frame 1 — Playground Default: Twin Bars + stacks; Cockpit HUD; Lens Switch; slim ScoreStrip.
Frame 2 — Mass Focus + Dial: tactile dial overlay; apply −10%; micro prompt.
Frame 3 — Pending + Δ Chip: striped mass; Δ chip; toast “Choose how to get there.”
Frame 4 — Scoped Workshop: hierarchical levers; progress bar; feasibility; conflict nudges; Explain overlay in focus.
Frame 5 — Partial Spec: presets; Δ chip shows specified portion; HUD resolution rises.
Frame 6 — Target Met: confetti (a11y‑aware); ✓ Specified; EU lights/debt recompute.
Frame 7 — Lens Switch: recolor stacks to Family/Reform; ribbons on hover.
Frame 8 — Path Compare Tray: alternative mixes; distribution/EU/macro/risk; promote/blend.
Frame 8b — Results Tray: debt path chart; distribution chart; macro fan; collapsible.
Frame 9 — Policy‑First Entry: Reform Library with cards; tags/search; incidence bullets.
Frame 10 — Apply Reform → Playground: room to allocate chip; suggested next actions.
Frame 11 — Compare & Remix: side‑by‑side diffs; lineage; Duplicate & Edit.
Frame 12 — Challenges: weekly prompt; Resolution ≥80%; leaderboard; badge on OG.
Frame 13 — Classroom: Room join; freeze/debrief; export slides.
Frame 14 — Share Card & One‑Pager: preview and export; watermark when partial.
Frame 15 — A11y & Mobile: stacked flow; numeric entry; color‑blind palette; prefers‑reduced‑motion.
