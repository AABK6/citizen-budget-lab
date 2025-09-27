from __future__ import annotations

import os
from typing import Any, Dict, Iterable, List, Optional, Tuple

from .models import Basis, MissionAllocation, ProcurementItem, Supplier
from .settings import get_settings


def _duckdb_path() -> str:
    s = get_settings()
    # settings.duckdb_path may contain relative segs; normalize
    p = s.duckdb_path
    # If it points to repo-relative default, fix path to data/warehouse.duckdb
    if not os.path.isabs(p):
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        return os.path.abspath(os.path.join(root, p))
    return p


def warehouse_available() -> bool:
    s = get_settings()
    if not s.warehouse_enabled:
        return False
    if s.warehouse_type.lower() == "duckdb":
        path = _duckdb_path()
        return os.path.exists(path)
    # Postgres optional, only if DSN provided
    return bool(s.pg_dsn)


def warehouse_status() -> dict:
    """Return status info about the warehouse and required relations."""
    s = get_settings()
    info = {
        "enabled": bool(s.warehouse_enabled),
        "type": s.warehouse_type,
        "available": False,
        "ready": False,
        "missing": [],
    }
    if not s.warehouse_enabled:
        return info
    try:
        con = _connect_duckdb() if s.warehouse_type == "duckdb" else None
    except Exception:
        return info
    info["available"] = True
    required = [
        "stg_state_budget_lines",
        "fct_admin_by_mission",
        "fct_admin_by_apu",
        "fct_admin_by_cofog",
        "vw_procurement_contracts",
    ]
    try:
        have = set(
            r[0]
            for r in con.execute(
                "select table_name from information_schema.tables"
            ).fetchall()
        )
        missing = [t for t in required if t not in have]
        info["missing"] = missing
        info["ready"] = len(missing) == 0
        return info
    except Exception:
        return info


def _connect_duckdb():  # noqa: ANN001
    import duckdb  # type: ignore

    path = _duckdb_path()
    # Open read-only when possible
    try:
        con = duckdb.connect(path, read_only=True)
    except Exception:
        con = duckdb.connect(path)
    # No default schema change; resolve fully-qualified names dynamically
    return con


def _qual_name(con, name: str) -> str:  # noqa: ANN001
    """Return a schema-qualified relation name for a bare table/view.

    Prefers common namespaces if multiple exist.
    """
    try:
        rows = con.execute(
            """
            select table_schema, table_name
            from information_schema.tables
            where table_name = ?
            order by case table_schema
                     when 'main_fact' then 0
                     when 'main_staging' then 1
                     when 'main_vw' then 2
                     else 3 end
            limit 1
            """,
            [name],
        ).fetchall()
        if rows:
            sch, nm = rows[0]
            return f"{sch}.{nm}"
    except Exception:
        pass
    # Fallback to bare name; may succeed if DB has default schema aliases
    return name


def table_counts(tables: list[str]) -> dict[str, int]:
    """Return row counts for requested tables/views if available.

    Silently skips missing relations.
    """
    out: dict[str, int] = {}
    s = get_settings()
    if not s.warehouse_enabled:
        return out
    try:
        con = _connect_duckdb() if s.warehouse_type == "duckdb" else None
    except Exception:
        return out
    try:
        all_rows = con.execute("select table_schema, table_name from information_schema.tables").fetchall()
        have = {(r[0], r[1]) for r in all_rows}
        names = {r[1]: r[0] for r in all_rows if r[1] not in locals()}
        for t in tables:
            # If present in any schema, count using that schema
            if t in [r[1] for r in all_rows]:
                qname = _qual_name(con, t)
                try:
                    cnt = con.execute(f"select count(*) from {qname}").fetchone()[0]
                    out[t] = int(cnt)
                except Exception:
                    continue
    except Exception:
        return out
    return out


def allocation_by_mission(year: int, basis: Basis) -> List[MissionAllocation]:
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    metric = "cp_eur" if basis == Basis.CP else "ae_eur"
    rel = _qual_name(con, "fct_admin_by_mission")
    sql = f"select mission_code, any_value(mission_label) as mission_label, sum({metric}) as amount from {rel} where year = ? group by mission_code order by amount desc"
    try:
        rows = con.execute(sql, [year]).fetchall()
    except Exception:
        return []
    total = sum(float(r[2] or 0.0) for r in rows)
    out: List[MissionAllocation] = []
    for code, label, amount in rows:
        amt = float(amount or 0.0)
        share = (amt / total) if total else 0.0
        out.append(MissionAllocation(code=str(code), label=str(label), amount_eur=amt, share=share))
    return out


