import psycopg
import sys

dsn = "postgresql://cbl_api:SecureVotePassword2026!@35.205.208.111:5432/votes_db"
try:
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT scenario_id, vote_count FROM vote_stats;")
            rows = cur.fetchall()
            for row in rows:
                print(f"Scenario: {row[0]}, Count: {row[1]}")
except Exception as e:
    print(f"Error: {e}")
