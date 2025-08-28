from __future__ import annotations

import base64
import csv
import datetime as dt
import io
import os
import uuid
from collections import defaultdict
from typing import Dict, Iterable, List, Tuple

import yaml

from .models import (
    Accounting,
    Allocation,
    Basis,
    Compliance,
    MacroResult,
    MissionAllocation,
    ProcurementItem,
    Supplier,
)
from .validation import validate_scenario


DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
STATE_BUDGET_CSV = os.path.join(DATA_DIR, "sample_state_budget.csv")
PROCUREMENT_CSV = os.path.join(DATA_DIR, "sample_procurement.csv")
GDP_CSV = os.path.join(DATA_DIR, "gdp_series.csv")
BASELINE_DEF_DEBT_CSV = os.path.join(DATA_DIR, "baseline_deficit_debt.csv")
COFOG_MAP_JSON = os.path.join(DATA_DIR, "cofog_mapping.json")
MACRO_IRF_JSON = os.path.join(DATA_DIR, "macro_irfs.json")


def _read_csv(path: str) -> Iterable[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row


def allocation_by_mission(year: int, basis: Basis) -> Allocation:
    total = 0.0
    agg: Dict[Tuple[str, str], float] = defaultdict(float)
    for row in _read_csv(STATE_BUDGET_CSV):
        if int(row["year"]) != year:
            continue
        key = (row["mission_code"], row["mission_label"])
        val = float(row["cp_eur"]) if basis == Basis.CP else float(row["ae_eur"])
        agg[key] += val
        total += val
    missions: List[MissionAllocation] = []
    for (code, label), amount in sorted(agg.items(), key=lambda x: x[1], reverse=True):
        share = (amount / total) if total else 0.0
        missions.append(MissionAllocation(code=code, label=label, amount_eur=amount, share=share))
    return Allocation(mission=missions)


_COFOG_LABELS = {
    "01": "General public services",
    "02": "Defense",
    "03": "Public order",
    "04": "Economic affairs",
    "05": "Environment",
    "06": "Housing",
    "07": "Health",
    "08": "Recreation, culture",
    "09": "Education",
    "10": "Social protection",
}


def allocation_by_cofog(year: int, basis: Basis) -> List[MissionAllocation]:
    cfg = _load_json(COFOG_MAP_JSON)
    mission_map = cfg.get("mission_to_cofog", {})
    # Aggregate mission values
    mission_amounts: Dict[str, float] = {}
    total = 0.0
    for row in _read_csv(STATE_BUDGET_CSV):
        if int(row["year"]) != year:
            continue
        val = float(row["cp_eur"]) if basis == Basis.CP else float(row["ae_eur"])
        mission_amounts[row["mission_code"]] = mission_amounts.get(row["mission_code"], 0.0) + val
        total += val
    by_cofog: Dict[str, float] = defaultdict(float)
    for m_code, amt in mission_amounts.items():
        mapping = mission_map.get(m_code, [])
        if not mapping:
            continue
        for d in mapping:
            by_cofog[str(d["code"])[:2]] += amt * float(d["weight"])
    items: List[MissionAllocation] = []
    for code, amount in sorted(by_cofog.items(), key=lambda x: x[1], reverse=True):
        items.append(
            MissionAllocation(
                code=code,
                label=_COFOG_LABELS.get(code, code),
                amount_eur=amount,
                share=(amount / total) if total else 0.0,
            )
        )
    return items


def procurement_top_suppliers(year: int, region: str, top_n: int = 10) -> List[ProcurementItem]:
    # Aggregate by supplier within region code prefix (e.g., "75")
    by_supplier: Dict[str, Dict[str, float | str]] = {}
    for row in _read_csv(PROCUREMENT_CSV):
        signed = dt.date.fromisoformat(row["signed_date"]) if row["signed_date"] else None
        if not signed or signed.year != year:
            continue
        if not row["location_code"].startswith(region):
            continue
        siren = row["supplier_siren"]
        amount = float(row["amount_eur"]) if row["amount_eur"] else 0.0
        ent = by_supplier.setdefault(
            siren,
            {
                "name": row.get("supplier_name") or siren,
                "amount": 0.0,
                "cpv": row.get("cpv_code"),
                "procedure_type": row.get("procedure_type"),
            },
        )
        ent["amount"] = float(ent["amount"]) + amount
    items: List[ProcurementItem] = []
    for siren, ent in sorted(by_supplier.items(), key=lambda x: x[1]["amount"], reverse=True)[:top_n]:
        items.append(
            ProcurementItem(
                supplier=Supplier(siren=siren, name=str(ent["name"])),
                amount_eur=float(ent["amount"]),
                cpv=str(ent.get("cpv") or ""),
                procedure_type=str(ent.get("procedure_type") or ""),
            )
        )
    return items


def _decode_yaml_base64(b64: str) -> dict:
    raw = base64.b64decode(b64)
    return yaml.safe_load(io.BytesIO(raw)) or {}


def _read_gdp_series() -> Dict[int, float]:
    out: Dict[int, float] = {}
    for row in _read_csv(GDP_CSV):
        out[int(row["year"])] = float(row["gdp_eur"])
    return out


def _read_baseline_def_debt() -> Dict[int, Tuple[float, float]]:
    out: Dict[int, Tuple[float, float]] = {}
    for row in _read_csv(BASELINE_DEF_DEBT_CSV):
        out[int(row["year"])] = (float(row["deficit_eur"]), float(row["debt_eur"]))
    return out


def _load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _map_action_to_cofog(action: dict) -> List[Tuple[str, float]]:
    """
    Returns a list of (category, weight) e.g., [("09", 1.0)] or [("tax.ir", 1.0)].
    """
    cfg = _load_json(COFOG_MAP_JSON)
    target = str(action.get("target", ""))
    if target.startswith("tax.ir"):
        return [("tax.ir", 1.0)]
    # mission.<code-or-name>
    if target.startswith("mission."):
        # Accept mission label (e.g., education) or code
        key = target.split(".", 1)[1]
        # Try treat as code
        if key.isdigit() and key in cfg["mission_to_cofog"]:
            return [(d["code"], float(d["weight"])) for d in cfg["mission_to_cofog"][key]]
        # Try mapping by label via sample CSV (first matching mission label)
        # Build label->code map lazily from sample data
        label_to_code: Dict[str, str] = {}
        for row in _read_csv(STATE_BUDGET_CSV):
            label_to_code[row["mission_label"].strip().lower()] = row["mission_code"]
        code = label_to_code.get(key.replace("_", " ").lower())
        if code and code in cfg["mission_to_cofog"]:
            return [(d["code"], float(d["weight"])) for d in cfg["mission_to_cofog"][code]]
    return []


def _macro_kernel(horizon: int, shocks_pct_gdp: Dict[str, List[float]], gdp_series: List[float]) -> MacroResult:
    params = _load_json(MACRO_IRF_JSON)
    H = int(params.get("horizon", horizon))
    okun = float(params.get("okun_elasticity", 0.4))
    rev_el = float(params.get("revenue_elasticity", 0.5))
    cats = params.get("categories", {})

    delta_gdp_pct: List[float] = [0.0] * H
    for k, s_path in shocks_pct_gdp.items():
        if k not in cats:
            continue
        irf = cats[k]["irf_gdp"]
        for t in range(H):
            # Convolution: sum_h irf[h] * s[t-h]
            for h in range(0, t + 1):
                delta_gdp_pct[t] += irf[h] * s_path[t - h]

    # Convert GDP pct to euros using baseline GDP series for each year
    delta_gdp_eur: List[float] = [delta_gdp_pct[t] * gdp_series[t] / 100.0 for t in range(H)]
    # Employment via Okun
    delta_emp_index: List[float] = [okun * delta_gdp_pct[t] for t in range(H)]
    # Automatic stabilizers effect on deficit: -rev_elasticity * dY
    delta_def_eur: List[float] = [-rev_el * delta_gdp_eur[t] for t in range(H)]

    return MacroResult(
        delta_gdp=delta_gdp_eur,
        delta_employment=delta_emp_index,
        delta_deficit=delta_def_eur,
        assumptions={"okun_elasticity": okun, "revenue_elasticity": rev_el},
    )


def run_scenario(dsl_b64: str) -> tuple[str, Accounting, Compliance, MacroResult]:
    data = _decode_yaml_base64(dsl_b64)
    validate_scenario(data)
    horizon_years = int((data.get("assumptions") or {}).get("horizon_years", 5))
    baseline_year = int(data.get("baseline_year", 2026))
    actions = data.get("actions") or []

    # Simple mechanical layer: sum CP deltas by year; recurring applies each year
    deltas_by_year = [0.0 for _ in range(horizon_years)]
    # Macro shocks accumulator by COFOG/tax category in % of GDP
    gdp_series_map = _read_gdp_series()
    gdp_series = [gdp_series_map.get(baseline_year + i, list(gdp_series_map.values())[-1]) for i in range(horizon_years)]
    shocks_pct_gdp: Dict[str, List[float]] = {}
    for act in actions:
        op = (act.get("op") or "").lower()
        recurring = bool(act.get("recurring", False))
        dim = (act.get("dimension") or "cp").lower()
        if dim not in ("cp", "ae", "tax"):
            continue
        amount = 0.0
        if "amount_eur" in act and dim in ("cp", "ae"):
            amount = float(act["amount_eur"]) * (1 if op == "increase" else -1 if op == "decrease" else 0)
            if amount != 0.0:
                if recurring:
                    for i in range(horizon_years):
                        deltas_by_year[i] += amount
                else:
                    deltas_by_year[0] += amount
                # Map to macro categories for shocks (% GDP)
                for cat, w in _map_action_to_cofog(act):
                    path = shocks_pct_gdp.setdefault(cat, [0.0] * horizon_years)
                    shock_eur = amount * float(w)
                    if recurring:
                        for i in range(horizon_years):
                            path[i] += 100.0 * shock_eur / gdp_series[i]
                    else:
                        path[0] += 100.0 * shock_eur / gdp_series[0]
        # Basic tax op handling: rate change approximated as revenue change proxy (stub)
        if dim == "tax" and "delta_bps" in act:
            for cat, w in _map_action_to_cofog(act):
                path = shocks_pct_gdp.setdefault(cat, [0.0] * horizon_years)
                # Assume 1bp IR cut ~ 0.001% GDP negative revenue in first year only (placeholder)
                bps = float(act["delta_bps"])  # negative for cut
                shock_pct = -0.001 * bps * float(w)
                if recurring:
                    for i in range(horizon_years):
                        path[i] += shock_pct
                else:
                    path[0] += shock_pct

    # Deficit path = sum of deltas (positive increases deficit)
    deficit_path = [float(x) for x in deltas_by_year]
    debt_path: List[float] = []
    debt = 0.0
    for d in deficit_path:
        debt += d
        debt_path.append(float(debt))

    # Macro kernel
    macro = _macro_kernel(horizon_years, shocks_pct_gdp, gdp_series)

    # Baseline series for compliance
    base_map = _read_baseline_def_debt()
    eu3 = []
    debt_ratio = []
    for i in range(horizon_years):
        year = baseline_year + i
        base_def, base_debt = base_map.get(year, (0.0, 0.0))
        total_def = base_def + deficit_path[i] + macro.delta_deficit[i]
        total_debt = base_debt + debt_path[i]
        ratio_def = total_def / gdp_series[i]
        eu3.append("breach" if ratio_def < -0.03 else "ok")
        debt_ratio.append((total_debt / gdp_series[i]))
    eu60 = ["above" if r > 0.60 else "info" for r in debt_ratio]

    comp = Compliance(
        eu3pct=eu3,
        eu60pct=eu60,
        net_expenditure=["n/a" for _ in range(horizon_years)],
        local_balance=["n/a" for _ in range(horizon_years)],
    )

    acc = Accounting(deficit_path=deficit_path, debt_path=debt_path)
    return str(uuid.uuid4()), acc, comp, macro