def allocation_by_cofog(year: int, basis: Basis) -> List[MissionAllocation]:
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    metric = "cp_eur" if basis == Basis.CP else "ae_eur"
    rel = _qual_name(con, "fct_admin_by_cofog")
    sql = f"select cofog_code, any_value(cofog_label) as label, sum({metric}) as amount from {rel} where year = ? group by cofog_code order by amount desc"
    try:
        rows = con.execute(sql, [year]).fetchall()
    except Exception:
        return []
    total = sum(float(r[2] or 0.0) for r in rows)
    out: List[MissionAllocation] = []
    for code, label, amount in rows:
        amt = float(amount or 0.0)
        share = (amt / total) if total else 0.0
        out.append(MissionAllocation(code=str(code), label=str(label), amount_eur=amt, share=share))
    return out


def allocation_by_apu(year: int, basis: Basis) -> List[MissionAllocation]:
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    metric = "cp_eur" if basis == Basis.CP else "ae_eur"
    fact = _qual_name(con, "fct_admin_by_apu")
    dim = _qual_name(con, "dim_apu_subsector")
    sql = (
        f"select f.apu_subsector, any_value(coalesce(d.label, f.apu_subsector)) as label, "
        f"sum({metric}) as amount "
        f"from {fact} f "
        f"left join {dim} d on d.apu_subsector = f.apu_subsector "
        "where f.year = ? group by f.apu_subsector, label order by amount desc"
    )
    try:
        rows = con.execute(sql, [year]).fetchall()
    except Exception:
        return []
    total = sum(float(r[2] or 0.0) for r in rows)
    items: List[MissionAllocation] = []
    for code, label, amount in rows:
        amt = float(amount or 0.0)
        share = (amt / total) if total else 0.0
        items.append(MissionAllocation(code=str(code), label=str(label), amount_eur=amt, share=share))
    return items


def procurement_top_suppliers(
    year: int,
    region: str,
    *,
    cpv_prefix: Optional[str] = None,
    procedure_type: Optional[str] = None,
    min_amount_eur: Optional[float] = None,
    max_amount_eur: Optional[float] = None,
    top_n: int = 50,
) -> List[ProcurementItem]:
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    # Filter on staging view to preserve region filtering, then aggregate per supplier
    conds = ["year = ?", "location_code like ?"]
    params: List[Any] = [year, f"{region}%"]
    if cpv_prefix:
        conds.append("cpv_code like ?")
        params.append(f"{cpv_prefix}%")
    if procedure_type:
        conds.append("lower(procedure_type) = lower(?)")
        params.append(procedure_type)
    if min_amount_eur is not None:
        conds.append("amount_eur >= ?")
        params.append(float(min_amount_eur))
    if max_amount_eur is not None:
        conds.append("amount_eur <= ?")
        params.append(float(max_amount_eur))
    where_sql = " and ".join(conds)
    rel = _qual_name(con, "vw_procurement_contracts")
    sql = (
        "select supplier_siren, any_value(supplier_name) as supplier_name, "
        "sum(coalesce(amount_eur,0)) as amount, any_value(cpv_code) as cpv, "
        "any_value(procedure_type) as procedure_type, any_value(location_code) as location_code "
        f"from {rel} where {where_sql} group by supplier_siren order by amount desc limit {int(top_n)}"
    )
    try:
        rows = con.execute(sql, params).fetchall()
    except Exception:
        return []
    out: List[ProcurementItem] = []
    for siren, name, amount, cpv, proc, loc in rows:
        out.append(
            ProcurementItem(
                supplier=Supplier(siren=str(siren), name=str(name)),
                amount_eur=float(amount or 0.0),
                cpv=str(cpv or ""),
                procedure_type=str(proc or ""),
                location_code=str(loc or ""),
                source_url=f"https://www.data.gouv.fr/fr/search/?q={siren}",
            )
        )
    return out


