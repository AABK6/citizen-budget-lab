# Refactoring Plan: Architectural Stability and Feature Completion

_Last updated: 2025-12-30_

> **Status:** The remediation program is complete. The dbt warehouse is now the single source of truth, PLF 2026 data flows end-to-end, and Phase 3 UX polish (permalinks, the builder refactor, `/compare`) is live. The scenario engine subsequently gained explicit baseline + delta fiscal paths so the UI can display absolute deficits without client-side guesswork. **(Update 2025-12-30: 2026 data manually refreshed to align with adopted budget.)** This plan is retained as an architectural log and an operational checklist.

Historically, it mirrored the canonical roadmap in `current_dev_plan.md`. As of late 2025, this file is the authoritative, living refactor log for the warehouse migration; treat `current_dev_plan.md` as historical context unless explicitly updated.

## 1. Executive Summary & Strategic Imperative

### 1.1 Confirmed Diagnosis (Resolved)

The initial audit exposed a **two-engine problem**: dbt models and JSON fallbacks could both answer API requests, often with conflicting numbers. Phase 1 removed the legacy path entirely, and regression tests now enforce the warehouse contract for every resolver.

### 1.2 Quality Assurance Now

CI continues to run unit tests, dbt builds, and typed frontend checks. Integration coverage has been expanded with parity tests (`test_cofog_mapping_parity.py`, `test_budget_baseline.py`) to ensure the warehouse and API stay aligned.

### 1.3 Strategic Outcome

The refactor is complete. The ongoing mandate is to keep warmers, dbt models, and UX surfaces healthy so that new content (e.g., PLF updates) can drop in without reintroducing architectural drift.

### 1.4 Critical Path (Three Phases)

1. **Phase 1 – Foundational Refactoring & Data Integrity.** Eliminate the "two-engine" problem by completing the dbt integration and removing file-based fallbacks from the backend API.
2. **Phase 2 – 2026 Baseline Implementation & Data Ingestion.** Once the foundation is stable, ingest the official PLF 2026 documents and assemble the authoritative simulation baseline inside the warehouse.
3. **Phase 3 – Feature Development & UI/UX Completion.** With a reliable data pipeline in place, resume backend engine enhancements and deliver the remaining UX features (`/compare`, permalink hygiene, builder refactor, etc.).

## 2. Task Ledger

All remediation tasks are **Completed**; the ledger is retained for traceability.

| Task ID | Description | Phase | Priority | Key Files & Components | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| **BE-01** | Refactor `allocation_by_cofog` to query `fct_admin_by_cofog` exclusively (remove JSON fallback; add regression tests). | 1 | Critical | `services/api/data_loader.py`, `fct_admin_by_cofog` | Resolver only talks to warehouse; unit tests ensure parity. | Completed |
| **BE-02** | Refactor `run_scenario` to source LEGO baselines through `warehouse_client` (drop reads from `data/cache/lego_baseline_{year}.json`). | 1 | Critical | `services/api/data_loader.py`, `fct_lego_baseline` | JSON file reads removed; scenario baseline comes from warehouse; tests updated. | Completed |
| **DBT-01** | Implement APU subsector tagging (`dim_apu_entities`, joins into fact tables, engine wiring). | 1 | High | `warehouse/models/`, new dimension rules | Mission/procurement rows tagged with APUC/APUL/ASSO; dbt tests cover new fields. | Completed |
| **DBT-02** | Finalise COFOG mapping logic (seed generation, dbt tests for year/programme hierarchy, manual QA). | 1 | High | `tools/build_seeds.py`, `dim_cofog_mapping`, `fct_admin_by_cofog` | Seed reflects mission/programme/year hierarchy; dbt tests guard edge cases; manual parity verified. | Completed |
| **DI-01** | Extend `cache_warm.py` with PDF/XLS parsing for PLF ceilings (dependencies added, errors handled, CSV emitted). | 2 | High | `services/api/cache_warm.py`, new deps (`pdfplumber`, `openpyxl`, optionally `pandas`) | Warmer downloads & normalises PLF 2026 mission ceilings; outputs CSV + `.meta.json`. | Completed |
| **DI-02** | Create dbt source/staging models for PLF ceilings and integrate into semantic layer (`stg_plf_2026_ceilings`, downstream marts). | 2 | High | `warehouse/models/staging/`, new source config | dbt ingest succeeds; downstream marts can reference PLF ceilings; `dbt build/test` stays green. | Completed |
| **BL-01** | Build `fct_simulation_baseline_2026` (joins LFI 2025, PLF 2026, macro forecasts; dbt tests for totals). | 2 | High | `warehouse/models/marts/fct_simulation_baseline_2026.sql` (new) | Baseline mart combines inputs and passes dbt tests for totals/consistency. | Completed |
| **BL-02** | Surface baseline disclaimer in `/build` clarifying baseline is a snapshot (e.g., PLF/PLFSS 2026 adopted as-of a given date) and may drift with later amendments. | 2 | Medium | `frontend/app/build/BuildPageClient.tsx` | Prominent UI disclaimer clarifies baseline is a snapshot that may change. | Completed |
| **BE-03** | Implement AE/CP arithmetic differentiation (dimension-aware deltas, unit tests). | 3 | Medium | `services/api/data_loader.py`, tests | Scenario actions respect `dimension` flag, maintaining separate AE and CP ledgers. | Completed |
| **BE-04** | Model PLF 2026 policy levers ("année blanche", targeted ministry cuts) with verified fiscal impacts. | 3 | Medium | `services/api/policy_catalog.py`, `services/api/data_loader.py`, tests | Levers defined, applied correctly in `run_scenario`, unit tests cover impacts. | Completed |
| **FE-01** | Refactor `BuildPageClient.tsx` state management (introduce reducer/custom hooks, modular components). | 3 | Medium | `frontend/app/build/BuildPageClient.tsx` | Component decomposed; state handled via reducer/custom hooks; behaviour unchanged. | Completed |
| **FE-02** | Unify permalink generation/parsing (`scenarioId` everywhere; shared utility for `/challenges`, `/build`, share links). | 3 | Low | `frontend/lib/`, `frontend/app/challenges/page.tsx`, `frontend/app/build/BuildPageClient.tsx` | Single query parameter format; shared helpers; manual QA on permalinks. | Completed |
| **FE-03** | Implement the "Compare & Remix" UI (fully interactive `/compare` powered by `scenarioCompare`). | 3 | Low | `frontend/app/compare/ComparePageClient.tsx`, GraphQL schema | `/compare` loads two scenario IDs, renders comparison using `scenarioCompare`. | Completed |

## 3. Risks & Dependencies

- **Upstream dataset volatility.** PLF workbooks, Eurostat metadata, and DECP exports can add or rename fields. Warmers must continue to validate headers and surface schema changes quickly.
- **Data freshness.** The warehouse reads from `data/cache/`; missed warmer runs can leave the duckdb snapshot stale. Schedule nightly warmers (or trigger on data releases) and monitor `tools/warm_summary.py` output.
- **Regression coverage.** The API/dbt/pytest suite now catches drift, but CI must keep running `dbt build` and the full pytest suite (including parity tests) to preserve guarantees.

## 4. Immediate Next Actions

1. Automate regular warmer runs (`make warm-all`, `make warm-decp`) with alerting when upstream fetches fail.
2. Keep dbt snapshots current by running `dbt build` after each warmer batch and archiving `data/warehouse.duckdb` releases.
3. Continue to dogfood `/compare` and permalink flows to capture UX regressions early.

Progress should always be reflected in both this document and `BACKLOG.md`.
