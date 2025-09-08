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

### Finding 2: The Simulation Engine is Logically Flawed

The core simulation engine in `run_scenario` is not currently fit for a V1 release. Even when all data inputs are present, its calculations are incorrect.

*   **Double-Counting Flaw:** The engine cannot handle hierarchical user inputs. If a user adjusts a high-level "mass" (e.g., `mission.education`) and also a specific "piece" within it (e.g., `piece.ed_schools_staff_ops`), the engine incorrectly adds the two changes together, leading to an inflated final number.
*   **Silent Macro Failures:** The macroeconomic model fails silently if a budget "piece" is missing its required COFOG mapping in the configuration files. This results in a simulation that correctly changes the budget but shows zero economic impact, confusing the user.

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
        *   Create a new script at `tools/build_seeds.py` that reads `data/cofog_mapping.json` and generates a comprehensive CSV seed (`warehouse/seeds/mapping_state_to_cofog.csv`) that includes `source`, `year`, and `programme_code` columns.
        *   Update the dbt models (`dim_cofog_mapping`, `fct_admin_by_cofog`) to use this rich seed data and correctly implement the year/programme/mission fallback logic.
        *   Refactor the `allocation_by_cofog` function in `data_loader.py` to *only* query the warehouse, removing the inconsistent fallback logic.
    2.  **Bring LEGO Data into the Warehouse:**
        *   Create new dbt sources and models to ingest `lego_pieces.json` and the `lego_baseline_{year}.json` cache files.
        *   This will produce `dim_lego_pieces` and `fct_lego_baseline` models, making the core simulation dataset a queryable, versioned, and tested part of the semantic layer.

### Phase 2: Repair and Refactor the Simulation Engine in Python

*   **Objective:** Re-architect the core of `run_scenario` to correctly handle hierarchical changes and provide robust feedback.

*   **Tasks:**
    1.  **Connect Engine to Foundation:** Modify `run_scenario` to source all its baseline data (LEGO amounts, GDP, etc.) exclusively from the new dbt models built in Phase 1 via the `warehouse_client`.
    2.  **Implement "Resolution" Logic (Simplified):**
        *   Re-architect the core calculation loop in `run_scenario` to distinguish between high-level "unspecified" changes (from `mission.*` targets) and "specified" changes (from `piece.*` or policy lever targets).
        *   The final deficit impact will be the sum of these two buckets, preventing the double-counting error and aligning the engine with the product specification's "Resolution Meter" concept.
    3.  **Add Explicit Validation and Warnings:**
        *   Add a warning to the API response if a `piece` is used in a simulation but is missing its required COFOG mapping, making the macro model's failure explicit.
    4.  **Write Targeted Unit Tests:**
        *   Add new `pytest` tests to verify the corrected logic, including cases for hierarchical inputs and missing mappings.
