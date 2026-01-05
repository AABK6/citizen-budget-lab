# Track Plan: Harmonize Policy Catalog with Administrative Missions

This plan follows the Conductor methodology: 80% test coverage, per-task commits, and phase-level verification.

## Phase 1: Schema & Backend Infrastructure [checkpoint: d85cdf9]
Goal: Upgrade the policy catalog schema and API to support administrative missions and rich metadata.

- [x] **Task: Update Policy Lever Schema** (1ed9559)
    - [ ] Sub-task: Modify `schemas/policy_levers.schema.json` to include `missionMapping` (required), `multiYearImpact`, `pushbacks`, and `distributionalFlags`.
    - [ ] Sub-task: Update `services/api/models.py` (or relevant Pydantic models) to reflect the new schema.
- [x] **Task: Enhance API for Mission-Based Resolution** (ee6f264)
    - [ ] Sub-task: Write tests in `services/api/tests/` to verify that `runScenario` correctly uses `missionMapping` when the `ADMIN` lens is active.
    - [ ] Sub-task: Update `services/api/data_loader.py` to handle the new rich metadata and ensure it's returned in the GraphQL response.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Schema & Backend Infrastructure' (Protocol in workflow.md)**

## Phase 2: "Policy Researcher" Tooling [checkpoint: f26e455]
Goal: Develop the automated tool to assist in verifying and enriching policy levers.

- [x] **Task: Develop Base Research Script** (ff23f6e)
    - [ ] Sub-task: Create `tools/research_policy.py` with basic search and extraction logic.
    - [ ] Sub-task: Write unit tests for the extraction logic using mock search results.
- [x] **Task: Implement Metadata Synthesis** (711479c)
    - [ ] Sub-task: Integrate LLM capability to synthesize search results into `pushbacks`, `multiYearImpact`, and `missionMapping` suggestions.
    - [ ] Sub-task: Add "Source Citation" requirement to the tool's output.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: "Policy Researcher" Tooling' (Protocol in workflow.md)**

## Phase 3: Catalog Audit & Enrichment [checkpoint: b987770]
Goal: Systematically update the existing catalog using the research tool.

- [x] **Task: Audit Existing Levers** (44ae3ba)
    - [x] Sub-task: Batch 1: PLF 2026 Major Amendments (Completed: 10/10 researched)
    - [x] Sub-task: Batch 2: Pensions & Social Security (Completed: 100% researched)
    - [x] Sub-task: Batch 3: Remainder of Catalog (Completed: 100% researched)
- [x] **Task: Validate Enriched Catalog** (44ae3ba)
    - [ ] Sub-task: Run `tools/validate_policy_catalog.py` to ensure the new catalog adheres to the upgraded schema and that all mappings are consistent.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Catalog Audit & Enrichment' (Protocol in workflow.md)**

## Phase 4: UI Surfacing [checkpoint: 3d9ac36]
Goal: Display the new rich metadata to the user in the Builder interface.

- [x] **Task: Update Frontend GraphQL Queries** (f67933b)
    - [x] Sub-task: Update `frontend/graphql/` queries to fetch the new fields (`pushbacks`, `multiYearImpact`).
    - [x] Sub-task: Run `npm run codegen` in `frontend/` to regenerate types.
- [x] **Task: Enhance Reform Detail Component** (efef865)
    - [x] Sub-task: Update the UI components to display implementation risks and multi-year impact notes.
    - [x] Sub-task: Write a simple smoke test (or use Storybook) to verify the new fields are visible.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4: UI Surfacing' (Protocol in workflow.md)**
