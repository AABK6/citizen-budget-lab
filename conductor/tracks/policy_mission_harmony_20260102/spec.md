# Track Spec: Harmonize Policy Catalog with Administrative Missions

## Overview
This track aims to resolve the discrepancy between the frontend's administrative "Mission" lens and the Policy Catalog's predominantly functional "COFOG" lens. We will enhance the policy catalog schema, develop an automated "Policy Researcher" tool to verify impacts and suggest mappings, and systematically enrich the catalog with high-quality data, including multi-year impacts and implementation risks.

## Problem Statement
The current treemap UI and simulation feedback rely on PLF Missions (e.g., "Education", "Defense"). However, many reforms in `data/policy_levers.yaml` only have mappings to COFOG categories. When a user explores a mission, the list of available reforms is often incomplete or inaccurate. Furthermore, the fiscal impact estimates and risk notes for these reforms need rigorous verification against current 2026 budget documents.

## Objectives
1.  **Schema Evolution:** Upgrade the `policy_levers` schema to support multi-year fiscal trajectories, detailed political/social pushbacks, and distributional impact flags.
2.  **Automated Research Tooling:** Build a `tools/research_policy.py` script that uses Google Search and LLM capabilities to gather evidence for reform impacts, mission mappings, and risks.
3.  **Catalog Data Integrity:** Populate missing `missionMapping` entries for all levers and verify `fixed_impact_eur` values against external sources.
4.  **UI Enrichment:** Update the `/build` page to surface the new rich metadata (pushbacks, multi-year trajectories) to the user.

## Requirements

### Backend / Tooling
*   **Schema Update:** Modify `schemas/policy_levers.schema.json` to include:
    *   `missionMapping`: (Required) Explicit dictionary mapping mission codes to weights.
    *   `multiYearImpact`: Optional object mapping years (2026-2030) to impact values.
    *   `pushbacks`: Array of objects describing political/social implementation risks.
    *   `distributionalFlags`: Booleans indicating relevance for OpenFisca or other microsimulation tools.
*   **Research Tool (`tools/research_policy.py`):**
    *   Input: A lever ID from the catalog.
    *   Process:
        1.  Search for relevant PLF 2026 amendments and government reports.
        2.  Extract fiscal impact estimates and administrative responsibility (missions).
        3.  Summarize implementation risks/pushbacks.
    *   Output: A suggested YAML snippet to update/enrich the lever's entry in the catalog.

### Frontend
*   **Reform Details UI:** Update the component displaying reform details to show:
    *   "Mission Coverage" (which administrative missions are affected).
    *   "Implementation Risks" (pushbacks).
    *   "Future Impact" notes (multi-year).

## Technical Constraints & Considerations
*   **Data Sourcing:** All suggestions from the researcher tool MUST be accompanied by the source URL to maintain the project's "Sourced Data Mandate."
*   **Consistency:** Mission totals calculated via the new mappings must align with the warehouse's administrative baseline.
*   **Simplicity:** The initial "Researcher" tool will be a developer-facing CLI, not a public-facing feature.
