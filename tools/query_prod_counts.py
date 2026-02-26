from __future__ import annotations

import argparse
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Query vote/scenario counts from Postgres.")
    parser.add_argument(
        "--dsn",
        default=os.getenv("VOTES_DB_DSN"),
        help="Postgres DSN (default: VOTES_DB_DSN env var).",
    )
    args = parser.parse_args()

    if not args.dsn:
        print("ERROR: provide --dsn or set VOTES_DB_DSN", file=sys.stderr)
        return 2

    try:
        import psycopg
    except Exception as exc:
        print(f"ERROR: psycopg is required ({exc})", file=sys.stderr)
        return 2

    try:
        with psycopg.connect(args.dsn) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM votes;")
                votes_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM scenarios;")
                scenarios_count = cur.fetchone()[0]
                print(f"Votes count: {votes_count}")
                print(f"Scenarios count: {scenarios_count}")
    except Exception as exc:
        print(f"Error connecting/querying Postgres: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
