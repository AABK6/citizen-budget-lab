# Track Plan: Voters' Preference Database Testing

This plan follows the Conductor methodology: TDD (Red/Green/Refactor), 80% test coverage, and per-task commits.

## Phase 1: Environment & SQLite Validation
Goal: Ensure the test environment is ready and validate the base SQLite implementation used for development.

- [x] **Task: Setup PostgreSQL Test Container** (d7df850)
    - [ ] Sub-task: Add a `test-db` service to `docker-compose.yml` or create a standalone `docker-compose.test.yml`.
    - [ ] Sub-task: Update `pytest.ini` or create a `conftest.py` to handle test database lifecycle.
- [x] **Task: SQLite Scenario CRUD Tests** (c999bb3)
    - [ ] Sub-task: Write failing tests in `services/api/tests/test_votes_store.py` for `save_scenario` and `get_scenario` using SQLite.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass.
- [x] **Task: SQLite Vote CRUD & Summary Tests** (4091740)
    - [ ] Sub-task: Write failing tests for `add_vote` and `summary` using SQLite.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Environment & SQLite Validation' (Protocol in workflow.md)**

## Phase 2: PostgreSQL Integration [checkpoint: e736a54]
Goal: Verify the production-target PostgreSQL implementation.

- [x] **Task: PostgreSQL Scenario Integration** (17cbff0)
    - [ ] Sub-task: Write failing tests for `PostgresVoteStore.save_scenario` and `get_scenario`.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass against a real PG instance.
- [x] **Task: PostgreSQL Vote Integration** (a4e64b8)
    - [ ] Sub-task: Write failing tests for `PostgresVoteStore.add_vote` and `summary`.
    - [ ] Sub-task: Implement/Verify fixes to ensure tests pass.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: PostgreSQL Integration' (Protocol in workflow.md)**

## Phase 3: Concurrency & Resilience [checkpoint: 492471c]
Goal: Ensure the database handles real-world stress and edge cases.

- [x] **Task: Concurrency Testing for Votes** (c87e76c)
    - [ ] Sub-task: Write a test using `threading` or `asyncio.gather` to simulate 50+ concurrent votes for the same scenario.
    - [ ] Sub-task: Verify `vote_count` in `vote_stats` is exactly correct (atomic increments).
- [x] **Task: Data Integrity & Constraints** (929aa17)
    - [ ] Sub-task: Write tests to verify foreign key constraints (cannot vote for non-existent scenario).
    - [ ] Sub-task: Write tests for "On Conflict" behavior in `save_scenario`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Concurrency & Resilience' (Protocol in workflow.md)**

## Phase 4: Migrations & Analytics [checkpoint: 5f8b240]
Goal: Verify data survives upgrades and supports reporting.

- [x] **Task: Migration Integrity Test** (8e8cddd)
    - [ ] Sub-task: Create a test that: 1. Insets data, 2. Executes `apply_migrations`, 3. Verifies data is still there.
- [x] **Task: Analytics Verification** (352a17f)
    - [ ] Sub-task: Write tests for complex `summary` scenarios (multiple scenarios, different vote counts).
    - [ ] Sub-task: Verify that `vote_stats` remains in sync with the `votes` table.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4: Migrations & Analytics' (Protocol in workflow.md)**
