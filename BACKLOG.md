### **Citizen Budget Lab — Backlog**

#### **Purpose**

-   Single source of truth for scope, grouped by milestones. Each epic links to concrete acceptance criteria (AC) and maps to the product brief in readme.md. Use labels [MVP], [MVP+], [V1], [V2], [Tech], [Data], [API], [UI], [Ops], [Docs], [QA].
-   For a detailed inventory of data sources and schemas, see `docs/DATA_MANIFEST.md`.

#### **Legend & Verification**

-   Checkboxes:
    -   `[x]` **Implemented and Verified:** Functionality exists in the code and is confirmed by tests or direct inspection.
    -   `[~]` **Partially Implemented:** Scaffolding exists, but the feature is incomplete, has known gaps, or requires refactoring.
    -   `[ ]` **Not Implemented:** The feature has not been started.
-   How to verify quickly:
    -   Run backend tests: `pytest -q` (CI also runs this via `.github/workflows/ci.yml`).
    -   Run semantic layer tests: `make dbt-build && make dbt-test`.
    -   Warm caches for local API testing: `make warm-all YEAR=2026 COUNTRIES=FR,DE,IT` then `make summary YEAR=2026`.
    -   Inspect LEGO baseline: open `data/cache/lego_baseline_2026.json` and check `meta.warning` and totals.
    -   Exercise GraphQL: start API (`uvicorn services.api.app:app --reload`) then hit GraphQL Playground (`http://127.0.0.1:8000/graphql`).

---

### **Milestone: Technical Debt & Refactoring (CURRENT PRIORITY)**

This special milestone tracks the critical, partially-completed work to address architectural inconsistencies and stabilize the application's data foundation for V1.

-   **Epic: Unify Data Flow and Complete the Warehouse Refactor** [Tech][Data][API]
    -   **Problem:** The application currently operates with **two parallel and conflicting data engines**: the intended dbt warehouse and a legacy, file-based API fallback system. This creates a high risk of data inconsistency and makes the system brittle.
    -   **Solution:** A two-phase refactoring effort was started to make the dbt warehouse the single source of truth. **This work is incomplete and must be finished.**
    -   **Detailed Plan:** For a full breakdown of the analysis and step-by-step tasks, see the canonical plan at [**docs/REFACTOR_PLAN.md**](./docs/REFACTOR_PLAN.md).
    -   **Acceptance Criteria (AC) - Verified Status:**
        -   `[x]` A `tools/build_seeds.py` script correctly generates a comprehensive COFOG mapping seed from `data/cofog_mapping.json`.
        -   `[x]` dbt models (`dim_cofog_mapping`, `fct_admin_by_cofog`) are updated to use the new seed and produce consistent COFOG aggregations.
        -   `[ ]` The `allocation_by_cofog` API resolver is refactored to use the warehouse exclusively. **(CRITICAL GAP: Still contains extensive fallback logic in `services/api/data_loader.py`).**
        -   `[x]` LEGO baseline and piece data are ingested into the dbt warehouse via `fct_lego_baseline` and `dim_lego_pieces` models.
        -   `[ ]` The `run_scenario` engine is refactored to consume its baseline data from the warehouse. **(CRITICAL GAP: Still reads directly from `data/cache/lego_baseline_{year}.json` in `data_loader.py`).**
        -   `[x]` The `run_scenario` engine's calculation logic **is repaired** to prevent double-counting and handle hierarchical inputs correctly. (Verified in `services/api/tests/test_resolution.py`).
        -   `[x]` New unit tests are added to validate the corrected simulation logic.

---

### **Milestone: MVP**

**Product outcomes:** Explore €1 with ADMIN/COFOG lenses and sources; Procurement (table+map); run simple scenarios; show EU rule lights; macro-lite deltas.

**Epics**

-   `[x]` **Data Ingestion & Provenance** [Data]
    -   `[x]` Central budget via ODS: `services/api/cache_warm.py:warm_plf_state_budget` warms mission-level snapshots and writes a `.meta.json` sidecar for provenance.
    -   `[x]` **[Refactored]** COFOG mapping: The complex, year-aware mapping logic from `data/cofog_mapping.json` is now correctly processed by `tools/build_seeds.py` into a dbt seed, making the warehouse the source of truth for this transformation.
    -   `[x]` Procurement (DECP) pipeline: `cache_warm.py:warm_decp_procurement` ingests and normalizes data into the cache.
    -   `[~]` SIRENE join: Best-effort, on-the-fly API enrichment for procurement data is implemented in `data_loader.py`, controlled by the `PROCUREMENT_ENRICH_SIRENE` environment variable. A full warehouse join is not yet implemented.
    -   `[x]` Macro series (INSEE BDM): `cache_warm.py:warm_macro_insee` fetches GDP/deflators/employment series.
    -   `[x]` Source registry: `list_sources()` reads `data/sources.json`.

-   `[~]` **Semantic Layer (dbt + DuckDB/Postgres)** [Data]
    -   **Status:** The core structure is in place, but some documented features are missing from the implementation.
    -   **Acceptance Criteria (AC):**
        -   `[x]` DuckDB or Postgres target configured via `warehouse/profiles.yml`.
        -   `[x]` dbt models for admin↔COFOG aggregates exist and are tested.
        -   `[x]` Procurement semantic views (`vw_procurement_contracts`) exist.
        -   `[ ]` APU subsector tagging (APUC/APUL/ASSO) is mentioned as a requirement but there is **no visible implementation** in any dbt models. This is a feature gap.
        -   `[x]` CI job runs `dbt build` and `dbt test` as verified in `.github/workflows/ci.yml`.

