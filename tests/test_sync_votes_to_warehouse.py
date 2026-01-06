import base64
import json
import os
import sqlite3

import duckdb
import pytest
import yaml

from tools import sync_votes_to_warehouse as wh
from tools.sync_votes_to_warehouse import create_or_alter_table


def _column_names(con, table_name: str) -> set[str]:
    rows = con.execute(
        """
        select column_name
        from information_schema.columns
        where table_name = ?
        """,
        [table_name],
    ).fetchall()
    return {row[0] for row in rows}


def _column_names_with_schema(
    con, schema: str, table_name: str
) -> set[str]:
    rows = con.execute(
        """
        select column_name
        from information_schema.columns
        where table_schema = ? and table_name = ?
        """,
        [schema, table_name],
    ).fetchall()
    return {row[0] for row in rows}


def _create_sqlite_store(path) -> sqlite3.Connection:
    con = sqlite3.connect(path)
    con.execute(
        """
        create table votes (
            id text primary key,
            scenario_id text not null,
            timestamp double precision not null,
            user_email text,
            meta_json text not null
        )
        """
    )
    con.execute(
        """
        create table scenarios (
            id text primary key,
            dsl_json text not null,
            meta_json text
        )
        """
    )
    return con


def _insert_scenario(con, scenario_id: str, dsl: dict) -> None:
    con.execute(
        "insert into scenarios (id, dsl_json) values (?, ?)",
        (scenario_id, json.dumps(dsl)),
    )


def _insert_vote(
    con,
    vote_id: str,
    scenario_id: str,
    timestamp: float,
    meta: dict,
) -> None:
    con.execute(
        """
        insert into votes (id, scenario_id, timestamp, user_email, meta_json)
        values (?, ?, ?, ?, ?)
        """,
        (vote_id, scenario_id, timestamp, None, json.dumps(meta)),
    )


def test_create_or_alter_table_creates_table(tmp_path):
    db_path = tmp_path / "warehouse.duckdb"
    con = duckdb.connect(str(db_path))

    columns = {"vote_id": "VARCHAR", "baseline_year": "INTEGER"}

    added = create_or_alter_table(con, "user_preferences_wide", columns)

    assert set(columns).issubset(_column_names(con, "user_preferences_wide"))
    assert set(added) == set(columns)


def test_create_or_alter_table_adds_missing_columns(tmp_path):
    db_path = tmp_path / "warehouse.duckdb"
    con = duckdb.connect(str(db_path))
    con.execute("create table user_preferences_wide (vote_id VARCHAR)")

    columns = {
        "vote_id": "VARCHAR",
        "baseline_year": "INTEGER",
        "macro_deficit_final_eur": "DOUBLE",
    }

    added = create_or_alter_table(con, "user_preferences_wide", columns)
    names = _column_names(con, "user_preferences_wide")

    assert set(columns).issubset(names)
    assert set(added) == {"baseline_year", "macro_deficit_final_eur"}


def test_get_duckdb_path_resolves_relative(monkeypatch):
    monkeypatch.setenv("WAREHOUSE_DUCKDB_PATH", "data/test.duckdb")

    path = wh.get_duckdb_path()

    assert path.endswith("data/test.duckdb")
    assert os.path.isabs(path)


def test_get_duckdb_path_accepts_absolute(tmp_path):
    abs_path = str(tmp_path / "abs.duckdb")

    assert wh.get_duckdb_path(abs_path) == abs_path


def test_expected_user_preferences_columns_include_levers(monkeypatch):
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: ["reform_demo"])

    columns = wh.expected_user_preferences_columns({"extra_col": "VARCHAR"})

    assert columns["reform_demo"] == "DOUBLE"
    assert columns["extra_col"] == "VARCHAR"
    assert columns["vote_id"] == "VARCHAR"


