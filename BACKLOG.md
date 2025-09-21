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
- `[ ]` **BE-03** Implement AE/CP arithmetic differentiation (dimension-aware deltas, unit tests).
- `[ ]` **BE-04** Model PLF 2026 policy levers ("année blanche", targeted ministry cuts) with verified fiscal impacts.

### Epic FE: Frontend Refactoring & Feature Delivery
- `[ ]` **FE-01** Refactor `BuildPageClient.tsx` state management (introduce reducer/custom hooks, modular components).
- `[ ]` **FE-02** Unify permalink generation/parsing (`scenarioId` everywhere; shared utility used by `/challenges`, `/build`, share links).
- `[ ]` **FE-03** Implement the "Compare & Remix" UI (fully interactive `/compare` powered by `scenarioCompare`).

---

### Standing Items & Reference

- **CI Reliability:** continue to treat `.github/workflows/ci.yml` as insufficient for detecting dual-engine regressions until Phase 1 tasks are complete.
- **Warm Data Contracts:** warmed artefacts now emit `.meta.json` manifests; keep extending validation scripts as new datasets are added.
- **Documentation Sync:** keep `docs/REFACTOR_PLAN.md` and `current_dev_plan.md` updated whenever a task transitions to `[~]` or `[x]`.
