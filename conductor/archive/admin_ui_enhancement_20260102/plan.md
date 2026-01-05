# Track Plan: Admin UI Enhancement

**Goal:** Transform the Policy Catalog Admin into a professional "Policy Back-Office" tailored for experts and editors. It must facilitate deep editing of complex data (trajectories, sources) while providing auditing tools to maintain data integrity.

**Constraints:**
-   **Users:** Policy experts (semi-technical). UI must be robust and helpful.
-   **Persistence:** File-based (`policy_levers.yaml`). No database.
-   **Safety:** **Visual Diff** required before saving.

## Phase 1: UX/UI Architecture
Goal: Define the layout and interaction model.

- [x] **Task: Design Master-Detail Layout** (Validated with User)
    -   **Left Panel (Auditor):** Filterable/Sortable list.
    -   **Right Panel (Editor):** Deep editing form.
    -   **Bottom/Overlay (Safety):** Visual Diff.

## Phase 2: The Auditor (List View)
Goal: Help users find *what* to fix.

- [x] **Task: Enhanced Data Grid**
    -   [x] Implement sortable columns (ID, Label, Impact, Family).
    -   [x] Add "Health Indicators" (Missing Source, Impact Discrepancy).
    -   [x] Add Faceted Filters.

## Phase 3: The Editor (Detail View)

Goal: Make deep editing safe and efficient.



- [x] **Task: Rich Field Components**

    - [x] **Source Manager:** List view for sources with "Add URL", "Trash", and link preview.

    - [x] **Trajectory Builder:** Grid of year inputs (2026-2030) in billions.

    - [x] **Unit Testing:** Verified state management with Vitest.



## Phase 4: Safety & Persistence



Goal: Ensure no accidental data loss or corruption.







- [x] **Task: Visual Diff & Save**



    - [x] Implement a "Review Changes" modal.



    - [x] Compute a line-by-line diff between original and current YAML.



    - [x] Display the diff visually before saving.



- [x] **Task: Real-time Validation**



    - [x] Add warnings for common data quality issues (Health Indicators).



    - [x] Export components for unit testing.