def test_ensure_user_preferences_table_with_schema(tmp_path, monkeypatch):
    db_path = tmp_path / "warehouse.duckdb"
    con = duckdb.connect(str(db_path))
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: ["reform_demo"])

    wh.ensure_user_preferences_table(
        con,
        {"extra_col": "VARCHAR"},
        "main.user_preferences_wide",
    )

    names = _column_names_with_schema(con, "main", "user_preferences_wide")
    assert "reform_demo" in names
    assert "extra_col" in names


def test_connect_duckdb_creates_file(tmp_path):
    db_path = tmp_path / "warehouse.duckdb"

    con = wh.connect_duckdb(str(db_path))
    con.execute("select 1").fetchone()
    con.close()

    assert db_path.exists()


def test_main_initializes_table(tmp_path, monkeypatch):
    duckdb_path = tmp_path / "warehouse.duckdb"
    sqlite_path = tmp_path / "votes.sqlite3"
    monkeypatch.setenv("WAREHOUSE_DUCKDB_PATH", str(duckdb_path))
    monkeypatch.setenv("VOTES_STORE", "sqlite")
    monkeypatch.setenv("VOTES_SQLITE_PATH", str(sqlite_path))
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: ["reform_demo"])
    con = _create_sqlite_store(str(sqlite_path))
    con.commit()
    con.close()

    wh.main()

    con = duckdb.connect(str(duckdb_path))
    names = _column_names(con, "user_preferences_wide")
    assert "reform_demo" in names


def test_sync_votes_from_sqlite_idempotent(tmp_path, monkeypatch):
    sqlite_path = tmp_path / "votes.sqlite3"
    duckdb_path = tmp_path / "warehouse.duckdb"
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: [])
    con = _create_sqlite_store(str(sqlite_path))
    dsl = {
        "version": 0.1,
        "baseline_year": 2026,
        "actions": [],
    }
    _insert_scenario(con, "s1", dsl)
    _insert_vote(con, "0001", "s1", 123.0, {"timestamp": 123.0})
    con.commit()
    con.close()

    wh_con = duckdb.connect(str(duckdb_path))
    inserted = wh.sync_votes(
        wh_con,
        "sqlite",
        sqlite_path=str(sqlite_path),
    )
    inserted_again = wh.sync_votes(
        wh_con,
        "sqlite",
        sqlite_path=str(sqlite_path),
    )
    count = wh_con.execute(
        "select count(*) from user_preferences_wide"
    ).fetchone()[0]

    assert inserted == 1
    assert inserted_again == 0
    assert count == 1


def test_sync_votes_from_sqlite_incremental(tmp_path, monkeypatch):
    sqlite_path = tmp_path / "votes.sqlite3"
    duckdb_path = tmp_path / "warehouse.duckdb"
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: [])
    con = _create_sqlite_store(str(sqlite_path))
    dsl = {
        "version": 0.1,
        "baseline_year": 2026,
        "actions": [],
    }
    _insert_scenario(con, "s1", dsl)
    _insert_vote(con, "0001", "s1", 111.0, {"timestamp": 111.0})
    con.commit()

    wh_con = duckdb.connect(str(duckdb_path))
    inserted_first = wh.sync_votes(
        wh_con,
        "sqlite",
        sqlite_path=str(sqlite_path),
    )

    _insert_vote(con, "0002", "s1", 222.0, {"timestamp": 222.0})
    con.commit()
    con.close()

    inserted_second = wh.sync_votes(
        wh_con,
        "sqlite",
        sqlite_path=str(sqlite_path),
    )
    count = wh_con.execute(
        "select count(*) from user_preferences_wide"
    ).fetchone()[0]

    assert inserted_first == 1
    assert inserted_second == 1
    assert count == 2


