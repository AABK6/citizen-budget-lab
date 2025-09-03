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


def _connect_duckdb():  # noqa: ANN001
    import duckdb  # type: ignore

    path = _duckdb_path()
    # Open read-only when possible
    try:
        con = duckdb.connect(path, read_only=True)
    except Exception:
        con = duckdb.connect(path)
    return con


def allocation_by_mission(year: int, basis: Basis) -> List[MissionAllocation]:
    if not warehouse_available():
        return []
    try:
        con = _connect_duckdb()
    except Exception:
        return []
    metric = "cp_eur" if basis == Basis.CP else "ae_eur"
    sql = f"""
        select mission_code, any_value(mission_label) as mission_label, sum({metric}) as amount
        from fct_admin_by_mission
        where year = ?
        group by mission_code
        order by amount desc
    """
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
    # fct_admin_by_cofog has totals per major code + labels
    sql = f"""
        select cofog_code, any_value(cofog_label) as label, sum({metric}) as amount
        from fct_admin_by_cofog
        where year = ?
        group by cofog_code
        order by amount desc
    """
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
    sql = f"""
        select supplier_siren,
               any_value(supplier_name) as supplier_name,
               sum(coalesce(amount_eur,0)) as amount,
               any_value(cpv_code) as cpv,
               any_value(procedure_type) as procedure_type,
               any_value(location_code) as location_code
        from vw_procurement_contracts
        where {where_sql}
        group by supplier_siren
        order by amount desc
        limit {int(top_n)}
    """
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

