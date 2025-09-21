# Current Development Plan: A Prioritized Roadmap for Architectural Stability and Feature Completion

## 1.0 Executive Summary & Strategic Imperative

### 1.1 Confirmed Diagnosis: A Project Divided

A granular, line-by-line audit of the "Citizen Budget Lab" codebase confirms the central finding of the "Strategic Analysis for the 2026 French Budget Simulation" report: the project is fundamentally compromised by a critical architectural flaw. This **two-engine problem** stems from an incomplete data warehouse refactor, resulting in two parallel and inconsistent data pipelines operating simultaneously.

The first engine is the intended single source of truth: a modern data warehouse managed by dbt. The second is a legacy, file-based fallback system located within `services/api/data_loader.py`, which reads directly from flat files in the `data/cache/` directory, completely bypassing the warehouse. These two systems are not in sync. They produce divergent results, particularly in the complex, year-aware logic for mapping administrative budget codes to the international COFOG classification. The application can therefore report different figures for the same query depending on which data path is used, rendering any output unverifiable and untrustworthy.

`BACKLOG.md` and `docs/REFACTOR_PLAN.md` both flag this inconsistency as a **CRITICAL GAP**.

This audit also reveals a dangerous blind spot in the project's quality assurance process. The continuous integration (CI) pipeline, defined in `.github/workflows/ci.yml`, provides a false sense of security. While its tests for the backend, dbt models, and frontend build currently pass, they do so in isolation. These unit and component-level tests cannot detect the critical data inconsistencies arising from the architectural schism between the two data engines. The CI pipeline's "green checkmark" validates that individual components function as designed but fails to validate that the integrated system produces correct and consistent data. This explains why a fundamental data integrity flaw can coexist with a seemingly healthy CI process and underscores the necessity of the remediation plan outlined below.

### 1.2 The Strategic Imperative: Halt and Refactor

Given the confirmed severity of this architectural flaw, the primary strategic directive is unambiguous: **halt all new feature development**. Building additional functionality upon a bifurcated and unreliable data foundation introduces unacceptable risks. It will inevitably lead to compounding technical debt, user-facing data errors, and a final product that misinforms rather than educates. The immediate and sole focus of the development team must be the completion of the data warehouse refactor as outlined in `docs/REFACTOR_PLAN.md` and expanded upon in this document. This is a non-negotiable prerequisite for the project's success.

### 1.3 The Critical Path Forward

This plan lays out a clear, three-phase critical path to guide the project back to a state of architectural soundness and prepare it for future development. Each phase is composed of specific, actionable epics and tasks with clear acceptance criteria.

1. **Phase 1: Foundational Refactoring & Data Integrity.** Eliminate the two-engine problem by completing the dbt warehouse integration and purging all legacy file-based data access from the backend API.
2. **Phase 2: 2026 Baseline Implementation & Data Ingestion.** Once the data foundation is stable, ingest the official PLF 2026 data from static government documents and construct the authoritative simulation baseline within the warehouse.
3. **Phase 3: Feature Development & UI/UX Completion.** With a reliable data source in place, resume work on backend engine enhancements and frontend features, including a critical refactor of the main "Build" page.

## 2.0 Phase 1: Foundational Refactoring & Data Integrity (Immediate Priority)

This phase addresses the core technical debt that currently blocks all other progress. Its successful completion will establish the dbt warehouse as the undisputed single source of truth for all baseline and historical data, thereby ensuring the integrity of any subsequent simulation.

### 2.1 Epic: Unify Backend Data Flow (Eliminate the Second Engine)

This epic focuses on modifying the Python backend to eradicate its dependency on the legacy file-based system, forcing it to consume data exclusively from the dbt warehouse.

#### Task BE-01: Refactor `allocation_by_cofog` Resolver

