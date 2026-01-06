"""Sync user votes into the analytics warehouse."""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb
import psycopg
import yaml

from tools.etl.schema_generator import policy_lever_columns
from tools.etl.scenario_parser import flatten_scenario

DEFAULT_DUCKDB_PATH = os.path.join("data", "warehouse.duckdb")
DEFAULT_TABLE_NAME = "user_preferences_wide"
DEFAULT_VOTES_FILE_PATH = os.path.join("data", "cache", "votes.json")
DEFAULT_SCENARIOS_DSL_PATH = os.path.join(
    "data", "cache", "scenarios_dsl.json"
)

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
        qname = _quote_table_name(table_name)
        con.execute(f"create table {qname} ({cols_sql})")
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


def get_last_vote_id(
    con: duckdb.DuckDBPyConnection,
    table_name: str = DEFAULT_TABLE_NAME,
) -> Optional[str]:
    """Return the latest vote_id stored in DuckDB.

    Args:
        con: DuckDB connection.
        table_name: Table name to inspect.

    Returns:
        The max vote_id value, or None if missing.
    """
    schema, table = _split_table_name(table_name)
    existing = _existing_columns(con, schema, table)
    if "vote_id" not in existing:
        return None
    try:
        row = con.execute(
            f"select max(vote_id) from {_quote_table_name(table_name)}"
        ).fetchone()
    except Exception:
        return None
    if not row or row[0] is None:
        return None
    return str(row[0])


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