-   `[x]` **GraphQL API (Explorer & Procurement)** [API]
    -   `[x]` `allocation(year, basis, lens)` is implemented, sourcing from the warehouse for ADMIN and COFOG lenses when available.
    -   `[x]` `procurement(year, region)` is implemented with filters, sourcing from the warehouse.
    -   `[x]` `sources()` is implemented.

-   `[x]` **Scenario DSL & Engine (Mechanical)** [API]
    -   **Status:** The engine logic has been **repaired** to correctly handle hierarchical inputs (mission vs. piece), preventing double-counting. This is validated by `test_resolution.py`. The "unspecified" vs. "specified" resolution logic is implemented.
    -   **Acceptance Criteria (AC):**
        -   `[x]` JSON Schema is validated in `services/api/validation.py`.
        -   `[x]` Deterministic scenario ID is generated from a hash of the canonical DSL, tested in `test_backend.py`.
        -   `[~]` AE/CP arithmetic is supported in the DSL (`dimension` field) but the engine in `run_scenario` **does not currently differentiate** its application. This is a feature gap.
        -   `[x]` Guardrails for unknown targets and locked pieces are implemented and tested in `test_guardrails.py`.
        -   `[x]` Offsets are supported and tested in `test_offsets_local_balance.py`.

-   `[x]` **Compliance Checks** [API]
    -   `[x]` EU 3%/60% flags, Net Expenditure Rule, and Local Balance checks (`APUL`, `APUC`, `ASSO`) are all implemented in `run_scenario` and covered by tests.

-   `[x]` **Macro Kernel (Lite)** [API]
    -   `[x]` The `_macro_kernel` function exists and is wired into `run_scenario`. It can be configured via the `MACRO_IRFS_PATH` environment variable, as tested in `test_macro_irf_override.py`.

-   `[~]` **Front‑end — Full Scope (Next.js)** [UI]
    -   **Status:** More than a minimal scaffold. Key pages (`/explore`, `/procurement`, `/build`) are functional but the core `/build` page is a complex, monolithic component (`BuildPageClient.tsx`) that needs significant refactoring.
    -   **Acceptance Criteria (AC):**
        -   `[x]` Explore page with ADMIN/COFOG lenses, charts, and data tables is functional.
        -   `[x]` Procurement page with table, map, filters, and CSV export is functional.
        -   `[~]` What-if builder UI exists at `/what-if`, but it represents a legacy interaction model. The primary, more advanced builder is at `/build`.
        -   `[x]` Accessibility checks (`axe`) run in CI for key pages.

---

### **Milestone: MVP+**

**Product outcomes:** “Build your budget” with intuitive pieces (expenditure/revenue), beneficiary lens, live balance/deficit/debt/EU lights, shareable scenarios.

**Epics**

-   `[x]` **LEGO Budget Builder — Data & Config** [Data]
    -   **Status:** This data pipeline has been successfully migrated to use the reliable **Eurostat SDMX XML** API.
    -   `[x]` `data/lego_pieces.json` defines over 30 expenditure and 15 revenue pieces.
    -   `[x]` The LEGO baseline warmer (`cache_warm.py:warm_lego_baseline`) correctly fetches data from `gov_10a_exp` (expenditures) and `gov_10a_taxag` (revenues) and applies splits from `data/revenue_splits.json`.
    -   `[x]` The methodology, including the proxy for debt interest and known limitations, is accurately documented in `docs/LEGO_METHOD.md`.

-   `[x]` **LEGO Budget Builder — GraphQL API** [API]
    -   `[x]` `legoPieces`, `legoBaseline`, and `legoDistance` queries are implemented.
    -   `[x]` `BENEFICIARY` lens is implemented and correctly aggregates pieces based on weights in `lego_pieces.json`.
    -   `[x]` DSL correctly handles `piece.<id>` targets.

-   `[~]` **LEGO Budget Builder — Front-end** [UI]
    -   **Status:** A complex, single-component implementation exists at `frontend/app/build/BuildPageClient.tsx`. It fetches data, manages scenario state, executes the `runScenario` mutation, and displays results. The "Policy Workshop" is integrated.
    -   **Gaps & To-Do List:**
        -   `[~]` The component's state management (20+ `useState` hooks) is a significant liability and requires refactoring into smaller components and custom hooks.
        -   `[~]` Permalinks are inconsistent. `/challenges` uses `?dsl=<base64>` while `/build` expects `?scenarioId=<id>`. A unified approach is needed.
        -   `[ ]` Mass cards + Explain Overlay (ranked suggestions; sum‑constrained split).
        -   `[ ]` WaterfallDelta in Canvas; Sankey‑lite ribbons in Results Tray.
        -   `[ ]` A11y polish; FR/EN copy review; performance budget checks.

-   `[~]` **Compare & Remix** [UI][API]
    -   `[~]` A `scenarioCompare` query exists in the backend (`schema.py`). A basic page exists at `/compare` but is a non-functional scaffold. The feature is not user-ready.

-   `[x]` **Share Cards** [UI][Ops]
    -   `[x]` An OG image generator at `frontend/app/api/og/route.ts` creates dynamic SVG share cards based on scenario results, which is fully functional.

---

### **Milestone: V1 & V2 (Future Work)**

These milestones are planned but not yet started.

-   **Epics (V1):**
    -   `[ ]` Distributional (OpenFisca)
    -   `[~]` EU Comparisons (A basic page exists at `/compare-eu`, but full functionality is pending).
    -   `[~]` Classroom Mode (A basic challenges page exists at `/challenges`, but full classroom functionality is pending).
-   **Epics (V2):**
    -   `[ ]` Macro Priors & Uncertainty
    -   `[ ]` Local Finance Module