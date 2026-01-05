"""Sync user votes into the analytics warehouse."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import duckdb

from tools.etl.schema_generator import policy_lever_columns

DEFAULT_DUCKDB_PATH = os.path.join("data", "warehouse.duckdb")
DEFAULT_TABLE_NAME = "user_preferences_wide"

BASE_COLUMNS: Dict[str, str] = {
    "vote_id": "VARCHAR",
    "scenario_id": "VARCHAR",
    "vote_timestamp": "DOUBLE",
    "baseline_year": "INTEGER",
    "macro_deficit_final_eur": "DOUBLE",
    "macro_debt_final_eur": "DOUBLE",
}


def get_duckdb_path(path: Optional[str] = None) -> str:
    """Resolve the warehouse DuckDB path.

    Args:
        path: Optional explicit path override.

    Returns:
        Absolute path to the DuckDB file.
    """
    raw_path = path or os.getenv("WAREHOUSE_DUCKDB_PATH", DEFAULT_DUCKDB_PATH)
    if os.path.isabs(raw_path):
        return raw_path
    root = Path(__file__).resolve().parents[1]
    return str(root / raw_path)


def connect_duckdb(path: Optional[str] = None) -> duckdb.DuckDBPyConnection:
    """Create a DuckDB connection for the warehouse.

    Args:
        path: Optional explicit path override.

    Returns:
        DuckDB connection object.
    """
    return duckdb.connect(get_duckdb_path(path))


def expected_user_preferences_columns(
    extra_columns: Optional[Dict[str, str]] = None,
) -> Dict[str, str]:
    """Build the expected schema for the wide preferences table.

    Args:
        extra_columns: Optional dynamic columns to include.

    Returns:
        Mapping of column name to DuckDB type.
    """
    columns = dict(BASE_COLUMNS)
    for lever_column in policy_lever_columns():
        columns.setdefault(lever_column, "DOUBLE")
    if extra_columns:
        columns.update(extra_columns)
    return columns


def create_or_alter_table(
    con: duckdb.DuckDBPyConnection,
    table_name: str,
    columns: Dict[str, str],
) -> List[str]:
    """Create the table if missing and add any new columns.

    Args:
        con: DuckDB connection.
        table_name: Table name (optionally schema-qualified).
        columns: Column names mapped to SQL types.

    Returns:
        List of newly added column names.
    """
    schema, table = _split_table_name(table_name)
    existing = _existing_columns(con, schema, table)
    added: List[str] = []

    if not existing:
        cols_sql = ", ".join(
            f"{_quote_identifier(name)} {dtype}"
            for name, dtype in columns.items()
        )
        con.execute(f"create table {_quote_table_name(table_name)} ({cols_sql})")
        return list(columns.keys())

    for name, dtype in columns.items():
        if name.lower() in existing:
            continue
        con.execute(
            f"alter table {_quote_table_name(table_name)} "
            f"add column {_quote_identifier(name)} {dtype}"
        )
        added.append(name)

    return added


def ensure_user_preferences_table(
    con: duckdb.DuckDBPyConnection,
    extra_columns: Optional[Dict[str, str]] = None,
    table_name: str = DEFAULT_TABLE_NAME,
) -> List[str]:
    """Ensure the user preferences wide table exists and is up to date.

    Args:
        con: DuckDB connection.
        extra_columns: Optional dynamic columns to include.
        table_name: Table name to manage.

    Returns:
        List of newly added column names.
    """
    columns = expected_user_preferences_columns(extra_columns)
    return create_or_alter_table(con, table_name, columns)


def _existing_columns(
    con: duckdb.DuckDBPyConnection,
    schema: Optional[str],
    table: str,
) -> set[str]:
    if schema:
        rows = con.execute(
            """
            select column_name
            from information_schema.columns
            where table_schema = ? and table_name = ?
            """,
            [schema, table],
        ).fetchall()
    else:
        rows = con.execute(
            """
            select column_name
            from information_schema.columns
            where table_name = ?
            """,
            [table],
        ).fetchall()
    return {row[0].lower() for row in rows}


def _split_table_name(table_name: str) -> tuple[Optional[str], str]:
    parts = table_name.split(".")
    if len(parts) == 2:
        return parts[0], parts[1]
    return None, table_name


def _quote_identifier(name: str) -> str:
    escaped = name.replace('"', '""')
    return f'"{escaped}"'


def _quote_table_name(table_name: str) -> str:
    schema, table = _split_table_name(table_name)
    if schema:
        return f"{_quote_identifier(schema)}.{_quote_identifier(table)}"
    return _quote_identifier(table)


def main() -> None:
    """Initialize or update the wide table in the warehouse.

    Args:
        None.

    Returns:
        None.
    """
    con = connect_duckdb()
    ensure_user_preferences_table(con)


if __name__ == "__main__":
    main()