def fetch_votes_sqlite(
    sqlite_path: str,
    last_vote_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch votes and their DSL from SQLite.

    Args:
        sqlite_path: Path to the SQLite votes store.
        last_vote_id: Optional last vote_id processed.

    Returns:
        List of vote rows with DSL payloads.
    """
    sql = (
        "select v.id, v.scenario_id, v.timestamp, v.meta_json, s.dsl_json "
        "from votes v left join scenarios s on s.id = v.scenario_id"
    )
    params: List[Any] = []
    if last_vote_id:
        sql += " where v.id > ?"
        params.append(last_vote_id)
    sql += " order by v.id"

    con = sqlite3.connect(sqlite_path)
    try:
        rows = con.execute(sql, params).fetchall()
    finally:
        con.close()

    return [
        {
            "vote_id": row[0],
            "scenario_id": row[1],
            "timestamp": row[2],
            "meta_json": row[3],
            "dsl_json": row[4],
        }
        for row in rows
    ]


def fetch_votes_postgres(
    dsn: str,
    last_vote_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch votes and their DSL from Postgres.

    Args:
        dsn: Postgres DSN for the votes store.
        last_vote_id: Optional last vote_id processed.

    Returns:
        List of vote rows with DSL payloads.
    """
    sql = (
        "select v.id, v.scenario_id, v.timestamp, v.meta_json, s.dsl_json "
        "from votes v left join scenarios s on s.id = v.scenario_id"
    )
    params: List[Any] = []
    if last_vote_id:
        sql += " where v.id > %s"
        params.append(last_vote_id)
    sql += " order by v.id"

    rows: List[Dict[str, Any]] = []
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            for row in cur.fetchall():
                rows.append(
                    {
                        "vote_id": row[0],
                        "scenario_id": row[1],
                        "timestamp": row[2],
                        "meta_json": row[3],
                        "dsl_json": row[4],
                    }
                )
    return rows


def fetch_votes_file(
    votes_path: str,
    scenarios_path: str,
) -> List[Dict[str, Any]]:
    """Fetch votes and their DSL from file-based storage.

    Args:
        votes_path: Path to the file-backed votes JSON.
        scenarios_path: Path to the scenario DSL JSON mapping.

    Returns:
        List of vote rows with DSL payloads.
    """
    votes = _load_votes_file(votes_path)
    scenarios = _load_scenarios_dsl(scenarios_path)
    rows: List[Dict[str, Any]] = []

    for vote in votes:
        scenario_id = vote.get("scenarioId") or vote.get("scenario_id")
        if not scenario_id:
            continue
        scenario_id = str(scenario_id)
        dsl_payload = scenarios.get(scenario_id)
        if dsl_payload is None:
            continue
        vote_id = (
            vote.get("id")
            or vote.get("vote_id")
            or _hash_vote_record(vote)
        )
        rows.append(
            {
                "vote_id": str(vote_id),
                "scenario_id": scenario_id,
                "timestamp": vote.get("timestamp"),
                "meta_json": vote.get("meta") or vote.get("meta_json"),
                "dsl_json": dsl_payload,
            }
        )
    return rows


def sync_votes(
    con: duckdb.DuckDBPyConnection,
    votes_store: str,
    *,
    table_name: str = DEFAULT_TABLE_NAME,
    sqlite_path: Optional[str] = None,
    pg_dsn: Optional[str] = None,
    votes_file_path: Optional[str] = None,
    scenarios_dsl_path: Optional[str] = None,
) -> int:
    """Sync votes from the configured store into DuckDB.

    Args:
        con: DuckDB connection.
        votes_store: Store type ("sqlite" or "postgres").
        table_name: DuckDB table name.
        sqlite_path: Optional SQLite path override.
        pg_dsn: Optional Postgres DSN override.
        votes_file_path: Optional JSON file path for file-backed votes.
        scenarios_dsl_path: Optional JSON path for scenario DSL mappings.

    Returns:
        Number of inserted rows.
    """
    ensure_user_preferences_table(con, table_name=table_name)
    last_vote_id = get_last_vote_id(con, table_name)

    if votes_store == "sqlite":
        store_path = sqlite_path or os.getenv(
            "VOTES_SQLITE_PATH", os.path.join("data", "cache", "votes.sqlite3")
        )
        rows = fetch_votes_sqlite(store_path, last_vote_id)
    elif votes_store == "file":
        store_path = votes_file_path or os.getenv(
            "VOTES_FILE_PATH", DEFAULT_VOTES_FILE_PATH
        )
        scenarios_path = scenarios_dsl_path or os.getenv(
            "SCENARIOS_DSL_PATH", DEFAULT_SCENARIOS_DSL_PATH
        )
        rows = fetch_votes_file(store_path, scenarios_path)
        existing_ids = _existing_vote_ids(con, table_name)
        if existing_ids:
            rows = [
                row
                for row in rows
                if str(row.get("vote_id")) not in existing_ids
            ]
    elif votes_store == "postgres":
        dsn = pg_dsn or os.getenv("VOTES_DB_DSN")
        if not dsn:
            raise ValueError("VOTES_DB_DSN is required for postgres store")
        rows = fetch_votes_postgres(dsn, last_vote_id)
    else:
        raise ValueError(f"Unsupported votes store: {votes_store}")

    flat_rows = _build_flat_rows(rows)
    if not flat_rows:
        return 0

    base_columns = expected_user_preferences_columns()
    extra_columns = _infer_extra_columns(flat_rows, base_columns)
    if extra_columns:
        ensure_user_preferences_table(
            con,
            extra_columns=extra_columns,
            table_name=table_name,
        )

    return _insert_rows(con, table_name, flat_rows)


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


def _existing_vote_ids(
    con: duckdb.DuckDBPyConnection,
    table_name: str,
) -> set[str]:
    schema, table = _split_table_name(table_name)
    existing = _existing_columns(con, schema, table)
    if "vote_id" not in existing:
        return set()
    try:
        rows = con.execute(
            f"select vote_id from {_quote_table_name(table_name)}"
        ).fetchall()
    except Exception:
        return set()
    return {str(row[0]) for row in rows if row and row[0] is not None}


def _split_table_name(table_name: str) -> tuple[Optional[str], str]:
    parts = table_name.split(".")
    if len(parts) == 2:
        return parts[0], parts[1]
    return None, table_name


def _build_flat_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    flat_rows: List[Dict[str, Any]] = []
    for row in rows:
        dsl_json = row.get("dsl_json")
        if dsl_json is None:
            continue
        meta = _normalize_meta(row.get("meta_json"), row.get("timestamp"))
        flat = flatten_scenario(dsl_json, meta)
        flat["vote_id"] = row.get("vote_id")
        flat["scenario_id"] = row.get("scenario_id")
        if "vote_timestamp" not in flat and row.get("timestamp") is not None:
            flat["vote_timestamp"] = float(row.get("timestamp"))
        flat_rows.append(flat)
    return flat_rows


def _normalize_meta(meta_json: Any, timestamp: Any) -> Dict[str, Any]:
    payload = _parse_json_payload(meta_json)
    if isinstance(payload, dict):
        meta = dict(payload)
    else:
        meta = {}
    if timestamp is not None and "timestamp" not in meta:
        meta["timestamp"] = float(timestamp)
    return meta


def _parse_json_payload(payload: Any) -> Any:
    if isinstance(payload, (dict, list)):
        return payload
    if isinstance(payload, str):
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return payload
    return payload


def _load_votes_file(path: str) -> List[Dict[str, Any]]:
    data = _load_json_file(path, "votes")
    if data is None:
        return []
    if not isinstance(data, list):
        raise ValueError("Votes file must contain a JSON list")
    return [item for item in data if isinstance(item, dict)]


def _load_scenarios_dsl(path: str) -> Dict[str, Dict[str, Any]]:
    data = _load_json_file(path, "scenarios")
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise ValueError("Scenarios DSL file must contain a JSON object")

    parsed: Dict[str, Dict[str, Any]] = {}
    for scenario_id, payload in data.items():
        if not isinstance(scenario_id, str):
            continue
        parsed_payload = _decode_scenario_payload(payload)
        if isinstance(parsed_payload, dict):
            parsed[scenario_id] = parsed_payload
    return parsed


def _load_json_file(path: str, label: str) -> Any:
    if not os.path.exists(path):
        raise FileNotFoundError(f"{label} file not found: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _decode_scenario_payload(payload: Any) -> Any:
    if isinstance(payload, dict):
        return payload
    if not isinstance(payload, str):
        return None

    text = payload.strip()
    if not text:
        return None
    decoded = _maybe_decode_base64(text)
    if decoded is not None:
        text = decoded

    parsed = _parse_json_or_yaml(text)
    if isinstance(parsed, dict):
        return parsed
    return None


def _maybe_decode_base64(payload: str) -> Optional[str]:
    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        return None
    try:
        return decoded.decode("utf-8")
    except UnicodeDecodeError:
        return None


def _parse_json_or_yaml(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            return yaml.safe_load(text)
        except yaml.YAMLError:
            return None


def _hash_vote_record(vote: Dict[str, Any]) -> str:
    payload = {
        "scenario_id": vote.get("scenarioId") or vote.get("scenario_id"),
        "timestamp": vote.get("timestamp"),
        "meta": vote.get("meta"),
    }
    encoded = json.dumps(payload, sort_keys=True, default=str).encode(
        "utf-8"
    )
    return hashlib.sha256(encoded).hexdigest()


def _infer_extra_columns(
    rows: List[Dict[str, Any]],
    known_columns: Dict[str, str],
) -> Dict[str, str]:
    extras: Dict[str, str] = {}
    for row in rows:
        for key, value in row.items():
            if key in known_columns:
                continue
            if key not in extras:
                extras[key] = _infer_duckdb_type(value)
    return extras


def _infer_duckdb_type(value: Any) -> str:
    if isinstance(value, bool):
        return "BOOLEAN"
    if isinstance(value, (int, float)):
        return "DOUBLE"
    return "VARCHAR"


def _column_order(rows: List[Dict[str, Any]]) -> List[str]:
    union = set()
    for row in rows:
        union.update(row.keys())
    base_order = [name for name in BASE_COLUMNS if name in union]
    extra = sorted(col for col in union if col not in base_order)
    return base_order + extra


def _insert_rows(
    con: duckdb.DuckDBPyConnection,
    table_name: str,
    rows: List[Dict[str, Any]],
) -> int:
    if not rows:
        return 0
    columns = _column_order(rows)
    quoted_cols = ", ".join(_quote_identifier(col) for col in columns)
    placeholders = ", ".join(["?"] * len(columns))
    sql = (
        f"insert into {_quote_table_name(table_name)} "
        f"({quoted_cols}) values ({placeholders})"
    )
    for row in rows:
        values = [row.get(col) for col in columns]
        con.execute(sql, values)
    return len(rows)


def _quote_identifier(name: str) -> str:
    escaped = name.replace('"', '""')
    return f'"{escaped}"'


def _quote_table_name(table_name: str) -> str:
    schema, table = _split_table_name(table_name)
    if schema:
        return f"{_quote_identifier(schema)}.{_quote_identifier(table)}"
    return _quote_identifier(table)


def main() -> None:
    """Initialize or update the wide table and sync votes into it.

    Args:
        None.

    Returns:
        None.
    """
    con = connect_duckdb()
    try:
        votes_store = os.getenv("VOTES_STORE", "file")
        if votes_store not in {"file", "sqlite", "postgres"}:
            raise ValueError("VOTES_STORE must be file, sqlite, or postgres")
        sync_votes(con, votes_store)
    finally:
        con.close()


if __name__ == "__main__":
    main()
