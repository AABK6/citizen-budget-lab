# Refactoring Plan: Architectural Stability and Feature Completion

_Last updated: 2025-09-08_

This document tracks the engineering work required to resolve the "two-engine" architecture and to deliver a trustworthy 2026 simulation baseline. It mirrors the canonical roadmap in `current_dev_plan.md` and should be kept in lockstep with the backlog (`BACKLOG.md`).

## 1. Executive Summary

- **Confirmed Diagnosis – A Project Divided.** The application still ships with two conflicting data paths: the dbt warehouse (intended single source of truth) and legacy Python fallbacks that read warmed CSV/JSON files in `services/api/data_loader.py`. These paths drift, especially for COFOG mappings and LEGO baselines, producing unverifiable answers.
- **Quality Assurance Gap.** The current CI pipeline (`.github/workflows/ci.yml`) runs backend tests, dbt builds, and the frontend build independently. It does not exercise the fully integrated data flow, so regressions in cross-engine consistency slip through.
- **Strategic Imperative.** All feature work remains paused until the warehouse refactor is complete. Phases below describe the blocking work to unify data flow, ingest PLF 2026 data, and finish the UI/UX debt.

## 2. Phase Plan

### Phase 1 — Foundational Refactoring & Data Integrity (**Immediate priority**)

| Task ID | Description | Key Assets | Acceptance Criteria | Status |
| --- | --- | --- | --- | --- |
| **BE-01** | Refactor `allocation_by_cofog` to query warehouse only | `services/api/data_loader.py`, `fct_admin_by_cofog` | Remove JSON fallbacks; rely solely on warehouse client; add regression tests | Not Started |
| **BE-02** | Refactor `run_scenario` baseline loader | `services/api/data_loader.py`, `fct_lego_baseline` | Eliminate reads from `data/cache/lego_baseline_{year}.json`; rewire through warehouse client; tests updated | Not Started |
| **DBT-01** | Implement APU subsector tagging | `warehouse/seeds/`, `dim_apu_entities` (new), `fct_admin_by_mission` | Seed generated from maintained rules; models join subsector; API can group by APUC/APUL/ASSO | Not Started |
| **DBT-02** | Finalise COFOG mapping logic | `tools/build_seeds.py`, `dim_cofog_mapping`, `fct_admin_by_cofog` | Seed covers mission/programme/year hierarchy; dbt tests cover edge cases; manual QA matches expected totals | Not Started |

**Goals:** remove the dual-engine behaviour, ensure dbt models are authoritative, and guarantee parity through automated tests.

### Phase 2 — 2026 Baseline Implementation & Data Ingestion

| Task ID | Description | Key Assets | Acceptance Criteria | Status |
| --- | --- | --- | --- | --- |
| **DI-01** | Extend `cache_warm.py` for PLF PDF/XLS parsing | `services/api/cache_warm.py`, new deps (`pdfplumber`, `openpyxl`) | Warmer downloads & parses PLF 2026 ceilings; outputs normalized CSV + `.meta.json`; robust error handling | Not Started |
| **DI-02** | Add dbt models for PLF 2026 ceilings | `warehouse/models/staging/`, `stg_plf_2026_ceilings` (new) | Source + staging models ingest CSV; downstream marts can reference the ceilings; `dbt build/test` green | Not Started |
| **BL-01** | Build 2026 simulation baseline mart | `warehouse/models/marts/fct_simulation_baseline_2026.sql` (new) | Model joins LFI 2025, PLF ceilings, macro forecasts; dbt tests validate totals & joins | Not Started |
| **BL-02** | Surface baseline disclaimer in UI | `frontend/app/build/BuildPageClient.tsx` | Prominent banner clarifies baseline ≠ enacted law; copy approved with product | Not Started |

### Phase 3 — Feature Development & UI/UX Completion

| Task ID | Description | Key Assets | Acceptance Criteria | Status |
| --- | --- | --- | --- | --- |
| **BE-03** | Implement AE/CP arithmetic differentiation | `services/api/data_loader.py` | `run_scenario` evaluates `dimension` field, maintaining separate AE and CP ledgers; unit tests cover both | Not Started |
| **BE-04** | Model key PLF 2026 policy levers | `services/api/policy_catalog.py`, `services/api/data_loader.py` | Levers for "année blanche" and targeted ministry cuts exist; fiscal impacts validated by tests | Not Started |
| **FE-01** | Refactor build-page state management | `frontend/app/build/BuildPageClient.tsx` | State handled via reducer/custom hooks, extracted sub-components, functionality unchanged | Not Started |
| **FE-02** | Unify permalink generation/parsing | `frontend/app/challenges/page.tsx`, `frontend/app/build/BuildPageClient.tsx`, `frontend/lib/` | Single `scenarioId` query parameter across app; shared helper functions; regression tests/sample links | Not Started |
| **FE-03** | Implement "Compare & Remix" UI | `frontend/app/compare/ComparePageClient.tsx` | Page allows selecting two scenario IDs, renders fiscal/macro comparison using `scenarioCompare` | Not Started |

## 3. Risks & Dependencies

1. **Warehouse Availability:** Until BE-01/BE-02 land, disabling the warehouse causes API fallbacks to resurface, masking divergences. Enforce a hard failure when the warehouse is missing once the refactor completes.
2. **Static Document Formats:** PLF ingestion (DI-01) depends on PDF/XLS structure that may change. Mitigate with robust parsing, metadata sidecars, and manual QA playbooks.
3. **Macro Scenario Accuracy:** AE/CP differentiation and new policy levers must include clear documentation of assumptions to avoid misinterpretation.
4. **CI Coverage:** Update CI to run seed generation + dbt build + integration smoke tests once Phase 1 closes, otherwise regressions will persist.

## 4. Immediate Next Steps (Sprint Checklist)

1. Finish design notes for `allocation_by_cofog` refactor (warehouse query structure, error handling).
2. Draft APU subsector rules JSON and validate against sample missions before wiring into dbt.
3. Prototype PLF PDF parsing locally, documenting dependencies and edge cases.
4. Prepare frontend instrumentation for scenario permalinks so QA can verify once FE-02 ships.

Progress is tracked in `BACKLOG.md`; update statuses there and in this document whenever a task moves from `[ ]` to `[~]` or `[x]`.