- **Context:** `BACKLOG.md` correctly identifies this task as "Not Implemented" (`[ ]`). A direct inspection of `services/api/data_loader.py` confirms that the `allocation_by_cofog` function contains extensive fallback logic. This logic reads directly from `data/cofog_mapping.json` and performs in-memory aggregations, which `docs/REFACTOR_PLAN.md` explicitly states is inconsistent with the dbt models that are intended to be the source of truth.
- **Action Required:** Completely remove the fallback logic within `allocation_by_cofog`. The function must issue a clean, direct query to the `fct_admin_by_cofog` dbt model (or a derivative view) via the warehouse client.
- **Acceptance Criteria:**
  - The function no longer reads from `data/cofog_mapping.json`.
  - The function's data source is exclusively a query to the dbt warehouse.
  - Existing unit tests pass, and new tests verify the warehouse-based output.

#### Task BE-02: Refactor `run_scenario` Engine Data Source

- **Context:** The `run_scenario` engine is still wired to the legacy cache file `data/cache/lego_baseline_{year}.json`, making the engine brittle and perpetuating the data inconsistency issue.
- **Action Required:** Modify `run_scenario` to source all baseline data—specifically the amounts for all "LEGO pieces"—exclusively from the `fct_lego_baseline` dbt model. All direct JSON file reading logic must be purged.
- **Acceptance Criteria:**
  - `run_scenario` no longer opens or parses `data/cache/lego_baseline_{year}.json`.
  - The initial budget baseline for a simulation is populated via a query to the dbt warehouse.
  - Simulation logic tests in `services/api/tests/test_resolution.py` are updated and continue to pass.

### 2.2 Epic: Solidify the Semantic Layer (The Single Source of Truth)

This epic focuses on completing the dbt warehouse models so they can serve as a robust and reliable foundation for the API.

#### Task DBT-01: Implement APU Subsector Tagging

- **Context:** The "Code-to-Documentation Consistency Audit" and `BACKLOG.md` note that APU (public administration unit) subsector tagging (APUC/APUL/ASSO) is missing, and that there is "no visible implementation" in any dbt models. This functionality is a prerequisite for local government balance compliance checks performed by the simulation engine.
- **Action Required:** Develop new dbt models to ingest the necessary source data for identifying and classifying public administration units. Create a new dimension model, `dim_apu_entities`, to store this classification. Join the final fact tables with this dimension to enable filtering and aggregation by APU subsector.
- **Acceptance Criteria:**
  - New dbt models for APU subsector tagging are created and tested.
  - The warehouse can correctly answer queries grouped by APUC, APUL, and ASSO tags.
  - The local balance check logic in `run_scenario` can be wired to this new data source.

#### Task DBT-02: Verify and Finalize COFOG Mapping Logic

- **Context:** `docs/REFACTOR_PLAN.md` outlines the strategy for resolving the COFOG mapping divergence: use `tools/build_seeds.py` to generate a comprehensive CSV seed from the canonical `data/cofog_mapping.json` file. While scaffolding exists, the end-to-end flow must be rigorously validated.
- **Action Required:** Ensure `tools/build_seeds.py` produces a complete and correct seed file. Audit `dim_cofog_mapping` and `fct_admin_by_cofog` to confirm they correctly consume this seed and apply the mission/programme/year hierarchy. Add dbt tests that assert year-specific mapping logic for known edge cases.
- **Acceptance Criteria:**
  - dbt tests for `fct_admin_by_cofog` cover year-specific mapping logic.
  - A manual query of the warehouse for a known complex case matches a manually calculated value.
  - The entire dbt project builds and tests successfully (`dbt build`).

## 3.0 Phase 2: 2026 Baseline Implementation & Data Ingestion

With the architectural foundation stabilized, this phase constructs the data-driven core of the 2026 simulation. It introduces capabilities to ingest PLF 2026 data and to build the official baseline inside the warehouse.

### 3.1 Epic: Develop 2026 Data Ingestion Pipeline

This epic solves the challenge that the official PLF 2026 data is available only as static documents.

#### Task DI-01: Enhance `cache_warm.py` with Document Parsing Capabilities

