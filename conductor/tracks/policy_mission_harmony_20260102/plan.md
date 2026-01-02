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

## Phase 3: Catalog Audit & Enrichment
Goal: Systematically update the existing catalog using the research tool.

- [x] **Task: Audit Existing Levers** (16aaeae)
    - [ ] Sub-task: Run `tools/research_policy.py` on all levers in `data/policy_levers.yaml`.
    - [ ] Sub-task: Manually review and approve the suggested updates, prioritizing missing `missionMapping`.
- [ ] **Task: Validate Enriched Catalog**
    - [ ] Sub-task: Run `tools/validate_policy_catalog.py` to ensure the new catalog adheres to the upgraded schema and that all mappings are consistent.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Catalog Audit & Enrichment' (Protocol in workflow.md)**

## Phase 4: UI Surfacing
Goal: Display the new rich metadata to the user in the Builder interface.

- [ ] **Task: Update Frontend GraphQL Queries**
    - [ ] Sub-task: Update `frontend/graphql/` queries to fetch the new fields (`pushbacks`, `multiYearImpact`).
    - [ ] Sub-task: Run `npm run codegen` in `frontend/` to regenerate types.
- [ ] **Task: Enhance Reform Detail Component**
    - [ ] Sub-task: Update the UI components to display implementation risks and multi-year impact notes.
    - [ ] Sub-task: Write a simple smoke test (or use Storybook) to verify the new fields are visible.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4: UI Surfacing' (Protocol in workflow.md)**
