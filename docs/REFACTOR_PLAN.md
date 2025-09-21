# Refactoring Plan: Architectural Stability and Feature Completion

_Last updated: 2025-09-08_

This document mirrors the canonical roadmap in `current_dev_plan.md`. It exists so engineers have a single place to track the remediation work that will eliminate the "two-engine" architecture, ingest PLF 2026 data, and finish the outstanding UX features.

## 1. Executive Summary & Strategic Imperative

### 1.1 Confirmed Diagnosis: A Project Divided

A granular, line-by-line audit of the Citizen Budget Lab codebase confirms the central finding of the "Strategic Analysis for the 2026 French Budget Simulation" report: the project is fundamentally compromised by a critical architectural flaw. This **two-engine problem** stems from an incomplete data warehouse refactor, resulting in two parallel and inconsistent data pipelines operating simultaneously.

- The **first engine** is the intended single source of truth: a modern data warehouse managed by dbt.
- The **second engine** is a legacy, file-based fallback system located within `services/api/data_loader.py`, which reads directly from warmed flat files in `data/cache/`, bypassing the warehouse entirely.

These systems are not in sync. They produce divergent results, particularly in the complex, year-aware logic for mapping administrative budget codes to COFOG classifications. This means the application can report different figures for the same query depending on the path taken, rendering any output unverifiable. Both `BACKLOG.md` and this plan label the inconsistency a **CRITICAL GAP**.

### 1.2 Quality Assurance Blind Spot

The CI pipeline (`.github/workflows/ci.yml`) currently gives a false sense of security. Backend tests, dbt builds, and the frontend build all pass, but the checks run in isolation. The suite cannot detect the cross-engine data divergence described above, which is why a fundamental integrity flaw can coexist with a green CI badge.

### 1.3 Strategic Imperative: Halt and Refactor

Given the severity of the architectural flaw, all net-new feature development is paused. Building atop a bifurcated foundation would add technical debt, surface contradictory numbers to users, and undermine trust. The sole focus of the engineering team is to complete the data warehouse refactor described below. This is a non-negotiable prerequisite for future shipping work.

### 1.4 Critical Path (Three Phases)

1. **Phase 1 – Foundational Refactoring & Data Integrity.** Eliminate the "two-engine" problem by completing the dbt integration and removing file-based fallbacks from the backend API.
2. **Phase 2 – 2026 Baseline Implementation & Data Ingestion.** Once the foundation is stable, ingest the official PLF 2026 documents and assemble the authoritative simulation baseline inside the warehouse.
3. **Phase 3 – Feature Development & UI/UX Completion.** With a reliable data pipeline in place, resume backend engine enhancements and deliver the remaining UX features (`/compare`, permalink hygiene, builder refactor, etc.).

## 2. Task Ledger

All tasks are currently **Not Started**.

