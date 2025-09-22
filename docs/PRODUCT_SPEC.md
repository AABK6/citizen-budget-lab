# Citizen Budget Lab — Product Specification

## 1. Vision & Purpose

**Problem:** Public debate on budgets is polarized and opaque. Citizens rarely see who spends what, for what outcomes, and what trade‑offs reforms imply.

**Solution:** Citizen Budget Lab is an open, neutral, and interactive web app to understand how public money is used in France and to experiment with building a balanced, realistic budget. It aggregates transparent, sourced data; lets users adjust spending and taxes; and shows the accounting, rule‑of‑thumb macro, and (V1) distributional impacts with clear assumptions and uncertainty.

**Impact:** Improve understanding and trust by making trade‑offs tangible and sourced. Enable better media coverage and civic education; give policymakers a neutral, auditable sandbox.

## 2. Key Features & User Journeys

### 2.1. Explore €1

-   **Job:** Understand where public money goes.
-   **Features:** Navigate spending by administrative lens (missions/programmes) and functional lens (COFOG); always with totals, shares, trends, and sources. Includes interactive sunburst and treemap visualizations, plus data tables.

### 2.2. Who Gets Paid? (Procurement)

-   **Job:** See which companies and organizations receive public contracts.
-   **Features:** A map and table view of procurement recipients, filterable by sector, size, and geography. Includes data quality flags and links to sources.

### 2.3. The Build Page: Playground ↔ Workshop

This is the core interactive feature of the application, allowing users to build their own budget scenarios. It is designed around a **dual-path** model: users can start with high-level goals or with specific policies.

#### Core Concepts

*   **Mass:** A high-level, functional budget category (e.g., Health, Defense), corresponding to COFOG classifications.
*   **Piece:** A granular, user-friendly budget item (e.g., "Teachers and schools").
*   **Levers:** Concrete, named policy reforms with fixed, pre-estimated budgetary impacts (e.g., "Repeal 2023 Pension Reform").
*   **Resolution Meter:** A key UX element that shows how much of a user's high-level budget target (the "what") has been explained by concrete policy levers (the "how").

#### User Journeys

1.  **Goal-First (Playground):** A user starts by adjusting the dials for high-level masses (e.g., "Decrease Defense spending by €6B"). The UI shows this as an "unspecified" target. The user is then prompted to select from a list of policy levers to account for the change.
2.  **Policy-First (Workshop):** A user selects one or more specific reforms from the Policy Workshop. The application automatically calculates the impact on the relevant masses and updates the budget visualization.

#### Page Layout & Components

-   **Three-Column Layout:**
    *   **Left Panel (Spending):** Lists spending categories (masses). Clicking a category expands a detailed view with underlying pieces and relevant policy reforms.
    *   **Center Panel (Canvas):** An interactive treemap visualizes the budget masses. Below are charts showing the scenario's impact on the deficit, debt, and economic growth.
    *   **Right Panel (Revenues):** Lists revenue categories with controls for adjustments.
-   **Baseline Transparency Update (Sept 2025):** The "Current deficit" stat card and the deficit chart now display the absolute baseline deficit (≈ €150 bn in 2026) with deltas layered on top. Users no longer see a zeroed starting point when no reforms are applied; instead they get an immediate sense of the Treasury’s blank-page challenge.
-   **Top HUD Bar:** A persistent header provides global feedback: the Resolution Meter, EU compliance lights, year selector, and scenario controls (Run, Reset, Undo/Redo).
-   **Lens Switcher:** A toggle in the center panel allows users to re-color the treemap visualization based on different perspectives (e.g., by budget mass, by reform family).

## 3. Scope & Roadmap

-   **MVP:** Explorer, procurement, mechanical scenarios, EU lights, macro‑lite.
-   **MVP+:** LEGO Budget Builder (the core of the `/build` page), beneficiary lens, permalinks/exports.
-   **V1:** Distributional analysis (OpenFisca), EU comparisons, classroom mode.
-   **V2:** Macro priors with uncertainty bands, local finance module.

For a detailed, task-oriented breakdown, see `BACKLOG.md`.
