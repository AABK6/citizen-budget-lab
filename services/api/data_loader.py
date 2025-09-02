from __future__ import annotations

import base64
import csv
import datetime as dt
import io
import os
from collections import defaultdict
import json
import hashlib
from typing import Dict, Iterable, List, Tuple

import yaml

from .models import (
    Accounting,
    Allocation,
    Basis,
    Compliance,
    Source,
    MacroResult,
    MissionAllocation,
    ProcurementItem,
    Supplier,
)
from .validation import validate_scenario
from .settings import get_settings


DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
CACHE_DIR = os.path.join(DATA_DIR, "cache")
STATE_BUDGET_CSV = os.path.join(DATA_DIR, "sample_state_budget.csv")
PROCUREMENT_CSV = os.path.join(DATA_DIR, "sample_procurement.csv")
GDP_CSV = os.path.join(DATA_DIR, "gdp_series.csv")
BASELINE_DEF_DEBT_CSV = os.path.join(DATA_DIR, "baseline_deficit_debt.csv")
COFOG_MAP_JSON = os.path.join(DATA_DIR, "cofog_mapping.json")
MACRO_IRF_JSON = os.path.join(DATA_DIR, "macro_irfs.json")
SOURCES_JSON = os.path.join(DATA_DIR, "sources.json")
LEGO_PIECES_JSON = os.path.join(DATA_DIR, "lego_pieces.json")