| Task ID | Description | Phase | Priority | Key Files & Components | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| **BE-01** | Refactor `allocation_by_cofog` to query `fct_admin_by_cofog` exclusively (remove JSON fallback; add regression tests). | 1 | Critical | `services/api/data_loader.py`, `fct_admin_by_cofog` | Resolver only talks to warehouse; unit tests ensure parity. | Completed |
| **BE-02** | Refactor `run_scenario` to source LEGO baselines through `warehouse_client` (drop reads from `data/cache/lego_baseline_{year}.json`). | 1 | Critical | `services/api/data_loader.py`, `fct_lego_baseline` | JSON file reads removed; scenario baseline comes from warehouse; tests updated. | Completed |
| **DBT-01** | Implement APU subsector tagging (`dim_apu_entities`, joins into fact tables, engine wiring). | 1 | High | `warehouse/models/`, new dimension rules | Mission/procurement rows tagged with APUC/APUL/ASSO; dbt tests cover new fields. | Completed |
| **DBT-02** | Finalise COFOG mapping logic (seed generation, dbt tests for year/programme hierarchy, manual QA). | 1 | High | `tools/build_seeds.py`, `dim_cofog_mapping`, `fct_admin_by_cofog` | Seed reflects mission/programme/year hierarchy; dbt tests guard edge cases; manual parity verified. |
| **DI-01** | Extend `cache_warm.py` with PDF/XLS parsing for PLF ceilings (dependencies added, errors handled, CSV emitted). | 2 | High | `services/api/cache_warm.py`, new deps (`pdfplumber`, `openpyxl`, optionally `pandas`) | Warmer downloads & normalises PLF 2026 mission ceilings; outputs CSV + `.meta.json`. |
| **DI-02** | Create dbt source/staging models for PLF ceilings and integrate into semantic layer (`stg_plf_2026_ceilings`, downstream marts). | 2 | High | `warehouse/models/staging/`, new source config | dbt ingest succeeds; downstream marts can reference PLF ceilings; `dbt build/test` stays green. |
| **BL-01** | Build `fct_simulation_baseline_2026` (joins LFI 2025, PLF 2026, macro forecasts; dbt tests for totals). | 2 | High | `warehouse/models/marts/fct_simulation_baseline_2026.sql` (new) | Baseline mart combines inputs and passes dbt tests for totals/consistency. |
| **BL-02** | Surface baseline disclaimer in `/build` explaining PLF proposal assumptions. | 2 | Medium | `frontend/app/build/BuildPageClient.tsx` | Prominent UI disclaimer clarifies baseline is a proposal that may change. |
| **BE-03** | Implement AE/CP arithmetic differentiation (dimension-aware deltas, unit tests). | 3 | Medium | `services/api/data_loader.py`, tests | Scenario actions respect `dimension` flag, maintaining separate AE and CP ledgers. |
| **BE-04** | Model PLF 2026 policy levers ("année blanche", targeted ministry cuts) with verified fiscal impacts. | 3 | Medium | `services/api/policy_catalog.py`, `services/api/data_loader.py`, tests | Levers defined, applied correctly in `run_scenario`, unit tests cover impacts. |
| **FE-01** | Refactor `BuildPageClient.tsx` state management (introduce reducer/custom hooks, modular components). | 3 | Medium | `frontend/app/build/BuildPageClient.tsx` | Component decomposed; state handled via reducer/custom hooks; behaviour unchanged. |
| **FE-02** | Unify permalink generation/parsing (`scenarioId` everywhere; shared utility for `/challenges`, `/build`, share links). | 3 | Low | `frontend/lib/`, `frontend/app/challenges/page.tsx`, `frontend/app/build/BuildPageClient.tsx` | Single query parameter format; shared helpers; manual QA on permalinks. |
| **FE-03** | Implement the "Compare & Remix" UI (fully interactive `/compare` powered by `scenarioCompare`). | 3 | Low | `frontend/app/compare/ComparePageClient.tsx`, GraphQL schema | `/compare` loads two scenario IDs, renders comparison using `scenarioCompare`. |

## 3. Risks & Dependencies

- **Two-engine divergence remains** until BE-01 and BE-02 land. We expect continued inconsistencies in user-visible numbers until the fallbacks are removed.
- **Static document formats** for PLF datasets may change unexpectedly; DI-01 should include robust parsing and validation.
- **CI blind spots** will persist; once Phase 1 closes we must extend CI to run seed generation + dbt builds + integration smoke tests.

## 4. Immediate Next Actions

1. Draft implementation notes for BE-01 (warehouse query, error handling) and BE-02 (baseline loading contract).
2. ✅ 2025-09-21 — APU subsector rules codified in `dim_apu_entities` (DBT-01 delivered).
3. Prototype PLF PDF parsing locally to de-risk DI-01.
4. Establish test harness for future AE/CP dimension checks before BE-03 work begins.

Progress should always be reflected in both this document and `BACKLOG.md`.
