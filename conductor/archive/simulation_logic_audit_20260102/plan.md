# Track Plan: Simulation Logic & Interaction Audit

**Goal:** Ensure absolute arithmetic precision and robust state consistency in the simulation engine. Specifically, address issues where toggling reforms is inconsistent and refine the interplay between "Mass Targets" (Sliders) and "Policy Levers" (Reforms).

**Core Logic Requirement:** "Clicking a reform should first fill the target (e.g., -10%), and only if it goes over, compute the excess."

## Phase 1: Diagnosis & Reproduction
Goal: Reproduce the reported bugs and document current behavior.

- [x] **Task: Create Reproduction Suite**
    - [x] Create a new test file `services/api/tests/test_simulation_interactions.py`.
    - [x] **Case 1: Reform Toggle Consistency:** Verified.
    - [x] **Case 2: Slider vs Reform Conflict:** Verified.
    - [x] **Case 3: Reform then Slider:** Verified.

## Phase 2: Engine Refactoring (The "Bucket Filling" Logic)
Goal: Implement the "Reform fills Target" logic in the resolution engine.

- [x] **Task: Design Resolution Logic**
    - [x] Modify `services/api/data_loader.py`.
    - [x] Concept: `Unspecified` = 0 if `Specified` exceeds `Target`.

- [x] **Task: Implement Logic in API**
    - [x] Update the `runScenario` resolver to implement this "filling" math.
    - [x] Ensure `unspecified_amount` is calculated dynamically based on (Target - Reforms).

## Phase 3: State Consistency & Precision
Goal: Ensure no floating point drift or "sticky" state.

- [x] **Task: Backend Arithmetic Review**
    - [x] Verified order invariance (Passes separate).
    - [x] Verified toggle consistency.

## Phase 4: Verification
- [x] **Task: Run Reproduction Suite**
    - [x] Verify all tests from Phase 1 now pass with the new logic.
    - [x] Verify "Toggle On/Off" returns to exact 0 diff.
    - [x] Verify "Slider -10% + Reform" logic behaves as "Filling".
