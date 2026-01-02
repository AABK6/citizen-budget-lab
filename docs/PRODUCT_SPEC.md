# Citizen Budget Lab — Product Specification

## 1. Context: The 2026 Impasse

**Situation:** On January 1st, 2026, France entered a "Special Law" regime following the rejection of the 2026 Budget Bill. The State operates on a provisional basis, but the structural deficit has drifted to **5.0% of GDP** (approx. €149bn).

**Vision:** Citizen Budget Lab opens a "Session Extraordinaire Citoyenne". In the absence of a parliamentary majority, it empowers citizens to take the seat of the legislator, explore the accounts, and propose a credible path back to sustainability (or assume the deficit).

**Purpose:** De-polarize the debate by making trade-offs tangible. Show that "balancing the books" requires either massive savings or new revenues, and that every choice has a social or economic cost.

**Method:** It aggregates transparent, sourced data; lets users adjust spending and taxes; and shows the accounting, rule‑of‑thumb macro, and (V1) distributional impacts with clear assumptions and uncertainty.

## 2. Key Features & User Journeys

### 2.1. Explore €1

-   **Job:** Understand where public money goes (Total: €492bn).
-   **Features:** Navigate spending by administrative lens (missions/programmes) and functional lens (COFOG); always with totals, shares, trends, and sources. Includes interactive sunburst and treemap visualizations, plus data tables.

### 2.2. Who Gets Paid? (Procurement)

-   **Job:** See which companies and organizations receive public contracts.
-   **Features:** A map and table view of procurement recipients, filterable by sector, size, and geography. Includes data quality flags and links to sources.

### 2.3. The Build Page: Playground ↔ Workshop

This is the core interactive feature of the application, allowing users to build their own budget scenarios. It is designed around a **dual-path** model: users can start with high-level goals or with specific policies.

#### Core Concepts

*   **Mission (admin mass):** A high-level administrative category shown in the treemap (mission IDs like `M_ADMIN`). COFOG remains the functional lens and can be toggled when the lens switcher exposes it.
*   **Piece:** A granular, user-friendly budget item (e.g., "Teachers and schools").
*   **Levers:** Concrete, named policy reforms with fixed, pre-estimated budgetary impacts (e.g., "Repeal 2023 Pension Reform").
*   **Macro Trajectory:** A dynamic chart showing the impact of reforms on the Deficit (% GDP) and Real Growth over 4 years (2026–2029).

#### User Journeys

1.  **Goal-First (Playground):** A user starts by adjusting the dials for high-level missions (e.g., "Decrease Defense spending by €6B"). The UI shows this as an "unspecified" target. The user is then prompted to select from a list of policy levers to account for the change.
2.  **Policy-First (Workshop):** A user selects one or more specific reforms from the Policy Workshop. The application automatically calculates the impact on the relevant missions (default admin lens) and updates the budget visualization.

#### Page Layout & Components

-   **Three-Column Layout:**
    *   **Left Panel (Spending):** Lists spending categories (missions, admin lens). Clicking a category expands a detailed view with underlying pieces and relevant policy reforms.
    *   **Center Panel (Canvas):** An interactive treemap visualizes the budget missions by default. Below are charts showing the scenario's impact on the deficit, debt, and economic growth.
    *   **Right Panel (Revenues):** Lists revenue categories with controls for adjustments.
-   **Baseline Transparency:** The "Current deficit" stat card and the deficit chart display the absolute baseline deficit (normalized to **5.0% of GDP** in 2026) with deltas layered on top. Users start with the "drift" scenario and must actively reform to change the trajectory.
-   **Top HUD Bar:** A persistent header provides global feedback: the Macro Trajectory charts, EU compliance lights, year selector, and scenario controls (Run, Reset, Undo/Redo).
-   **Lens Switcher:** A toggle in the center panel allows users to re-color the treemap visualization based on different perspectives (e.g., by mission, by COFOG, by reform family).

## 3. Scope & Roadmap

-   **MVP:** Explorer, procurement, mechanical scenarios, EU lights, macro‑lite.
-   **MVP+:** LEGO Budget Builder (the core of the `/build` page), beneficiary lens, permalinks/exports.
-   **V1:** Distributional analysis (OpenFisca), EU comparisons, classroom mode.
-   **V2:** Macro priors with uncertainty bands, local finance module.
-   **Future:** Integration with precise microsimulation engines (e.g., OpenFisca for full tax-benefit system) and advanced macro-econometric models for rigorous impact assessment.

For a detailed, task-oriented breakdown, see `BACKLOG.md`.
