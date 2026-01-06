import os
import sys

import duckdb
import pytest

from tools import analyze_political_clusters as apc


def _seed_cluster_table(con) -> None:
    con.execute(
        """
        create table user_preferences_wide (
            vote_id varchar,
            mass_mission_m_edu_delta_pct double,
            reform_freeze_pension_indexation double
        )
        """
    )
    rows = [
        ("v1", 5.0, -100.0),
        ("v2", 2.0, -50.0),
        ("v3", 0.0, -200.0),
        ("v4", -1.0, -300.0),
    ]
    con.executemany(
        "insert into user_preferences_wide values (?, ?, ?)",
        rows,
    )


def test_cluster_metrics_averages_pension_cut_for_edu_increase(tmp_path):
    con = duckdb.connect(str(tmp_path / "warehouse.duckdb"))
    _seed_cluster_table(con)

    metrics = apc.compute_cluster_metrics(
        con,
        education_columns=["mass_mission_m_edu_delta_pct"],
        pension_columns=["reform_freeze_pension_indexation"],
    )

    assert metrics.total_votes == 4
    assert metrics.education_increase_votes == 2
    assert metrics.avg_pension_cut == 75.0


def test_resolve_columns_prefers_candidates():
    columns = ["mass_mission_m_edu_delta_pct", "reform_freeze_pension_indexation"]

    resolved = apc.resolve_columns(
        columns,
        ["mass_mission_m_edu_delta_pct"],
        ("edu",),
    )

    assert resolved == ["mass_mission_m_edu_delta_pct"]


def test_resolve_columns_falls_back_to_keywords():
    columns = ["reform_freeze_pension_indexation", "other_col"]

    resolved = apc.resolve_columns(
        columns,
        ["missing_col"],
        ("pension",),
    )

    assert resolved == ["reform_freeze_pension_indexation"]


def test_compute_cluster_metrics_requires_columns(tmp_path):
    con = duckdb.connect(str(tmp_path / "warehouse.duckdb"))
    con.execute("create table user_preferences_wide (vote_id varchar)")

    with pytest.raises(ValueError, match="education columns"):
        apc.compute_cluster_metrics(con)


def test_get_duckdb_path_resolves_relative(monkeypatch):
    monkeypatch.setenv("WAREHOUSE_DUCKDB_PATH", "data/test.duckdb")

    path = apc.get_duckdb_path()

    assert path.endswith("data/test.duckdb")
    assert os.path.isabs(path)


def test_get_duckdb_path_accepts_absolute(tmp_path):
    abs_path = str(tmp_path / "warehouse.duckdb")

    assert apc.get_duckdb_path(abs_path) == abs_path


def test_list_table_columns_with_schema(tmp_path):
    con = duckdb.connect(str(tmp_path / "warehouse.duckdb"))
    con.execute("create schema analytics")
    con.execute(
        """
        create table analytics.user_preferences_wide (
            vote_id varchar,
            score double
        )
        """
    )

    columns = apc.list_table_columns(con, "analytics.user_preferences_wide")

    assert columns == ["vote_id", "score"]


def test_resolve_columns_returns_empty_without_keywords():
    columns = ["alpha", "beta"]

    resolved = apc.resolve_columns(columns, ["missing"], ())

    assert resolved == []


def test_build_cluster_query_requires_columns():
    with pytest.raises(ValueError, match="education column"):
        apc.build_cluster_query("user_preferences_wide", [], ["pension"])
    with pytest.raises(ValueError, match="pension column"):
        apc.build_cluster_query("user_preferences_wide", ["edu"], [])


def test_format_metrics_handles_none():
    metrics = apc.ClusterMetrics(
        total_votes=1,
        education_increase_votes=0,
        avg_pension_cut=None,
        education_columns=("edu",),
        pension_columns=("pension",),
    )

    output = apc.format_metrics(metrics)

    assert "n/a" in output


def test_parse_columns_trims_entries():
    assert apc._parse_columns("a, b, ,c") == ["a", "b", "c"]


def test_main_outputs_metrics(tmp_path, monkeypatch, capsys):
    db_path = tmp_path / "warehouse.duckdb"
    con = duckdb.connect(str(db_path))
    _seed_cluster_table(con)
    con.close()

    monkeypatch.setattr(
        sys,
        "argv",
        [
            "prog",
            "--warehouse",
            str(db_path),
            "--education-columns",
            "mass_mission_m_edu_delta_pct",
            "--pension-columns",
            "reform_freeze_pension_indexation",
        ],
    )

    apc.main()

    output = capsys.readouterr().out
    assert "Political cluster analysis" in output
