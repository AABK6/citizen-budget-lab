import psycopg
import sys

dsn = "postgresql://cbl_api:SecureVotePassword2026!@35.205.208.111:5432/votes_db"
try:
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM votes;")
            votes_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM scenarios;")
            scenarios_count = cur.fetchone()[0]
            print(f"Votes count: {votes_count}")
            print(f"Scenarios count: {scenarios_count}")
except Exception as e:
    print(f"Error connecting to production DB: {e}")
    sys.exit(1)
