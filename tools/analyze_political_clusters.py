"""Analyze political preference clusters from the warehouse."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import duckdb

DEFAULT_DUCKDB_PATH = os.path.join("data", "warehouse.duckdb")
DEFAULT_TABLE_NAME = "user_preferences_wide"

DEFAULT_EDU_COLUMNS = (
    "mass_mission_m_edu_delta_pct",
    "mass_mission_m_edu_amount_eur",
    "mass_cofog_09_delta_pct",
    "mass_cofog_09_amount_eur",
)
EDU_KEYWORDS = ("edu", "education", "enseignement")

DEFAULT_PENSION_COLUMNS = (
    "reform_freeze_pension_indexation",
    "reform_pensions_freeze_base_plus_compl_2026",
    "reform_pensions_deindex_above_2000",
)
PENSION_KEYWORDS = ("pension", "retraite", "retirement")


@dataclass(frozen=True)
class ClusterMetrics:
    total_votes: int
    education_increase_votes: int
    avg_pension_cut: float | None
    education_columns: tuple[str, ...]
    pension_columns: tuple[str, ...]


def get_duckdb_path(path: str | None = None) -> str:
    """Resolve the warehouse DuckDB path."""
    raw_path = path or os.getenv("WAREHOUSE_DUCKDB_PATH", DEFAULT_DUCKDB_PATH)
    if os.path.isabs(raw_path):
        return raw_path
    root = Path(__file__).resolve().parents[1]
    return str(root / raw_path)


def connect_duckdb(path: str | None = None) -> duckdb.DuckDBPyConnection:
    """Create a DuckDB connection for the warehouse."""
    return duckdb.connect(get_duckdb_path(path))


def list_table_columns(
    con: duckdb.DuckDBPyConnection,
    table_name: str,
) -> list[str]:
    """Return ordered column names for a table."""
    schema, table = _split_table_name(table_name)
    if schema:
        rows = con.execute(
            """
            select column_name
            from information_schema.columns
            where table_schema = ? and table_name = ?
            order by ordinal_position
            """,
            [schema, table],
        ).fetchall()
    else:
        rows = con.execute(
            """
            select column_name
            from information_schema.columns
            where table_name = ?
            order by ordinal_position
            """,
            [table],
        ).fetchall()
    return [row[0] for row in rows]


def resolve_columns(
    all_columns: Sequence[str],
    candidates: Sequence[str],
    keywords: Iterable[str],
) -> list[str]:
    """Resolve target columns, preferring explicit candidates."""
    lookup = {col.lower(): col for col in all_columns}
    resolved = [lookup[cand.lower()] for cand in candidates if cand.lower() in lookup]
    if resolved:
        return resolved

    lowered_keywords = [kw.lower() for kw in keywords]
    if not lowered_keywords:
        return []
    matches = []
    for col in all_columns:
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in lowered_keywords):
            matches.append(col)
    return matches


def build_cluster_query(
    table_name: str,
    education_columns: Sequence[str],
    pension_columns: Sequence[str],
) -> str:
    """Build the aggregation query for the cluster analysis."""
    if not education_columns:
        raise ValueError("At least one education column is required")
    if not pension_columns:
        raise ValueError("At least one pension column is required")

    edu_expr = " or ".join(
        f"coalesce({_quote_identifier(col)}, 0) > 0"
        for col in education_columns
    )
    pension_expr = " + ".join(
        (
            "case when coalesce({col}, 0) < 0 then -coalesce({col}, 0) else 0 end"
        ).format(col=_quote_identifier(col))
        for col in pension_columns
    )

    return (
        "select\n"
        "    count(*) as total_votes,\n"
        f"    sum(case when {edu_expr} then 1 else 0 end) as education_increase_votes,\n"
        f"    avg(case when {edu_expr} then {pension_expr} else null end) as avg_pension_cut\n"
        f"from {_quote_table_name(table_name)}"
    )


def compute_cluster_metrics(
    con: duckdb.DuckDBPyConnection,
    *,
    table_name: str = DEFAULT_TABLE_NAME,
    education_columns: Sequence[str] | None = None,
    pension_columns: Sequence[str] | None = None,
) -> ClusterMetrics:
    """Compute cluster metrics for education increases and pension cuts."""
    columns = list_table_columns(con, table_name)
    if not columns:
        raise ValueError(f"No columns found for table '{table_name}'")

    edu_candidates = list(education_columns or DEFAULT_EDU_COLUMNS)
    edu_cols = resolve_columns(columns, edu_candidates, EDU_KEYWORDS)
    if not edu_cols:
        raise ValueError("No education columns found for analysis")

    pension_candidates = list(pension_columns or DEFAULT_PENSION_COLUMNS)
    pension_cols = resolve_columns(columns, pension_candidates, PENSION_KEYWORDS)
    if not pension_cols:
        raise ValueError("No pension columns found for analysis")

    query = build_cluster_query(table_name, edu_cols, pension_cols)
    row = con.execute(query).fetchone()
    if not row:
        raise ValueError("No data returned from cluster query")

    total_votes, education_votes, avg_pension_cut = row
    avg_cut = float(avg_pension_cut) if avg_pension_cut is not None else None

    return ClusterMetrics(
        total_votes=int(total_votes or 0),
        education_increase_votes=int(education_votes or 0),
        avg_pension_cut=avg_cut,
        education_columns=tuple(edu_cols),
        pension_columns=tuple(pension_cols),
    )


def format_metrics(metrics: ClusterMetrics) -> str:
    """Format the cluster metrics for display."""
    avg = "n/a"
    if metrics.avg_pension_cut is not None:
        avg = f"{metrics.avg_pension_cut:,.2f}"

    return "\n".join(
        [
            "Political cluster analysis",
            f"Total votes: {metrics.total_votes}",
            f"Education increase votes: {metrics.education_increase_votes}",
            f"Avg pension cut for education increasers: {avg}",
            f"Education columns: {', '.join(metrics.education_columns)}",
            f"Pension columns: {', '.join(metrics.pension_columns)}",
        ]
    )


def _parse_columns(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _split_table_name(table_name: str) -> tuple[str | None, str]:
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
    parser = argparse.ArgumentParser(
        description=(
            "Analyze cluster metrics for voters who increased education spending."
        )
    )
    parser.add_argument(
        "--warehouse",
        dest="warehouse_path",
        default=None,
        help="DuckDB warehouse path (defaults to WAREHOUSE_DUCKDB_PATH).",
    )
    parser.add_argument(
        "--table",
        default=DEFAULT_TABLE_NAME,
        help="DuckDB table to analyze.",
    )
    parser.add_argument(
        "--education-columns",
        default="",
        help="Comma-separated education columns to use.",
    )
    parser.add_argument(
        "--pension-columns",
        default="",
        help="Comma-separated pension columns to use.",
    )
    args = parser.parse_args()

    education_columns = _parse_columns(args.education_columns)
    pension_columns = _parse_columns(args.pension_columns)

    con = connect_duckdb(args.warehouse_path)
    try:
        metrics = compute_cluster_metrics(
            con,
            table_name=args.table,
            education_columns=education_columns or None,
            pension_columns=pension_columns or None,
        )
    except ValueError as exc:
        print(f"Error: {exc}")
        sys.exit(2)
    finally:
        con.close()

    print(format_metrics(metrics))


if __name__ == "__main__":
    main()