- **Context:** The primary source for 2026 spending ceilings is the "Plafonds de dépenses du projet de loi de finances pour 2026" report, published as PDF with a supplementary Excel file. The current warmer is API-first and cannot parse these formats.
- **Action Required:** Extend `services/api/cache_warm.py` with functionality to download, parse, and normalize these documents. Add Python libraries such as `pdfplumber`, `openpyxl`, and (if needed) `pandas` to `services/api/requirements.txt`. Produce a normalized CSV in `data/cache/`.
- **Acceptance Criteria:**
  - New dependencies are added and documented.
  - A new warmer function successfully parses the PLF 2026 documents and outputs a structured CSV.
  - The process is idempotent and handles errors (missing files, parsing failures) gracefully.

#### Task DI-02: Create dbt Models for PLF 2026 Data

- **Context:** The CSV from DI-01 must flow into the warehouse to become part of the semantic layer.
- **Action Required:** Define a dbt source for the CSV, create a staging model `stg_plf_2026_ceilings`, and integrate the cleaned data into production models that can feed the baseline.
- **Acceptance Criteria:**
  - New dbt source and staging model for PLF 2026 data exist.
  - `dbt build` and `dbt test` succeed with the new models in place.

### 3.2 Epic: Construct and Validate the 2026 Simulation Baseline

This epic synthesizes multiple trusted sources within the warehouse to create the definitive baseline.

#### Task BL-01: Integrate Multi-Source Data to Construct Baseline

- **Context:** The baseline should combine the final voted figures from LFI 2025, the PLF 2026 spending ceilings, and consensus macroeconomic forecasts.
- **Action Required:** Develop a high-level dbt model (e.g., `fct_simulation_baseline_2026`) that joins these sources and produces an authoritative baseline dataset.
- **Acceptance Criteria:**
  - The new dbt model exists and combines the specified data sources.
  - dbt tests validate key totals and prevent regressions.

#### Task BL-02: Document Assumptions in the User Interface

- **Context:** PLF 2026 data is politically volatile. Users must understand that the baseline reflects a proposal, not enacted law.
- **Action Required:** Add a visible disclaimer to the `/build` page explaining that baseline figures are based on the government's mid-2025 proposal and are subject to change.
- **Acceptance Criteria:**
  - A disclaimer component exists in the frontend.
  - The disclaimer is visible on the main simulation page.

## 4.0 Phase 3: Feature Development & UI/UX Completion

With the foundational data architecture stabilized and the 2026 baseline implemented, this phase completes the remaining backend and frontend features required for a robust and user-friendly product.

### 4.1 Epic: Enhance Simulation Engine Capabilities

#### Task BE-03: Implement AE/CP Arithmetic Differentiation

- **Context:** The scenario DSL can differentiate between AE and CP, but the engine does not yet honor that distinction.
- **Action Required:** Update `run_scenario` to inspect the `dimension` field and apply deltas to the correct ledger (AE or CP). Add unit tests for both dimensions.
- **Acceptance Criteria:**
  - `run_scenario` applies deltas to the requested dimension.
  - New unit tests verify AE and CP behaviours.

#### Task BE-04: Model Key PLF 2026 Policy Levers

- **Context:** To remain relevant, the simulation must offer the main PLF 2026 deficit-reduction measures (e.g., "année blanche", targeted ministry cuts).
- **Action Required:** Define these levers in configuration and ensure the engine applies their fiscal consequences correctly.
- **Acceptance Criteria:**
  - New policy levers are defined.
  - `run_scenario` processes the levers accurately.
  - Unit tests cover the fiscal impact of each lever.

### 4.2 Epic: Frontend Refactoring and Feature Implementation

#### Task FE-01: Refactor `BuildPageClient.tsx` State Management

- **Context:** The component currently relies on a large number of `useState` hooks, creating maintenance issues.
- **Action Required:** Break the component into smaller sub-components and adopt `useReducer` or custom hooks to manage complex state.
- **Acceptance Criteria:**
  - The number of direct `useState` hooks in `BuildPageClient.tsx` is significantly reduced.
  - UI functionality remains intact.

#### Task FE-02: Unify Permalink Generation and Parsing

