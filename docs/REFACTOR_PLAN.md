# Refactoring Plan: Unifying the Data Flow & Repairing the Simulation Engine

**Date:** 2025-09-08

## 1. Current State Analysis & Findings

A thorough investigation of the application's data flow and simulation engine has revealed several critical issues that compromise the project's robustness and maintainability. The core problem is a divergence between the intended architecture (a robust dbt warehouse as a single source of truth) and the current implementation, which relies on inconsistent fallbacks and contains flawed simulation logic.

### Finding 1: Two Inconsistent "Reporting Engines"

The application has two parallel systems for aggregating and reporting baseline budget data:

1.  **The dbt Warehouse:** The intended "semantic layer," which reads from cached data and performs transformations in a tested, version-controlled environment.
2.  **The API Fallback Logic:** Within `services/api/data_loader.py`, numerous functions contain fallback logic that reads directly from CSV and JSON files, bypassing the warehouse.

This has led to a critical **data inconsistency**:

*   **COFOG Mapping Divergence:** The dbt models use a simplified, mission-level CSV for mapping budgets to the COFOG classification. The API fallback uses a much more complex, year-and-programme-aware logic from a `cofog_mapping.json` file. This means the application will report **different numbers for the same query**, depending on whether the warehouse is available or not.

### Finding 2 (RESOLVED): The Simulation Engine was Logically Flawed

#### **Finding 2 (RESOLVED): The Simulation Engine was Logically Flawed**

The initial analysis for this refactoring plan identified a critical flaw in the `run_scenario` engine, where hierarchical user inputs (e.g., adjusting a "mass" and a "piece" within it) would be double-counted.

**Status:** This issue has been **fixed**. The engine's core logic in `services/api/data_loader.py` was re-architected to correctly implement "Resolution," distinguishing between high-level "unspecified" targets and "specified" changes. The corrected logic is validated by unit tests in `services/api/tests/test_resolution.py`.

### Finding 3: Brittle Data Dependencies

The simulation engine is critically dependent on the existence of "warmed" cache files (e.g., `data/cache/lego_baseline_{year}.json`) that are not tracked in git. If these files are not generated via the `make warm-all` command, the engine fails, not because of a logical bug, but because its data inputs are missing. This makes the development and deployment process fragile.

## 2. Recommended Strategy: The "Hybrid, Clean-Boundary" Approach

To address these issues in a way that is **quick, simple, and robust**, we will adopt a hybrid approach. This strategy uses the right tool for the right job, focusing our efforts on fixing the actual problems without undertaking a costly and high-risk rewrite of the entire system.

1.  **The Reporting & Analytics Engine (dbt):** The dbt warehouse will be solidified as the **single source of truth for all baseline and historical data**. Its role is to provide clean, consistent, and performant aggregations.
2.  **The Simulation & Forecasting Engine (Python):** The simulation logic will remain in Python, which is better suited to its procedural and complex nature. However, it will be refactored to **consume its inputs exclusively from the dbt warehouse**, not from loose files.

This creates a clean, reliable boundary between the two engines, ensuring the simulation always starts from a consistent and trusted set of data.

## 3. Detailed Development Plan

### Phase 1: Build a Robust Foundation (Prerequisite for a working engine)

*   **Objective:** Create a single, reliable source of truth for all baseline data that the simulation engine will consume.

*   **Tasks:**
    1.  **Fix COFOG Inconsistency:**
        *   `[COMPLETED]` **Fix COFOG Inconsistency:** (The `tools/build_seeds.py` script and updated dbt models exist). Create a new script at `tools/build_seeds.py` that reads `data/cofog_mapping.json` and generates a comprehensive CSV seed (`warehouse/seeds/mapping_state_to_cofog.csv`) that includes `source`, `year`, and `programme_code` columns.
        *   Update the dbt models (`dim_cofog_mapping`, `fct_admin_by_cofog`) to use this rich seed data and correctly implement the year/programme/mission fallback logic.
        *   `[PLANNED]` **Refactor `allocation_by_cofog`:** (The API fallback logic still exists and needs to be removed). Refactor the `allocation_by_cofog` function in `data_loader.py` to *only* query the warehouse, removing the inconsistent fallback logic.
    2.  **Bring LEGO Data into the Warehouse:**
        *   `[COMPLETED]` **Bring LEGO Data into the Warehouse:** (The `fct_lego_baseline` and `dim_lego_pieces` dbt models exist). Create new dbt sources and models to ingest `lego_pieces.json` and the `lego_baseline_{year}.json` cache files.
        *   This will produce `dim_lego_pieces` and `fct_lego_baseline` models, making the core simulation dataset a queryable, versioned, and tested part of the semantic layer.

