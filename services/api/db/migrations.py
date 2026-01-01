from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from typing import List


def votes_migrations_dir() -> str:
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "migrations", "votes")
    )


def apply_migrations(conn, migrations_dir: str, table_name: str = "vote_migrations") -> List[str]:
    """Apply SQL migrations in order and record them in a migrations table."""
    _ensure_migrations_table(conn, table_name)
    applied = _fetch_applied(conn, table_name)
    pending = [name for name in _list_sql_files(migrations_dir) if name not in applied]
    applied_now: List[str] = []
    for name in pending:
        path = os.path.join(migrations_dir, name)
        sql = _load_sql(path)
        if not sql.strip():
            continue
        _execute_sql(conn, sql)
        _record_applied(conn, table_name, name)
        applied_now.append(name)
    return applied_now


def _list_sql_files(migrations_dir: str) -> List[str]:
    if not os.path.isdir(migrations_dir):
        return []
    return sorted(
        name for name in os.listdir(migrations_dir) if name.endswith(".sql")
    )


def _load_sql(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _ensure_migrations_table(conn, table_name: str) -> None:
    sql = (
        f"CREATE TABLE IF NOT EXISTS {table_name} ("
        "name TEXT PRIMARY KEY,"
        "applied_at TEXT NOT NULL"
        ")"
    )
    _execute_sql(conn, sql)


def _fetch_applied(conn, table_name: str) -> set[str]:
    with closing(conn.cursor()) as cur:
        cur.execute(f"SELECT name FROM {table_name}")
        return {row[0] for row in cur.fetchall()}


def _record_applied(conn, table_name: str, name: str) -> None:
    applied_at = datetime.now(timezone.utc).isoformat()
    if _is_sqlite(conn):
        sql = f"INSERT OR IGNORE INTO {table_name} (name, applied_at) VALUES (?, ?)"
        params = (name, applied_at)
    else:
        sql = (
            f"INSERT INTO {table_name} (name, applied_at) "
            "VALUES (%s, %s) ON CONFLICT (name) DO NOTHING"
        )
        params = (name, applied_at)
    with closing(conn.cursor()) as cur:
        cur.execute(sql, params)
    conn.commit()


def _execute_sql(conn, sql: str) -> None:
    with closing(conn.cursor()) as cur:
        cur.execute(sql)
    conn.commit()


def _is_sqlite(conn) -> bool:
    return isinstance(conn, sqlite3.Connection)
