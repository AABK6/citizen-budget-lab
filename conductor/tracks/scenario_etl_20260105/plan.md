# Track Plan: Scenario ETL & Political Analytics Pipeline

This plan follows the Conductor methodology: TDD (Red/Green/Refactor), 80% test coverage, and per-task commits.

## Phase 1: ETL Foundation (The Extractor) [checkpoint: 416ee9d]
Goal: Build the logic to parse raw Scenario DSL JSON into a flat dictionary of metrics.

- [x] **Task: Create Parsing Logic** (49410ff)
    - [ ] Sub-task: Create `tools/etl/scenario_parser.py` with a function `flatten_scenario(dsl_json, meta)`.
    - [ ] Sub-task: Write unit tests verifying it correctly extracts reform amounts, mass targets, and macro stats from sample JSONs.
- [x] **Task: Dynamic Schema Generator** (7881993)
    - [ ] Sub-task: Implement logic to read `data/policy_levers.yaml` and generate the list of expected columns (e.g., `reform_<id>`).
    - [ ] Sub-task: Verify it adapts when a dummy reform is added to the catalog.
- [x] **Task: Conductor - User Manual Verification 'Phase 1: ETL Foundation' (Protocol in workflow.md)** (416ee9d)

## Phase 2: Warehouse Integration (The Loader) [checkpoint: a5921a8]
Goal: Write the flattened data into DuckDB efficiently.

- [x] **Task: DuckDB Table Management** (0576677)
    - [ ] Sub-task: Create `tools/sync_votes_to_warehouse.py` initialization logic.
    - [ ] Sub-task: Implement `create_or_alter_table` logic that checks existing columns and adds missing ones (schema evolution).
- [x] **Task: Batch Sync Logic** (6522f14)
    - [ ] Sub-task: Implement the "Incremental Load" pattern (fetch max `vote_id` from DuckDB, query Postgres/SQLite for newer votes).
    - [ ] Sub-task: Write integration tests ensuring idempotency (running twice doesn't duplicate rows).
- [x] **Task: Conductor - User Manual Verification 'Phase 2: Warehouse Integration' (Protocol in workflow.md)** (a5921a8)

## Phase 3: Automation & Proof of Concept [checkpoint: c1d4dfa]
Goal: Wire it all together and prove it answers political questions.

- [x] **Task: Make Integration** (64743ed)
    - [ ] Sub-task: Add `sync-votes` target to `Makefile`.
- [x] **Task: Analytical Proof** (7d11a48)
    - [ ] Sub-task: Create a query script `tools/analyze_political_clusters.py` that asks a complex question (e.g., "Average pension cut for users who increased education spending").
    - [ ] Sub-task: Verify it runs against the populated DuckDB.
- [x] **Task: File Store Sync Support** (d3a9140)
    - [ ] Sub-task: Allow `VOTES_STORE=file` to read `data/cache/votes.json` with `data/cache/scenarios_dsl.json`.
- [x] **Task: Conductor - User Manual Verification 'Phase 3: Automation & Proof of Concept' (Protocol in workflow.md)** (c1d4dfa)

## Phase 4: Production Data Sync [checkpoint: 3e92ba4]
Goal: Sync real vote data into DuckDB and run analysis for actual usage.

- [x] **Task: Configure Real Vote Store Access** (3ba6c10)
    - [ ] Sub-task: Identify the production vote store (Postgres or SQLite) and ensure credentials/paths are available.
    - [ ] Sub-task: Validate connectivity and permissions for the chosen store.
- [x] **Task: Full Sync + Analysis** (75d6e1a)
    - [ ] Sub-task: Run `make sync-votes` against the real store.
    - [ ] Sub-task: Run `tools/analyze_political_clusters.py` against populated DuckDB.
- [x] **Task: Conductor - User Manual Verification 'Phase 4: Production Data Sync' (Protocol in workflow.md)** (3e92ba4)

## Phase 5: Production Vote Count Validation
Goal: Confirm production vote counts and data source alignment.

- [x] **Task: Validate Production Vote Counts** (1f70518)
    - [x] Sub-task: Query counts in the production `votes` and `scenarios` tables. (Found 4 votes, 3 scenarios in Cloud SQL)
    - [x] Sub-task: Confirm which instance/database is being queried. (reviewflow-nrciu:europe-west1:citizen-budget-db)
- [~] **Task: Conductor - User Manual Verification 'Phase 5: Production Vote Count Validation' (Protocol in workflow.md)**
