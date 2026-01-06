# Specification: Voters' Preference Database Testing

## 1. Overview
This track aims to rigorously test the "Vote & Scenario Store" to ensure reliability, data integrity, and performance. The tests will cover two distinct but related concepts:
1.  **Scenarios:** The detailed budget preferences (DSL) created by a user.
2.  **Votes:** The act of a user submitting/endorsing a specific scenario.

The primary focus is on the `PostgresVoteStore` backend (Production target) while also validating the abstraction layer to ensure compatibility with `SqliteVoteStore` (Development).

## 2. Functional Requirements
*   **Backend Support:** Tests must validate both `PostgresVoteStore` and `SqliteVoteStore` implementations.
*   **Scenario CRUD:** Verify that full budget scenarios can be correctly created (`save_scenario`), read (`get_scenario`), and updated.
*   **Vote CRUD:** Verify that votes can be correctly created (`add_vote`) and read (`summary`).
*   **Data Integrity:** Ensure that constraints (e.g., unique vote submissions, foreign key between votes and scenarios) are enforced.
*   **Persistence:** Verify that both scenarios and votes persist correctly across session/connection restarts.
*   **Statistical Analysis:** Verify the ability to query and generate statistics from the stored vote data (e.g., `summary` method providing "Top 5 scenarios").

## 3. Non-Functional Requirements
*   **Concurrency:** The system must handle multiple concurrent `add_vote` operations for the same scenario without data corruption or deadlocks.
*   **Migration Safety:** Schema migrations must apply cleanly and not result in data loss for either scenarios or votes.
*   **Resilience:** The system should gracefully handle edge cases like invalid scenario DSL, malformed vote metadata, or duplicate submissions.

## 4. Acceptance Criteria
*   [ ] **Unit Tests:** Comprehensive unit tests for `PostgresVoteStore` and `SqliteVoteStore` covering `save_scenario`, `get_scenario`, `add_vote`, `summary` and edge cases.
*   [ ] **Integration Tests:** Tests spinning up a real (dockerized or local) Postgres instance to verify actual persistence and SQL interactions for both scenarios and votes.
*   [ ] **Concurrency Tests:** A test suite that simulates concurrent users submitting votes for the same scenario and verifies the final `vote_count` in the `vote_stats` table is accurate.
*   [ ] **Migration Tests:** A test that inserts scenario and vote data, runs a migration, and verifies the data remains accessible and consistent.
*   [ ] **Analytics Tests:** A test that calls the `summary()` method and verifies the results against a known set of votes.

## 5. Out of Scope
*   Performance benchmarking (e.g., "10k requests/second") - focus is on *correctness* under concurrency, not raw speed limits.
*   Testing the `FileVoteStore`.