### Phase 2: Repair and Refactor the Simulation Engine in Python

*   **Objective:** Re-architect the core of `run_scenario` to correctly handle hierarchical changes and provide robust feedback.

*   **Tasks:**
    1.  `[PLANNED]` **Connect Engine to Foundation:** Modify `run_scenario` to source all its baseline data (LEGO amounts, GDP, etc.) exclusively from the new dbt models built in Phase 1 via the `warehouse_client`.
    2.  `[COMPLETED]` **Implement "Resolution" Logic (Simplified):**
        *   Re-architect the core calculation loop in `run_scenario` to distinguish between high-level "unspecified" changes (from `mission.*` targets) and "specified" changes (from `piece.*` or policy lever targets).
        *   The final deficit impact will be the sum of these two buckets, preventing the double-counting error and aligning the engine with the product specification's "Resolution Meter" concept.
    3.  **Add Explicit Validation and Warnings:**
        *   Add a warning to the API response if a `piece` is used in a simulation but is missing its required COFOG mapping, making the macro model's failure explicit.
    4.  **Write Targeted Unit Tests:**
        *   Add new `pytest` tests to verify the corrected logic, including cases for hierarchical inputs and missing mappings.

### Implementation notes, invariants & risks

These notes capture important constraints and a minimal contract to avoid regressions while implementing the plan.

- Extend, don't duplicate: the repository already contains `tools/build_seeds.py`. Extend that script to emit the richer `mapping_state_to_cofog.csv` seed (add columns such as `source`, `year`, `programme_code`, `mission_code`, `cofog_code`, `weight`) instead of creating a second, separate script.
- Seed vs runtime JSON: prefer generating deterministic, testable CSV seeds (from `data/cofog_mapping.json` and warmed LEGO outputs) which dbt can version/control, rather than relying on ad-hoc JSON parsing at runtime.
- Invariants for the simulation "resolution" logic (must be enforced by tests):
  1. Baseline mission totals are authoritative: mission_total == sum(all pieces under mission) (allow small epsilon for rounding).
 2. Specified piece changes only affect those pieces.
 3. Unspecified mission mass = mission_change - sum(specified_piece_changes_for_that_mission).
 4. Final change = sum(specified_piece_changes) + sum(unspecified_masses). This prevents double-counting.
- Missing mapping behaviour: when a `piece` lacks a COFOG mapping the API must:
  - still compute budget deltas where possible,
  - include a clear warning in the simulation response describing which pieces lack mappings,
  - treat macro impact as "unknown" for that piece (do not silently report zero impact).
- Schema/qualifier brittleness: make `warehouse_client._qual_name()` tolerant (try plain schema names `staging`, `dim`, `fact`, `vw` as well as `main_*`) and add unit tests that mock `information_schema` rows.

### Prioritized, actionable next steps (small, testable increments)

1) Quick wins (1–2 days):
    - Update `tools/build_seeds.py` to emit the richer mapping seed and add a unit test asserting produced columns.
    - Make the warmer write `produced_columns` into each `.meta.json` sidecar so downstream code can assert the contract.
    - Add a unit test for `warehouse_client.table_counts()` and for `_qual_name()` (we already fixed a bug here; codify it).

2) Medium tasks (3–7 days):
    - Update dbt `dim_cofog_mapping` and `fct_admin_by_cofog` to consume the new seed and implement year/programme/mission fallback logic. Run dbt compile and update tests if necessary.
    - Refactor `services/api/data_loader.allocation_by_cofog` to query the warehouse only. Keep a short-lived comparison test that validates parity between old fallback logic and the new warehouse-backed implementation on warmed caches.

3) Simulation engine (5–10 days, with tests):
    - Implement the resolution algorithm in `run_scenario` following the invariants above. Add unit tests for hierarchical inputs, piece-only inputs, mission-only inputs, and missing mappings.
    - Replace any direct JSON/CSV reads in the engine with `warehouse_client` queries to `fct_lego_baseline` / `dim_lego_pieces` (created in Phase 1).

4) CI and docs (1–2 days):
    - Ensure CI runs seed generation (or a warmed minimal dataset) before dbt compile/tests. Add a lightweight smoke check that asserts required warmed seeds exist or are generated.
    - Add a short developer doc (`docs/DEVELOPER_DATA_CONTRACT.md`) listing required standardized columns for each warmed artifact and how to regenerate them locally.

---

End of plan updates.