def _read_csv(path: str) -> Iterable[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row


def _state_budget_path(year: int) -> str:
    """Prefer a cached mission-level snapshot for the requested year if present."""
    cached = os.path.join(CACHE_DIR, f"state_budget_mission_{year}.csv")
    return cached if os.path.exists(cached) else STATE_BUDGET_CSV


def allocation_by_mission(year: int, basis: Basis) -> Allocation:
    total = 0.0
    agg: Dict[Tuple[str, str], float] = defaultdict(float)
    for row in _read_csv(_state_budget_path(year)):
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
    for row in _read_csv(_state_budget_path(year)):
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


def allocation_by_beneficiary(year: int) -> List[MissionAllocation]:
    """Aggregate expenditures by implied beneficiary categories using LEGO baseline.

    Categories:
    - HH: households (D.62 benefits + D.1 public wages proxy via piece config)
    - ENT: enterprises (D.3 subsidies + P.2 intermediate purchases proxy)
    - COL: collective (P.51g investment and residual public services)

    Falls back to zeros if baseline is missing.
    """
    try:
        bl = load_lego_baseline(year)  # type: ignore  # imported at runtime in schema
        cfg = load_lego_config()  # type: ignore
    except Exception:
        bl, cfg = None, None
    if not bl or not cfg:
        return [
            MissionAllocation(code="HH", label="Households", amount_eur=0.0, share=0.0),
            MissionAllocation(code="ENT", label="Enterprises", amount_eur=0.0, share=0.0),
            MissionAllocation(code="COL", label="Collective", amount_eur=0.0, share=0.0),
        ]
    # Map piece id -> beneficiaries weights
    weights: Dict[str, Dict[str, float]] = {}
    for p in cfg.get("pieces", []):
        pid = str(p.get("id"))
        b = p.get("beneficiaries") or {}
        weights[pid] = {
            "HH": float(b.get("households", 0.0)),
            "ENT": float(b.get("enterprises", 0.0)),
            "COL": float(b.get("collective", 0.0)),
        }
    totals = {"HH": 0.0, "ENT": 0.0, "COL": 0.0}
    dep_total = 0.0
    for ent in bl.get("pieces", []):
        if str(ent.get("type")) != "expenditure":
            continue
        pid = str(ent.get("id"))
        amt = ent.get("amount_eur")
        if not isinstance(amt, (int, float)):
            continue
        dep_total += float(amt)
        w = weights.get(pid) or {"HH": 0.0, "ENT": 0.0, "COL": 0.0}
        for k in ("HH", "ENT", "COL"):
            totals[k] += float(amt) * float(w.get(k, 0.0))
    out = []
    for code, label in [("HH", "Households"), ("ENT", "Enterprises"), ("COL", "Collective")]:
        amt = totals[code]
        share = (amt / dep_total) if dep_total > 0 else 0.0
        out.append(MissionAllocation(code=code, label=label, amount_eur=amt, share=share))
    # Sort desc by amount
    out.sort(key=lambda x: x.amount_eur, reverse=True)
    return out


def procurement_top_suppliers(
    year: int,
    region: str,
    top_n: int = 10,
    cpv_prefix: str | None = None,
    procedure_type: str | None = None,
    min_amount_eur: float | None = None,
    max_amount_eur: float | None = None,
) -> List[ProcurementItem]:
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
        # Filters
        if cpv_prefix and not (row.get("cpv_code") or "").startswith(cpv_prefix):
            continue
        if procedure_type and (row.get("procedure_type") or "").lower() != procedure_type.lower():
            continue
        if min_amount_eur is not None and amount < float(min_amount_eur):
            continue
        if max_amount_eur is not None and amount > float(max_amount_eur):
            continue
        ent = by_supplier.setdefault(
            siren,
            {
                "name": row.get("supplier_name") or siren,
                "amount": 0.0,
                "cpv": row.get("cpv_code"),
                "procedure_type": row.get("procedure_type"),
                "location_code": row.get("location_code"),
                "source_url": f"https://www.data.gouv.fr/fr/search/?q={siren}",
            },
        )
        ent["amount"] = float(ent["amount"]) + amount
        # Update non-aggregated fields if missing
        if not ent.get("cpv") and row.get("cpv_code"):
            ent["cpv"] = row.get("cpv_code")
        if not ent.get("procedure_type") and row.get("procedure_type"):
            ent["procedure_type"] = row.get("procedure_type")
        if not ent.get("location_code") and row.get("location_code"):
            ent["location_code"] = row.get("location_code")
    items: List[ProcurementItem] = []
    for siren, ent in sorted(by_supplier.items(), key=lambda x: x[1]["amount"], reverse=True)[:top_n]:
        items.append(
            ProcurementItem(
                supplier=Supplier(siren=siren, name=str(ent["name"])),
                amount_eur=float(ent["amount"]),
                cpv=str(ent.get("cpv") or ""),
                procedure_type=str(ent.get("procedure_type") or ""),
                location_code=str(ent.get("location_code") or ""),
                source_url=str(ent.get("source_url") or ""),
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


def list_sources() -> List[Source]:
    raw = _load_json(SOURCES_JSON) or []
    out: List[Source] = []
    for r in raw:
        out.append(
            Source(
                id=str(r.get("id")),
                dataset_name=str(r.get("dataset_name")),
                url=str(r.get("url")),
                license=str(r.get("license")),
                refresh_cadence=str(r.get("refresh_cadence")),
                vintage=str(r.get("vintage")),
            )
        )
    return out


# --------------------------
# LEGO pieces & baselines
# --------------------------

def _read_file_json(path: str) -> dict | list:
    import json as _json

    with open(path, "r", encoding="utf-8") as f:
        return _json.load(f)


def _lego_baseline_path(year: int) -> str:
    return os.path.join(CACHE_DIR, f"lego_baseline_{year}.json")


def load_lego_config() -> dict:
    return _read_file_json(LEGO_PIECES_JSON)


def load_lego_baseline(year: int) -> dict | None:
    path = _lego_baseline_path(year)
    if not os.path.exists(path):
        return None
    try:
        return _read_file_json(path)
    except Exception:
        return None


def lego_pieces_with_baseline(year: int, scope: str = "S13") -> List[dict]:
    cfg = load_lego_config()
    baseline = load_lego_baseline(year)
    amounts: dict[str, float | None] = {}
    shares: dict[str, float | None] = {}
    if baseline and str(baseline.get("scope", "")).upper() == scope.upper():
        for ent in baseline.get("pieces", []):
            pid = str(ent.get("id"))
            amounts[pid] = ent.get("amount_eur")
            shares[pid] = ent.get("share")
    out: List[dict] = []
    for p in cfg.get("pieces", []):
        pid = str(p.get("id"))
        pol = p.get("policy") or {}
        out.append(
            {
                "id": pid,
                "label": p.get("label"),
                "type": p.get("type"),
                "amount_eur": amounts.get(pid),
                "share": shares.get(pid),
                "beneficiaries": p.get("beneficiaries") or {},
                "examples": p.get("examples") or [],
                "sources": p.get("sources") or [],
                "locked": bool(pol.get("locked_default", False)),
            }
        )
    return out


def lego_distance_from_dsl(year: int, dsl_b64: str, scope: str = "S13") -> dict:
    """Compute a simple distance between the baseline shares and a scenario that tweaks piece.* targets.

    - Decode DSL, parse actions with target: piece.<id>
    - Apply amount_eur (increase/decrease/set) or delta_pct on expenditure pieces only (v0)
    - Recompute shares and return L1 distance with per-piece deltas.
    """
    baseline = load_lego_baseline(year)
    cfg = load_lego_config()
    if not baseline or str(baseline.get("scope", "")).upper() != scope.upper():
        return {"score": 0.0, "byPiece": []}
    # Build current amounts and shares for expenditures only
    amounts: dict[str, float] = {}
    shares: dict[str, float] = {}
    ptypes: dict[str, str] = {str(p.get("id")): str(p.get("type")) for p in cfg.get("pieces", [])}
    for ent in baseline.get("pieces", []):
        pid = str(ent.get("id"))
        if ptypes.get(pid) != "expenditure":
            continue
        ae = ent.get("amount_eur")
        if isinstance(ae, (int, float)):
            amounts[pid] = float(ae)
            sh = ent.get("share")
            shares[pid] = float(sh) if isinstance(sh, (int, float)) else 0.0
    if not amounts:
        return {"score": 0.0, "byPiece": []}

    # Decode DSL
    data = _decode_yaml_base64(dsl_b64)
    actions = data.get("actions") or []

    def _apply(pid: str, op: str, amt_eur: float | None, delta_pct: float | None):
        if pid not in amounts:
            return
        cur = amounts[pid]
        if op == "set" and amt_eur is not None:
            amounts[pid] = max(0.0, float(amt_eur))
            return
        if amt_eur is not None:
            if op == "increase":
                amounts[pid] = max(0.0, cur + float(amt_eur))
            elif op == "decrease":
                amounts[pid] = max(0.0, cur - float(amt_eur))
        elif delta_pct is not None:
            factor = 1.0 + float(delta_pct) / 100.0
            amounts[pid] = max(0.0, cur * factor)

    for act in actions:
        target = str(act.get("target", ""))
        if not target.startswith("piece."):
            continue
        pid = target.split(".", 1)[1]
        op = str(act.get("op", "increase")).lower()
        amt = act.get("amount_eur")
        amt_eur = float(amt) if isinstance(amt, (int, float)) else None
        dp = act.get("delta_pct")
        delta_pct = float(dp) if isinstance(dp, (int, float)) else None
        _apply(pid, op, amt_eur, delta_pct)

    # New shares
    total = sum(amounts.values())
    if total <= 0:
        return {"score": 0.0, "byPiece": []}
    deltas: List[dict] = []
    score = 0.0
    for pid, old_share in shares.items():
        new_share = amounts[pid] / total
        d = abs(new_share - old_share)
        deltas.append({"id": pid, "shareDelta": d})
        score += d
    return {"score": score, "byPiece": deltas}


def _map_action_to_cofog(action: dict, baseline_year: int) -> List[Tuple[str, float]]:
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
        for row in _read_csv(_state_budget_path(baseline_year)):
            label_to_code[row["mission_label"].strip().lower()] = row["mission_code"]
        code = label_to_code.get(key.replace("_", " ").lower())
        if code and code in cfg["mission_to_cofog"]:
            return [(d["code"], float(d["weight"])) for d in cfg["mission_to_cofog"][code]]
    return []


def _macro_kernel(horizon: int, shocks_pct_gdp: Dict[str, List[float]], gdp_series: List[float]) -> MacroResult:
    params = _load_json(MACRO_IRF_JSON)
    H_param = int(params.get("horizon", horizon))
    T = min(int(horizon), len(gdp_series), H_param)
    okun = float(params.get("okun_elasticity", 0.4))
    rev_el = float(params.get("revenue_elasticity", 0.5))
    cats = params.get("categories", {})

    delta_gdp_pct: List[float] = [0.0] * T
    for k, s_path in shocks_pct_gdp.items():
        if k not in cats:
            continue
        irf = list(cats[k]["irf_gdp"])
        for t in range(T):
            # Convolution: sum_h irf[h] * s[t-h]
            max_h = min(len(irf) - 1, t)
            for h in range(0, max_h + 1):
                if (t - h) < 0 or (t - h) >= len(s_path):
                    continue
                delta_gdp_pct[t] += irf[h] * s_path[t - h]

    # Convert GDP pct to euros using baseline GDP series for each year
    delta_gdp_eur: List[float] = [delta_gdp_pct[t] * gdp_series[t] / 100.0 for t in range(T)]
    # Employment via Okun
    delta_emp_index: List[float] = [okun * delta_gdp_pct[t] for t in range(T)]
    # Automatic stabilizers effect on deficit: -rev_elasticity * dY
    delta_def_eur: List[float] = [-rev_el * delta_gdp_eur[t] for t in range(T)]

    return MacroResult(
        delta_gdp=delta_gdp_eur,
        delta_employment=delta_emp_index,
        delta_deficit=delta_def_eur,
        assumptions={"okun_elasticity": okun, "revenue_elasticity": rev_el},
    )



def run_scenario(dsl_b64: str) -> tuple[str, Accounting, Compliance, MacroResult]:
    data = _decode_yaml_base64(dsl_b64)
    validate_scenario(data)
    # Deterministic scenario ID from canonicalized DSL
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    sid = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    horizon_years = int((data.get("assumptions") or {}).get("horizon_years", 5))
    baseline_year = int(data.get("baseline_year", 2026))
    actions = data.get("actions") or []

    # Simple mechanical layer: sum CP deltas by year; recurring applies each year
    deltas_by_year = [0.0 for _ in range(horizon_years)]
    # Macro shocks accumulator by COFOG/tax category in % of GDP
    gdp_series_map = _read_gdp_series()
    gdp_series = [gdp_series_map.get(baseline_year + i, list(gdp_series_map.values())[-1]) for i in range(horizon_years)]
    shocks_pct_gdp: Dict[str, List[float]] = {}
    # Preload LEGO baseline/config to support piece.* targets
    lego_bl = None
    lego_types: Dict[str, str] = {}
    lego_cofog_map: Dict[str, List[Tuple[str, float]]] = {}
    try:
        lego_bl = load_lego_baseline(baseline_year)
    except Exception:
        lego_bl = None
    try:
        lego_cfg = load_lego_config()
        for p in lego_cfg.get("pieces", []):
            pid = str(p.get("id"))
            lego_types[pid] = str(p.get("type", "expenditure"))
            cof = []
            for mc in (p.get("mapping", {}).get("cofog") or []):
                cof.append((str(mc.get("code")), float(mc.get("weight", 1.0))))
            if cof:
                lego_cofog_map[pid] = cof
    except Exception:
        pass

    lego_amounts: Dict[str, float] = {}
    lego_elast: Dict[str, float] = {}
    lego_policy: Dict[str, dict] = {}
    if lego_bl:
        for ent in lego_bl.get("pieces", []):
            pid = str(ent.get("id"))
            try:
                val = float(ent.get("amount_eur"))
            except Exception:
                continue
            lego_amounts[pid] = val
    try:
        for p in lego_cfg.get("pieces", []):  # type: ignore[union-attr]
            pid = str(p.get("id"))
            el = p.get("elasticity") or {}
            v = el.get("value")
            if isinstance(v, (int, float)):
                lego_elast[pid] = float(v)
            pol = p.get("policy") or {}
            if pol:
                lego_policy[pid] = pol
    except Exception:
        pass

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
                for cat, w in _map_action_to_cofog(act, baseline_year):
                    path = shocks_pct_gdp.setdefault(cat, [0.0] * horizon_years)
                    shock_eur = amount * float(w)
                    if recurring:
                        for i in range(horizon_years):
                            path[i] += 100.0 * shock_eur / gdp_series[i]
                    else:
                        path[0] += 100.0 * shock_eur / gdp_series[0]
        # Basic tax op handling: rate change approximated as revenue change proxy (stub)
        if dim == "tax" and "delta_bps" in act:
            for cat, w in _map_action_to_cofog(act, baseline_year):
                path = shocks_pct_gdp.setdefault(cat, [0.0] * horizon_years)
                # Assume 1bp IR cut ~ 0.001% GDP negative revenue in first year only (placeholder)
                bps = float(act["delta_bps"])  # negative for cut
                shock_pct = -0.001 * bps * float(w)
                if recurring:
                    for i in range(horizon_years):
                        path[i] += shock_pct
                else:
                    path[0] += shock_pct

        # piece.* targets (LEGO pieces), v0: expenditures only
        target = str(act.get("target", ""))
        if target.startswith("piece."):
            pid = target.split(".", 1)[1]
            # Guardrails: unknown piece id
            if pid not in lego_types:
                raise ValueError(f"Unknown LEGO piece id: '{pid}'")
            ptype = lego_types.get(pid, "expenditure")
            pol = lego_policy.get(pid) or {}
            # Guardrails: locked_default
            if bool(pol.get("locked_default", False)):
                raise ValueError(f"Piece '{pid}' is locked by default and cannot be modified")
            base_amt = float(lego_amounts.get(pid, 0.0))
            amt_eur = act.get("amount_eur")
            dp = act.get("delta_pct")
            delta = 0.0
            # Bounds enforcement helpers
            def _enforce_bounds_amount_change(change: float) -> None:
                bounds_pct = pol.get("bounds_pct") or {}
                bounds_amt = pol.get("bounds_amount_eur") or {}
                # Percent bounds relative to base
                if isinstance(bounds_pct, dict) and base_amt > 0:
                    try:
                        bmin = float(bounds_pct.get("min")) if bounds_pct.get("min") is not None else None
                        bmax = float(bounds_pct.get("max")) if bounds_pct.get("max") is not None else None
                    except Exception:
                        bmin = bmax = None
                    if bmax is not None and change > base_amt * (bmax / 100.0) + 1e-9:
                        raise ValueError(
                            f"Piece '{pid}' change exceeds +{bmax:.2f}% bound (requested {change:.2f} EUR)"
                        )
                    if bmin is not None and change < base_amt * (bmin / 100.0) - 1e-9:
                        raise ValueError(
                            f"Piece '{pid}' change exceeds {bmin:.2f}% lower bound (requested {change:.2f} EUR)"
                        )
                # Absolute amount bounds on the new value
                if isinstance(bounds_amt, dict):
                    try:
                        amin = float(bounds_amt.get("min")) if bounds_amt.get("min") is not None else None
                        amax = float(bounds_amt.get("max")) if bounds_amt.get("max") is not None else None
                    except Exception:
                        amin = amax = None
                    new_val = base_amt + change
                    if amin is not None and new_val < amin - 1e-9:
                        raise ValueError(
                            f"Piece '{pid}' result {new_val:.2f} EUR below min bound {amin:.2f} EUR"
                        )
                    if amax is not None and new_val > amax + 1e-9:
                        raise ValueError(
                            f"Piece '{pid}' result {new_val:.2f} EUR above max bound {amax:.2f} EUR"
                        )
            def _enforce_bounds_pct(pct: float) -> None:
                bounds_pct = pol.get("bounds_pct") or {}
                if isinstance(bounds_pct, dict):
                    try:
                        bmin = float(bounds_pct.get("min")) if bounds_pct.get("min") is not None else None
                        bmax = float(bounds_pct.get("max")) if bounds_pct.get("max") is not None else None
                    except Exception:
                        bmin = bmax = None
                    if bmin is not None and pct < bmin - 1e-9:
                        raise ValueError(
                            f"Piece '{pid}' percent change {pct:.2f}% below min {bmin:.2f}%"
                        )
                    if bmax is not None and pct > bmax + 1e-9:
                        raise ValueError(
                            f"Piece '{pid}' percent change {pct:.2f}% above max {bmax:.2f}%"
                        )
            if amt_eur is not None:
                try:
                    val = float(amt_eur)
                except Exception:
                    val = 0.0
                if ptype == "expenditure":
                    if op == "increase":
                        _enforce_bounds_amount_change(val)
                        delta = val
                    elif op == "decrease":
                        _enforce_bounds_amount_change(-val)
                        delta = -val
                    elif op == "set":
                        new_val = float(val)
                        change = new_val - base_amt
                        _enforce_bounds_amount_change(change)
                        delta = change
                else:  # revenue — positive revenue reduces deficit
                    if op == "increase":
                        _enforce_bounds_amount_change(val)
                        delta = -val
                    elif op == "decrease":
                        _enforce_bounds_amount_change(-val)
                        delta = val
                    elif op == "set":
                        new_val = float(val)
                        change = new_val - base_amt
                        _enforce_bounds_amount_change(change)
                        delta = -change
            elif dp is not None:
                try:
                    pct = float(dp)
                except Exception:
                    pct = 0.0
                sign = 1.0 if op != "decrease" else -1.0
                _enforce_bounds_pct(pct * (1.0 if op != "decrease" else -1.0))
                eff = (pct / 100.0) * base_amt
                if ptype == "expenditure":
                    delta = sign * eff
                else:
                    # Apply elasticity for revenues if provided
                    e = lego_elast.get(pid, 1.0)
                    delta = -sign * eff * e
            if delta != 0.0:
                if recurring:
                    for i in range(horizon_years):
                        deltas_by_year[i] += delta
                else:
                    deltas_by_year[0] += delta
                # Macro shocks by distributing delta across mapped COFOG categories (expenditures only)
                if ptype == "expenditure":
                    cof = lego_cofog_map.get(pid) or []
                    if cof:
                        for c_code, w in cof:
                            cat = str(c_code).split(".")[0]  # major COFOG (02,03,05,07,09,...)
                            path = shocks_pct_gdp.setdefault(cat, [0.0] * horizon_years)
                            shock_eur = delta * float(w)
                            if recurring:
                                for i in range(horizon_years):
                                    path[i] += 100.0 * shock_eur / gdp_series[i]
                            else:
                                path[0] += 100.0 * shock_eur / gdp_series[0]

    # Deficit path = sum of deltas (positive increases deficit)
    deficit_path = [float(x) for x in deltas_by_year]
    debt_path: List[float] = []
    debt = 0.0
    for d in deficit_path:
        debt += d
        debt_path.append(float(debt))

    # Macro kernel
    macro = _macro_kernel(horizon_years, shocks_pct_gdp, gdp_series)

    # Net expenditure rule (simplified):
    # - Baseline net primary expenditure (NPE) assumed at 50% of GDP in year 0
    # - Baseline NPE grows by reference rate each year
    # - Scenario NPE_t = BaselineNPE_t + spending delta for year t (from mechanical layer)
    # - Rule: YOY growth(NPE) <= reference rate ⇒ ok, else breach
    settings = get_settings()
    ref = float(getattr(settings, "net_exp_reference_rate", 0.015))
    base_npe0 = 0.50 * gdp_series[0]
    base_npe_path: List[float] = [base_npe0]
    for i in range(1, horizon_years):
        base_npe_path.append(base_npe_path[-1] * (1.0 + ref))
    scen_npe: List[float] = [base_npe_path[i] + deltas_by_year[i] for i in range(horizon_years)]
    net_exp_status: List[str] = []
    for i in range(horizon_years):
        if i == 0 or scen_npe[i - 1] == 0:
            net_exp_status.append("ok")
            continue
        growth = (scen_npe[i] / scen_npe[i - 1]) - 1.0
        net_exp_status.append("ok" if growth <= ref + 1e-9 else "breach")

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
        net_expenditure=net_exp_status,
        local_balance=["n/a" for _ in range(horizon_years)],
    )

    acc = Accounting(deficit_path=deficit_path, debt_path=debt_path)
    return sid, acc, comp, macro
