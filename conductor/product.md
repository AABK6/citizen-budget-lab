# Initial Concept
Citizen Budget Lab is an interactive web application designed to democratize understanding of the French state budget during the 2026 political impasse. Its sole focus is to allow citizens to simulate budget scenarios and express their preferences when traditional parliamentary processes are stalled.

# Product Guide

## Target Users
*   **General Public and Citizens:** Empowering individuals to take the seat of the legislator and construct their own budget.
*   **Journalists and Media:** Providing a credible, data-backed sandbox to analyze and report on fiscal trade-offs.

## Goals
*   **Gather Public Preferences:** To serve as a "Session Extraordinaire Citoyenne," collecting robust data on what citizens actually want when faced with real fiscal constraints.
*   **De-polarize the Debate:** By making trade-offs tangible (e.g., funding X requires cutting Y or raising tax Z), the tool aims to ground political discussion in reality.

## Key Features
*   **The "Build" Page (Core):** The central and currently only active feature. It allows users to:
    *   **Adjust Budget "Masses":** Modify high-level spending and revenue categories (Playground mode).
    *   **Apply Policy Levers:** Select specific, priced reforms (Workshop mode). Both Spending and Revenue drawers are now fully aligned, featuring consistent "Reform Cards" with rich metadata:
        *   **Multi-year Trajectories:** See how impacts evolve from 2026 to 2030.
        *   **Implementation Risks:** View "Points de vigilance" describing political and social pushbacks.
        *   **Authoritative Sourcing:** Every reform is linked to reputable sources (e.g., Cour des Comptes, INSEE, Institut des Politiques Publiques).
        *   **Contextual Filtering:** The "Mesures disponibles" section dynamically filters reforms based on the selected budget category (Spending mission or Revenue type).
    *   **Visualize Impacts:** See real-time feedback on the deficit, debt, and economic growth.
*   **LEGO Methodology:** A rigorous backend system that maps user choices to official national accounts (Eurostat/Insee) to ensure credibility.

## Call to Action
*   **Submit to Consensus:** Users finalize their budget to contribute to a collective dataset of citizen preferences.
*   **Share Scenario:** A secondary mechanism to generate permalinks and drive viral engagement.

## Constraints & Omissions
*   **Scope:** The project is strictly limited to the simulation engine (`/build`). Features like the "Explorer" or "Procurement" map are out of scope for the current release.
*   **EU Rules:** Explicit modeling or enforcement of EU fiscal rules is excluded to focus on domestic preference expression.