def programmes_for_mission(year: int, basis: Basis, mission_code: str) -> List[MissionAllocation]:
    """Aggregate by programme for a mission from staging lines."""
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    metric = "cp_eur" if basis == Basis.CP else "ae_eur"
    rel = _qual_name(con, "stg_state_budget_lines")
    sql = f"select programme_code, any_value(programme_label) as label, sum({metric}) as amount from {rel} where year = ? and mission_code = ? group by programme_code order by amount desc"
    try:
        rows = con.execute(sql, [year, mission_code]).fetchall()
    except Exception:
        return []
    total = sum(float(r[2] or 0.0) for r in rows)
    out: List[MissionAllocation] = []
    for code, label, amount in rows:
        amt = float(amount or 0.0)
        share = (amt / total) if total else 0.0
        out.append(MissionAllocation(code=str(code), label=str(label), amount_eur=amt, share=share))
    return out


def cofog_mapping_reliable(year: int, basis: Basis) -> bool:
    """Heuristic: mapping considered reliable if totals match within 0.5% and there are >= 8 distinct COFOG majors.
    """
    if not warehouse_available():
        return False
    try:
        con = _connect_duckdb()
    except Exception:
        return False
    metric = "cp_eur" if basis == Basis.CP else "ae_eur"
    try:
        rel_mis = _qual_name(con, "fct_admin_by_mission")
        rel_cof = _qual_name(con, "fct_admin_by_cofog")
        tm = con.execute(f"select sum({metric}) from {rel_mis} where year = ?", [year]).fetchone()[0] or 0.0
        tc = con.execute(f"select sum({metric}) from {rel_cof} where year = ?", [year]).fetchone()[0] or 0.0
        k = con.execute(f"select count(distinct cofog_code) from {rel_cof} where year = ?", [year]).fetchone()[0] or 0
    except Exception:
        return False
    if tm <= 0 or tc <= 0:
        return False
    ratio = abs(tm - tc) / tm
    distinct = int(k or 0)
    min_required = 8 if tm >= 1_000_000_000_000 else 5
    return ratio <= 0.005 and distinct >= min_required


def lego_baseline(year: int) -> Optional[Dict[str, Any]]:
    """Return LEGO baseline data for a given year from the warehouse."""
    if not warehouse_available():
        return None
    try:
        con = _connect_duckdb()
    except Exception:
        return None
    bl_rel = _qual_name(con, "fct_lego_baseline")
    p_rel = _qual_name(con, "dim_lego_pieces")
    sql = f"""
        select
            b.piece_id,
            p.piece_type,
            p.piece_label,
            b.amount_eur,
            b.share,
            b.scope,
            b.mission_mapping
        from {bl_rel} b
        join {p_rel} p on b.piece_id = p.piece_id
        where b.year = ?
    """
    try:
        rows = con.execute(sql, [year]).fetchall()
    except Exception:
        return None
    if not rows:
        return None

    pieces = []
    dep_total = 0.0
    rev_total = 0.0
    scope_val = None
    for pid, ptype, plabel, amount, share, scope, missions in rows:
        amt = float(amount or 0.0)
        pieces.append({
            "id": pid,
            "type": ptype,
            "label": plabel,
            "amount_eur": amt,
            "share": share,
            "missions": missions,
        })
        if isinstance(scope, str) and not scope_val:
            scope_val = scope
        if str(ptype) == "expenditure":
            dep_total += amt
        elif str(ptype) == "revenue":
            rev_total += amt

    return {
        "year": year,
        "scope": scope_val,
        "pieces": pieces,
        "depenses_total_eur": dep_total,
        "recettes_total_eur": rev_total,
    }


def budget_baseline_2026() -> List[Dict[str, Any]]:
    """Return mission-level PLF 2026 baseline rows from the warehouse."""
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    rel = _qual_name(con, "fct_simulation_baseline_2026")
    sql = f"""
        select
            mission_code,
            mission_label,
            cp_2025_eur,
            plf_2026_ceiling_eur,
            ceiling_delta_eur,
            ceiling_delta_pct,
            revenue_adjustment_eur,
            total_revenue_change_eur,
            revenue_growth_multiplier,
            gdp_growth_pct,
            inflation_pct,
            unemployment_rate_pct,
            net_fiscal_space_eur
        from {rel}
        order by mission_code
    """
    try:
        rows = con.execute(sql).fetchall()
        cols = [c[0] for c in con.description]
    except Exception:
        return []
    out: List[Dict[str, Any]] = []
    for row in rows:
        rec = {cols[idx]: row[idx] for idx in range(len(cols))}
        out.append(rec)
    return out
