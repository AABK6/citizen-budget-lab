### Citizen Budget Lab — Backlog (Aligned with Current Development Plan)

This backlog mirrors the prioritized roadmap described in `current_dev_plan.md`. Each epic is grouped by phase and uses the same task identifiers. Statuses reflect the outstanding work required to eliminate the "two-engine" architecture and complete the PLF 2026 baseline.

#### Legend

- `[ ]` Not started
- `[~]` In progress / partial scaffolding exists
- `[x]` Implemented and verified

For verification guidance (tests, commands, datasets), refer to `docs/REFACTOR_PLAN.md` and `docs/DEVELOPER_GUIDE.md`.

---

## Phase 1 — Foundational Refactoring & Data Integrity (**Critical Path**)

### Epic BE: Unify Backend Data Flow (Eliminate the Second Engine)
- `[x]` **BE-01** Refactor `allocation_by_cofog` to query `fct_admin_by_cofog` exclusively (remove JSON fallback; add regression tests).
- `[x]` **BE-02** Refactor `run_scenario` to source LEGO baselines via `warehouse_client` (drop reads from `data/cache/lego_baseline_{year}.json`).

### Epic DBT: Solidify the Semantic Layer
- `[x]` **DBT-01** Implement APU subsector tagging (`dim_apu_entities`, joins into fact tables, engine wiring).
- `[x]` **DBT-02** Finalise COFOG mapping logic (seed generation, dbt tests for year/programme hierarchy, manual QA).

## Phase 2 — 2026 Baseline Implementation & Data Ingestion

### Epic DI: Develop PLF 2026 Data Ingestion Pipeline
- `[x]` **DI-01** Extend `cache_warm.py` with PDF/XLS parsing for PLF ceilings (dependencies added, errors handled, CSV emitted).
- `[x]` **DI-02** Create dbt source/staging models for PLF ceilings and integrate into the semantic layer (`stg_plf_2026_ceilings`, downstream marts).

### Epic BL: Construct and Validate the 2026 Simulation Baseline
- `[x]` **BL-01** Build `fct_simulation_baseline_2026` (joins LFI 2025, PLF 2026, macro forecasts; dbt tests for totals).
- `[x]` **BL-02** Surface baseline disclaimer in `/build` explaining PLF proposal assumptions.

## Phase 3 — Feature Development & UI/UX Completion

### Epic BE+: Enhance Simulation Engine Capabilities
- `[x]` **BE-03** Implement AE/CP arithmetic differentiation (dimension-aware deltas, unit tests).
- `[x]` **BE-04** Model PLF 2026 policy levers ("année blanche", targeted ministry cuts) with verified fiscal impacts.

### Epic FE: Frontend Refactoring & Feature Delivery
- `[x]` **FE-01** Refactor `BuildPageClient.tsx` state management (introduce reducer/custom hooks, modular components).
- `[x]` **FE-02** Unify permalink generation/parsing (`scenarioId` everywhere; shared utility used by `/challenges`, `/build`, share links).

---

### Standing Items & Reference

- **CI Reliability:** continue to treat `.github/workflows/ci.yml` as insufficient for detecting dual-engine regressions until Phase 1 tasks are complete.
- **Warm Data Contracts:** warmed artefacts now emit `.meta.json` manifests; keep extending validation scripts as new datasets are added.
- **Documentation Sync:** keep `docs/REFACTOR_PLAN.md` and `current_dev_plan.md` updated whenever a task transitions to `[~]` or `[x]`.
- **Scenario Outputs:** GraphQL `runScenario` now emits `baseline*` and `*Delta` paths for deficit and debt; ensure UI/analytics consumers use the absolute path unless a delta is explicitly desired.
- **[Optional] Admin Lens in Builder:** Consider replacing the current COFOG-driven masses with administrative (mission/programme) groupings — see "Refactor Plan: Administrative Lens" below.

---

### Optional Refactor: Administrative Lens for Builder (Masses & Panels)

**Goal:** Allow the `/build` treemap, mass targets, and reform panels to operate on the administrative (mission/programme) lens instead of — or in addition to — the current COFOG major categories.

1. **Warehouse & API groundwork**
   - Produce a mission-level baseline view parallel to existing COFOG outputs (e.g., `fct_admin_baseline_mission`).
   - Extend `lego_baseline` snapshots (or the dbt mart feeding them) with mission/programme IDs so each LEGO piece can be aggregated by both lenses.
   - Introduce an administrative `massLabels` source (`mission_code`, display name, colour) matching what the frontend expects.
   - Update `services/api/data_loader.py` to accept a `lens` flag for scenario runs, emitting either COFOG or mission aggregates; ensure compliance/resolution structures carry the chosen IDs.

2. **Policy lever attribution**
   - Add mission-level weights to each lever (`policy_catalog.py`).
   - Adjust resolution bookkeeping (`resolution_*` maps) to consume the new weights when the administrative lens is active.
   - Decide how mixed levers (affecting multiple missions) display in the UI; document behaviour when a mapping is missing.

3. **Frontend updates**
   - Expand `buildPageQuery` so both `legoBaseline` and `legoPieces` include mission metadata; fetch the new `missionLabels` dictionary.
   - Refactor `MassCategory` typing to support either lens; the builder state should track the active lens and populate treemap/panels accordingly.
   - Provide a lens toggle (COFOG vs mission) or migrate existing controls to mission-only, depending on UX decision. Ensure filters, targets, and resolution meter stay in sync.

4. **Testing & Migration**
   - Add API tests covering both lenses (ensuring mission totals align with warehouse output).
   - Create frontend regression checks (Storybook snapshot or Playwright script) for the mission view.
   - If supporting dual lenses, ensure permalinks encode the chosen lens so shared scenarios remain reproducible.

This refactor is optional and should be scheduled after confirming data availability and UX expectations.