- **Context:** `/challenges` uses a `?dsl=` query parameter, whereas `/build` expects `?scenarioId=`.
- **Action Required:** Implement a unified permalink strategy (e.g., `?scenarioId=` everywhere) and refactor the frontend to use a shared utility for generating and parsing permalinks.
- **Acceptance Criteria:**
  - All user-facing scenario links use the same parameter format.
  - `/challenges` and `/build` both load scenarios via the unified strategy.

#### Task FE-03: Implement the "Compare & Remix" User Interface

- **Context:** The `/compare` page is currently a non-functional scaffold.
- **Action Required:** Build the full UI for scenario comparison, consuming the `scenarioCompare` GraphQL query and presenting side-by-side fiscal and macro impacts.
- **Acceptance Criteria:**
  - `/compare` is fully functional for selecting and comparing two scenarios.
  - Data returned from `scenarioCompare` is displayed correctly.

## 5.0 Consolidated Action Plan: Prioritized Task Ledger

| Task ID | Description | Phase | Priority | Key Files & Components | Acceptance Criteria | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **BE-01** | Refactor `allocation_by_cofog` to use warehouse exclusively | 1 | **Critical** | `services/api/data_loader.py`, `fct_admin_by_cofog` | File-based fallback removed; resolver queries dbt model only; unit tests added. | Not Started |
| **BE-02** | Refactor `run_scenario` engine to source baseline from warehouse | 1 | **Critical** | `services/api/data_loader.py`, `fct_lego_baseline` | JSON reads removed; baseline populated from warehouse; tests updated. | Not Started |
| **DBT-01** | Implement APU subsector tagging in dbt models | 1 | **High** | `warehouse/models/` | New models created and tested; API can query by APUC/APUL/ASSO; engine wired to subsector data. | Not Started |
| **DBT-02** | Verify and finalize COFOG mapping logic in dbt | 1 | **High** | `warehouse/models/marts/fct_admin_by_cofog.sql`, `tools/build_seeds.py` | dbt tests cover year-aware logic; manual QA matches expected values; `dbt build` passes. | Not Started |
| **DI-01** | Enhance `cache_warm.py` with PDF/Excel parsing | 2 | **High** | `services/api/cache_warm.py`, `services/api/requirements.txt` | PLF 2026 documents parsed into structured CSV with error handling. | Not Started |
| **DI-02** | Create dbt models for ingested PLF 2026 data | 2 | **High** | `warehouse/models/staging/` | New source and staging models exist; dbt build/test succeed. | Not Started |
| **BL-01** | Construct 2026 simulation baseline in dbt | 2 | **High** | `warehouse/models/marts/fct_simulation_baseline_2026.sql` | Baseline model combines LFI 2025, PLF 2026, macro data; dbt tests validate totals. | Not Started |
| **BL-02** | Add baseline assumption disclaimer to UI | 2 | **Medium** | `frontend/app/build/BuildPageClient.tsx` | Disclaimer visible on `/build`; copy explains PLF proposal context. | Not Started |
| **BE-03** | Implement AE/CP arithmetic differentiation in scenario engine | 3 | **Medium** | `services/api/data_loader.py` | Engine applies deltas by dimension; unit tests cover AE/CP. | Not Started |
| **BE-04** | Model key PLF 2026 policy levers in backend | 3 | **Medium** | `services/api/policy_catalog.py`, `services/api/data_loader.py` | Levers exist and affect scenarios; unit tests validate impacts. | Not Started |
| **FE-01** | Refactor `BuildPageClient.tsx` state management | 3 | **Medium** | `frontend/app/build/BuildPageClient.tsx` | State managed via reducer/custom hooks; functionality preserved. | Not Started |
| **FE-02** | Unify permalink generation and parsing logic | 3 | **Low** | `frontend/app/challenges/page.tsx`, `frontend/app/build/BuildPageClient.tsx`, `frontend/lib/` | Unified permalink utility used across app; links load scenarios consistently. | Not Started |
| **FE-03** | Implement the "Compare & Remix" UI | 3 | **Low** | `frontend/app/compare/ComparePageClient.tsx` | `/compare` page fully interactive; displays `scenarioCompare` data. | Not Started |

