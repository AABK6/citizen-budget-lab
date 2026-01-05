# Specification: Scenario ETL & Political Analytics Pipeline

## 1. Overview
Currently, user budget preferences (Scenarios) are stored as raw JSON/DSL blobs in the "Ballot Box" (Postgres/SQLite). This format prevents deep political analysis of citizen compromises. This track implements a batch ETL (Extract, Transform, Load) pipeline to unpack these blobs into a structured "Wide Table" within the DuckDB "Library" for advanced analytics.

## 2. Functional Requirements
*   **Data Extraction:** Unpack individual reform toggles (boolean/amounts), high-level mass adjustments (percentage deltas), macroeconomic outcomes (final deficit/debt), and user metadata (timestamps).
*   **Structured Storage:** Load the extracted data into a wide, flattened table in DuckDB (`user_preferences_wide`), where each row represents a single vote.
*   **Batch Processing:** The pipeline runs as a scheduled or recurring job that processes new votes since the last successful sync.
*   **Dynamic Schema Support:** The ETL must automatically adapt to the current `policy_levers.yaml` catalog, generating new columns for new reforms as they are added to the project.
*   **Political Insight Foundation:** Enable complex queries like "Correlation between cutting education and raising wealth taxes."

## 3. Non-Functional Requirements
*   **Performance:** Extraction must be efficient enough to process thousands of votes without locking the production database.
*   **Data Consistency:** Ensure that the total vote count in DuckDB matches the Ballot Box.
*   **Idempotency:** Re-running the ETL for the same period must not create duplicate records.

## 4. Acceptance Criteria
*   [ ] **ETL Script:** A Python-based tool (`tools/sync_votes_to_warehouse.py`) that performs the extraction and load.
*   [ ] **DuckDB Schema:** Verification that the `user_preferences_wide` table is created and updated correctly with columns for every active reform.
*   [ ] **Data Accuracy:** A sample query comparing a JSON blob's content to its flattened representation in DuckDB.
*   [ ] **Automation:** The script is integrated into the `Makefile` (e.g., `make sync-votes`).

## 5. Out of Scope
*   Real-time processing (focus is on batch for stability).
*   Front-end visualization of these stats (this track is about the data pipeline foundation).
