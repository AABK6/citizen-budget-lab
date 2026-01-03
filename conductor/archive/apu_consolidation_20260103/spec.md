# Specification: Consolidation APU & Refonte des Leviers (Retraites & Santé)

## Problem Statement
The budget simulation is currently disconnected between the "Lego Pieces" (baseline data) and the "Policy Levers" (reforms). 
The Treemap shows full APU masses (e.g., 367Bn€ for Pensions), but the reform levers are mapped to narrow State Budget missions (e.g., M_SOLIDARITE), making them ineffective on the large aggregates.

## Goal
Ensure that all structural reforms for Pensions and Health impact the correct, massive aggregates (ASSO scope) instead of just the State budget residual.

## Technical Changes

### 1. Policy Levers Mapping Alignment
- Redirect all pension-related reforms (Age, indexation) to target `M_PENSIONS`.
- Redirect all health-related reforms (ONDAM, copays) to target `M_HEALTH`.
- Standardize mission naming between `policy_levers.yaml` and `lego_pieces.json` (e.g., `M_SOLIDARITY` with 'Y').

### 2. Validation
- Verify that the simulation balance (deficit) reflects the large-scale impacts of these reforms.
- Ensure no double counting by verifying that these missions don't overlap with other redirected levers.

## Success Criteria
- Activating a pension reform (e.g., +1 year of legal age) reduces the `M_PENSIONS` mass in the Treemap by several billion euros.
- Activating an ONDAM reform impacts the `M_HEALTH` mass.
- The overall public deficit remains consistent with national accounting standards.