def test_sync_votes_adds_dynamic_columns(tmp_path, monkeypatch):
    sqlite_path = tmp_path / "votes.sqlite3"
    duckdb_path = tmp_path / "warehouse.duckdb"
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: [])
    con = _create_sqlite_store(str(sqlite_path))
    dsl = {
        "version": 0.1,
        "baseline_year": 2026,
        "actions": [
            {
                "id": "mass_edu",
                "target": "mission.M_EDU",
                "op": "increase",
                "delta_pct": 5,
            }
        ],
    }
    _insert_scenario(con, "s1", dsl)
    _insert_vote(con, "0001", "s1", 111.0, {"timestamp": 111.0})
    con.commit()
    con.close()

    wh_con = duckdb.connect(str(duckdb_path))
    wh.sync_votes(
        wh_con,
        "sqlite",
        sqlite_path=str(sqlite_path),
    )

    row = wh_con.execute(
        """
        select mass_mission_m_edu_delta_pct
        from user_preferences_wide
        """
    ).fetchone()

    assert row[0] == 5.0


def test_sync_votes_from_file_store(tmp_path, monkeypatch):
    votes_path = tmp_path / "votes.json"
    scenarios_path = tmp_path / "scenarios_dsl.json"
    duckdb_path = tmp_path / "warehouse.duckdb"
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: [])

    dsl = {"version": 0.1, "baseline_year": 2026, "actions": []}
    encoded = base64.b64encode(yaml.safe_dump(dsl).encode("utf-8")).decode(
        "ascii"
    )
    scenarios_path.write_text(json.dumps({"s1": encoded}))
    votes_path.write_text(
        json.dumps(
            [
                {
                    "id": "vote-1",
                    "scenarioId": "s1",
                    "timestamp": 111.0,
                    "meta": {"timestamp": 111.0},
                }
            ]
        )
    )

    wh_con = duckdb.connect(str(duckdb_path))
    inserted = wh.sync_votes(
        wh_con,
        "file",
        votes_file_path=str(votes_path),
        scenarios_dsl_path=str(scenarios_path),
    )

    row = wh_con.execute(
        "select vote_id, baseline_year from user_preferences_wide"
    ).fetchone()

    assert inserted == 1
    assert row == ("vote-1", 2026)


def test_sync_votes_from_file_store_idempotent_without_id(
    tmp_path, monkeypatch
):
    votes_path = tmp_path / "votes.json"
    scenarios_path = tmp_path / "scenarios_dsl.json"
    duckdb_path = tmp_path / "warehouse.duckdb"
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: [])

    dsl = {"version": 0.1, "baseline_year": 2026, "actions": []}
    encoded = base64.b64encode(json.dumps(dsl).encode("utf-8")).decode(
        "ascii"
    )
    scenarios_path.write_text(json.dumps({"s1": encoded}))
    votes_path.write_text(
        json.dumps(
            [
                {
                    "scenarioId": "s1",
                    "timestamp": 111.0,
                    "meta": {"timestamp": 111.0},
                }
            ]
        )
    )

    wh_con = duckdb.connect(str(duckdb_path))
    inserted = wh.sync_votes(
        wh_con,
        "file",
        votes_file_path=str(votes_path),
        scenarios_dsl_path=str(scenarios_path),
    )
    inserted_again = wh.sync_votes(
        wh_con,
        "file",
        votes_file_path=str(votes_path),
        scenarios_dsl_path=str(scenarios_path),
    )
    count = wh_con.execute(
        "select count(*) from user_preferences_wide"
    ).fetchone()[0]

    assert inserted == 1
    assert inserted_again == 0
    assert count == 1


def test_sync_votes_from_file_store_requires_scenarios(
    tmp_path, monkeypatch
):
    votes_path = tmp_path / "votes.json"
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: [])

    votes_path.write_text(
        json.dumps(
            [
                {
                    "id": "vote-1",
                    "scenarioId": "s1",
                    "timestamp": 111.0,
                    "meta": {"timestamp": 111.0},
                }
            ]
        )
    )

    wh_con = duckdb.connect(str(tmp_path / "warehouse.duckdb"))

    with pytest.raises(FileNotFoundError):
        wh.sync_votes(
            wh_con,
            "file",
            votes_file_path=str(votes_path),
            scenarios_dsl_path=str(tmp_path / "missing.json"),
        )
