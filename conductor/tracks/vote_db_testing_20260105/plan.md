# Track Plan: Voters' Preference Database Testing

This plan follows the Conductor methodology: TDD (Red/Green/Refactor), 80% test coverage, and per-task commits.

## Phase 1: Environment & SQLite Validation
Goal: Ensure the test environment is ready and validate the base SQLite implementation used for development.

- [x] **Task: Setup PostgreSQL Test Container** (d7df850)
    - [ ] Sub-task: Add a `test-db` service to `docker-compose.yml` or create a standalone `docker-compose.test.yml`.
    - [ ] Sub-task: Update `pytest.ini` or create a `conftest.py` to handle test database lifecycle.
- [ ] **Task: SQLite Scenario CRUD Tests**
    - [ ] Sub-task: Write failing tests in `services/api/tests/test_votes_store.py` for `save_scenario` and `get_scenario` using SQLite.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass.
- [ ] **Task: SQLite Vote CRUD & Summary Tests**
    - [ ] Sub-task: Write failing tests for `add_vote` and `summary` using SQLite.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Environment & SQLite Validation' (Protocol in workflow.md)**

## Phase 2: PostgreSQL Integration
Goal: Verify the production-target PostgreSQL implementation.

- [ ] **Task: PostgreSQL Scenario Integration**
    - [ ] Sub-task: Write failing tests for `PostgresVoteStore.save_scenario` and `get_scenario`.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass against a real PG instance.
- [ ] **Task: PostgreSQL Vote Integration**
    - [ ] Sub-task: Write failing tests for `PostgresVoteStore.add_vote` and `summary`.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: PostgreSQL Integration' (Protocol in workflow.md)**

## Phase 3: Concurrency & Resilience
Goal: Ensure the database handles real-world stress and edge cases.

- [ ] **Task: Concurrency Testing for Votes**
    - [ ] Sub-task: Write a test using `threading` or `asyncio.gather` to simulate 50+ concurrent votes for the same scenario.
    - [ ] Sub-task: Verify `vote_count` in `vote_stats` is exactly correct (atomic increments).
- [ ] **Task: Data Integrity & Constraints**
    - [ ] Sub-task: Write tests to verify foreign key constraints (cannot vote for non-existent scenario).
    - [ ] Sub-task: Write tests for "On Conflict" behavior in `save_scenario`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Concurrency & Resilience' (Protocol in workflow.md)**

## Phase 4: Migrations & Analytics
Goal: Verify data survives upgrades and supports reporting.

- [ ] **Task: Migration Integrity Test**
    - [ ] Sub-task: Create a test that: 1. Insets data, 2. Executes `apply_migrations`, 3. Verifies data is still there.
- [ ] **Task: Analytics Verification**
    - [ ] Sub-task: Write tests for complex `summary` scenarios (multiple scenarios, different vote counts).
    - [ ] Sub-task: Verify that `vote_stats` remains in sync with the `votes` table.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4: Migrations & Analytics' (Protocol in workflow.md)**
