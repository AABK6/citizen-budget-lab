# Specification: Revenue Drawer Alignment & Reform Cards

## Overview
Align the "Revenue" (Recettes) drawer with the "Expenses" (Dépenses) drawer to provide a consistent and informative user experience. This involves populating revenue reforms with detailed metadata ("cards") via a deep research pipeline, establishing explicit links between revenue categories and specific reforms, and unifying the UI/UX behavior (styling, animations, and toggles).

## Functional Requirements

### 1. Research Pipeline for Revenue Reforms
- **Adaptation:** Utilize and adapt `tools/research_policy.py` to target revenue-side reforms.
- **Data Collection:** For each revenue reform, the pipeline must fetch:
    - **Metadata:** Clear descriptions and official titles.
    - **Qualitative Insights:** "Points de vigilance" (implementation risks, social/political pushback) and Pros/Cons.
    - **Contextual Links:** Citations and reputable URL links to authoritative sources for fiscal estimates (e.g., Cour des Comptes, Institut des Politiques Publiques).
- **Storage:** Update the policy catalog (likely `data/policy_levers.yaml`) with the gathered information.

### 2. Category-Reform Mapping
- **Explicit Linking:** Update `data/lego_pieces.json` or `data/policy_levers.yaml` to explicitly map revenue categories (taxes, duties) to their corresponding reforms.
- **Dynamic Display:** Ensure that clicking a revenue category in the drawer correctly populates the "Mesures disponibles" (Available measures) section with these linked reforms.

### 3. UI/UX Alignment
- **Reform Cards:** Implement "Card" components for revenue reforms that match the styling, typography, and layout of the expense reform cards.
- **Interactions:** Replicate the "Add/Remove" toggle behaviors and animations used in the Expenses drawer.
- **Visual Consistency:** Strictly adhere to the DSFR (Système de Design de l'État) patterns already established in the frontend.

## Non-Functional Requirements
- **Data Integrity:** Ensure the research pipeline output is validated against the existing schema.
- **Performance:** The addition of detailed metadata should not significantly impact the loading time of the "Build" page.

## Acceptance Criteria
- [ ] Every revenue reform in the catalog has a detailed card with description, vigilance points, and at least one authoritative source link.
- [ ] Selecting a revenue category (e.g., TVA) in the drawer displays all relevant reforms in the "Mesures disponibles" section.
- [ ] The visual style and interaction of the Revenue drawer are indistinguishable from the Expenses drawer.
- [ ] The research pipeline can be executed via a script (e.g., `make research-revenues`).

## Out of Scope
- Modification of the core simulation logic (LEGO methodology) beyond data mapping.
- Introduction of new charts or visualizations not already present in the Expenses drawer.
