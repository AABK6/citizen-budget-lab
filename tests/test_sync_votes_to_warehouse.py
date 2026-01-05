import os

import duckdb

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
    db_path = tmp_path / "warehouse.duckdb"
    monkeypatch.setenv("WAREHOUSE_DUCKDB_PATH", str(db_path))
    monkeypatch.setattr(wh, "policy_lever_columns", lambda: ["reform_demo"])

    wh.main()

    con = duckdb.connect(str(db_path))
    names = _column_names(con, "user_preferences_wide")
    assert "reform_demo" in names
