#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
BASELINE_DEFICIT_CSV = DATA_DIR / "baseline_deficit_debt.csv"
DEFAULT_APU_TARGETS_JSON = DATA_DIR / "reference" / "apu_2026_targets.json"
ALLOWED_SOURCE_QUALITY = {"voted", "observed", "estimated"}
SENTINEL_MASSES = [
    "M_TRANSPORT",
    "M_EDU",
    "M_SOLIDARITY",
    "M_HOUSING",
    "M_CIVIL_PROT",
    "M_TERRITORIES",
]


# Mission bridge kept aligned with current simulation typology.
PLF_TO_SIM_MISSION: Dict[str, Dict[str, float]] = {
    "AA": {"M_DIPLO": 1.0},
    "AB": {"M_ADMIN": 1.0},
    "AC": {"M_AGRI": 1.0},
    "AD": {"M_DIPLO": 1.0},
    "AV": {"M_ECONOMIC": 1.0},
    "CA": {"M_ADMIN": 1.0},
    "CB": {"M_CULTURE": 1.0},
    "DA": {"M_DEFENSE": 1.0},
    "DB": {"M_ECONOMIC": 1.0},
    "DC": {"M_ADMIN": 1.0},
    "EB": {"M_DEBT": 1.0},
    "EC": {"M_EDU": 1.0},
    "GA": {"M_ADMIN": 1.0},
    "IA": {"M_SOLIDARITY": 0.6, "M_SECURITY": 0.4},
    "JA": {"M_JUSTICE": 1.0},
    "MA": {"M_CULTURE": 1.0},
    "MB": {"M_DEFENSE": 1.0},
    "OA": {"M_TERRITORIES": 1.0},
    "PB": {"M_ADMIN": 1.0},
    "PC": {"M_ADMIN": 1.0},
    "RA": {"M_HIGHER_EDU": 1.0},
    "RB": {"M_PENSIONS": 1.0},
    "RC": {"M_TERRITORIES": 1.0},
    "RD": {"M_UNKNOWN": 1.0},
    "SA": {"M_HEALTH": 1.0},
    "SB": {"M_SECURITY": 1.0},
    "SE": {"M_SOLIDARITY": 1.0},
    "SF": {"M_CULTURE": 0.5, "M_EDU": 0.5},
    "TA": {"M_TRANSPORT": 0.55, "M_ENVIRONMENT": 0.45},
    "TB": {"M_EMPLOYMENT": 1.0},
    "TR": {"M_ADMIN": 1.0},
    "VA": {"M_TERRITORIES": 0.6, "M_HOUSING": 0.4},
}

LFSS_BRANCH_TO_SIM_MISSION: Dict[str, Dict[str, float]] = {
    "maladie": {"M_HEALTH": 1.0},
    "at_mp": {"M_EMPLOYMENT": 0.7, "M_HEALTH": 0.3},
    "vieillesse": {"M_PENSIONS": 1.0},
    "famille": {"M_SOLIDARITY": 1.0},
    "autonomie": {"M_SOLIDARITY": 0.7, "M_HEALTH": 0.3},
}

REVENUE_GROUP_PIECES: Dict[str, List[str]] = {
    "social_security": [
        "rev_csg_crds",
        "rev_soc_employee",
        "rev_soc_employer",
        "rev_soc_self",
    ],
    "state_fiscal": [
        "rev_vat_standard",
        "rev_vat_reduced",
        "rev_excise_energy",
        "rev_excise_tob_alc",
        "rev_pit",
        "rev_cit",
        "rev_prod_taxes",
        "rev_wage_tax",
        "rev_property_taxes",
        "rev_transfer_taxes",
        "rev_env_taxes",
    ],
    "state_non_fiscal": [
        "rev_sales_fees",
        "rev_public_income",
        "rev_fines",
        "rev_transfers_in",
    ],
}

STATE_LINE_CODES_BY_PIECE: Dict[str, List[str]] = {
    "rev_pit": ["1101", "1401"],
    "rev_cit": ["1301", "1302", "1303", "1304", "1405", "1441", "1442"],
    "rev_excise_energy": ["1501", "1502", "1503"],
    "rev_excise_tob_alc": ["1761"],
    "rev_wage_tax": ["1409"],
    "rev_property_taxes": ["1707", "1713"],
    "rev_transfer_taxes": [
        "1701",
        "1702",
        "1703",
        "1704",
        "1705",
        "1706",
        "1711",
        "1712",
        "1714",
        "1715",
        "1716",
        "1721",
        "1726",
    ],
    "rev_env_taxes": ["1756", "1768", "1781", "1782"],
    "rev_public_income": [
        "2110",
        "2116",
        "2199",
        "2201",
        "2202",
        "2203",
        "2204",
        "2209",
        "2211",
        "2212",
        "2299",
        "2401",
        "2402",
        "2403",
        "2409",
    ],
    "rev_sales_fees": ["2301", "2303", "2304", "2305", "2306", "2399", "2612", "2613", "2615", "2616"],
    "rev_fines": ["2501", "2502", "2503", "2504", "2505", "2510", "2511", "2512", "2513"],
    "rev_transfers_in": [
        "2601",
        "2602",
        "2603",
        "2604",
        "2611",
        "2614",
        "2617",
        "2618",
        "2620",
        "2621",
        "2622",
        "2623",
        "2624",
        "2625",
        "2626",
        "2627",
        "2697",
        "2698",
        "2699",
        "2411",
        "2412",
        "2413",
        "2499",
    ],
}
STATE_VAT_TOTAL_LINE_CODES: List[str] = ["1601"]


@dataclass
class OverlayStats:
    depenses_total_before: float
    depenses_total_after: float
    recettes_total_before: float
    recettes_total_after: float
    covered_exp_share: float
    covered_rev_share: float
    iterations: int
    mode: str


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _normalize_weights(items: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
    total = sum(w for _, w in items if w > 0.0)
    if total <= 0.0:
        return []
    return [(code, w / total) for code, w in items if w > 0.0]


def _build_piece_missions(lego_cfg: dict) -> Dict[str, List[Tuple[str, float]]]:
    out: Dict[str, List[Tuple[str, float]]] = {}
    for piece in lego_cfg.get("pieces", []):
        pid = str(piece.get("id"))
        raw = piece.get("mapping", {}).get("mission") or []
        entries: List[Tuple[str, float]] = []
        for m in raw:
            code = str(m.get("code") or "").strip().upper()
            if not code:
                continue
            try:
                weight = float(m.get("weight") or 0.0)
            except Exception:
                weight = 0.0
            if weight > 0.0:
                entries.append((code, weight))
        out[pid] = _normalize_weights(entries)
    return out


def _mission_totals_from_baseline(
    baseline: dict,
    piece_missions: Dict[str, List[Tuple[str, float]]],
) -> Dict[str, float]:
    totals: Dict[str, float] = defaultdict(float)
    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) != "expenditure":
            continue
        pid = str(ent.get("id"))
        try:
            amount = float(ent.get("amount_eur") or 0.0)
        except Exception:
            amount = 0.0
        if amount == 0.0:
            continue
        missions = piece_missions.get(pid) or []
        if not missions:
            totals["M_UNKNOWN"] += amount
            continue
        for code, weight in missions:
            totals[code] += amount * weight
    return dict(totals)


def _seed_zero_mass_targets(
    baseline: dict,
    piece_missions: Dict[str, List[Tuple[str, float]]],
    target_masses: Dict[str, float],
) -> Dict[str, float]:
    """Seed strictly-positive target masses that are currently zero.

    This allows true-level overlay to activate masses that exist in the
    mission bridge but happen to be zero in the cached baseline (e.g. housing).
    """
    exp_entries: Dict[str, dict] = {
        str(ent.get("id")): ent
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "expenditure"
    }
    current_totals = _mission_totals_from_baseline(baseline, piece_missions)
    seeded: Dict[str, float] = {}

    for mass_id, target in target_masses.items():
        target_val = float(target or 0.0)
        if target_val <= 0.0:
            continue
        if float(current_totals.get(mass_id, 0.0)) > 0.0:
            continue

        candidates: List[Tuple[str, float, bool]] = []
        for pid, missions in piece_missions.items():
            if pid not in exp_entries:
                continue
            mass_weight = sum(weight for code, weight in missions if code == mass_id)
            if mass_weight <= 0.0:
                continue
            is_pure = len(missions) == 1 and missions[0][0] == mass_id
            candidates.append((pid, mass_weight, is_pure))
        if not candidates:
            continue

        selected = [item for item in candidates if item[2]] or candidates
        current_amounts = {
            pid: max(float(exp_entries[pid].get("amount_eur") or 0.0), 0.0)
            for pid, _, _ in selected
        }
        current_total = sum(current_amounts.values())

        if current_total > 0.0:
            shares = {
                pid: current_amounts[pid] / current_total
                for pid, _, _ in selected
            }
        else:
            if all(is_pure for _, _, is_pure in selected):
                equal = 1.0 / float(len(selected))
                shares = {pid: equal for pid, _, _ in selected}
            else:
                weight_total = sum(mass_weight for _, mass_weight, _ in selected)
                shares = {
                    pid: (mass_weight / weight_total if weight_total > 0.0 else 0.0)
                    for pid, mass_weight, _ in selected
                }

        for pid, mass_weight, _ in selected:
            share = float(shares.get(pid, 0.0))
            contribution_target = target_val * share
            required_piece_amount = contribution_target / mass_weight if mass_weight > 0.0 else 0.0
            exp_entries[pid]["amount_eur"] = max(required_piece_amount, 0.0)

        current_totals = _mission_totals_from_baseline(baseline, piece_missions)
        seeded[mass_id] = float(current_totals.get(mass_id, 0.0))

    return seeded


def _iterative_rebalance(
    baseline: dict,
    piece_missions: Dict[str, List[Tuple[str, float]]],
    target_totals: Dict[str, float],
    iterations: int,
) -> None:
    for _ in range(max(iterations, 1)):
        current_totals = _mission_totals_from_baseline(baseline, piece_missions)
        factors: Dict[str, float] = {}
        for mass_id, target in target_totals.items():
            current = float(current_totals.get(mass_id, 0.0))
            if current > 0.0 and target > 0.0:
                factors[mass_id] = target / current
            else:
                factors[mass_id] = 1.0

        for ent in baseline.get("pieces", []):
            if str(ent.get("type")) != "expenditure":
                continue
            pid = str(ent.get("id"))
            missions = piece_missions.get(pid) or []
            if not missions:
                continue
            log_mult = 0.0
            for mass_id, weight in missions:
                mult = float(factors.get(mass_id, 1.0))
                if mult <= 0.0:
                    mult = 1.0
                log_mult += weight * math.log(mult)
            mult_piece = math.exp(log_mult)
            try:
                amount = float(ent.get("amount_eur") or 0.0)
            except Exception:
                amount = 0.0
            ent["amount_eur"] = max(amount * mult_piece, 0.0)


def _sum_type(baseline: dict, t: str) -> float:
    return sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == t
    )


def _load_vat_standard_split() -> float:
    default = 0.70
    path = DATA_DIR / "revenue_splits.json"
    try:
        if path.exists():
            js = json.loads(path.read_text(encoding="utf-8"))
            val = float((js.get("vat") or {}).get("standard", default))
            if 0.0 <= val <= 1.0:
                return val
    except Exception:
        pass
    return default


def _state_line_amount(state_line_items: Dict[str, Dict[str, Any]], code: str) -> float:
    ent = state_line_items.get(code) or {}
    return float(ent.get("amount_eur") or 0.0)


def _sum_state_codes(state_line_items: Dict[str, Dict[str, Any]], codes: List[str]) -> float:
    return sum(_state_line_amount(state_line_items, code) for code in codes)


def _build_state_anchor_amounts(aggregates: dict) -> Dict[str, float]:
    state_line_items = (
        aggregates.get("state", {})
        .get("etat_a_line_items_eur", {})
    )
    if not isinstance(state_line_items, dict) or not state_line_items:
        return {}

    vat_total = _sum_state_codes(state_line_items, STATE_VAT_TOTAL_LINE_CODES)
    vat_standard_split = _load_vat_standard_split()
    vat_standard = vat_total * vat_standard_split
    vat_reduced = vat_total - vat_standard

    anchors: Dict[str, float] = {
        "rev_vat_standard": vat_standard,
        "rev_vat_reduced": vat_reduced,
    }

    for pid, codes in STATE_LINE_CODES_BY_PIECE.items():
        anchors[pid] = _sum_state_codes(state_line_items, codes)
    return anchors


def _distribute_residual(
    base_amounts: Dict[str, float],
    piece_ids: List[str],
    target_total: float,
) -> Dict[str, float]:
    if not piece_ids:
        return {}
    current_total = sum(max(base_amounts.get(pid, 0.0), 0.0) for pid in piece_ids)
    if current_total > 0.0:
        return {
            pid: target_total * (max(base_amounts.get(pid, 0.0), 0.0) / current_total)
            for pid in piece_ids
        }
    equal = target_total / float(len(piece_ids))
    return {pid: equal for pid in piece_ids}


def _macro_deficit_target_abs_eur(year: int) -> float | None:
    if not BASELINE_DEFICIT_CSV.exists():
        return None
    try:
        with BASELINE_DEFICIT_CSV.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                if int(float(str(row.get("year") or "0"))) != int(year):
                    continue
                deficit_raw = float(str(row.get("deficit_eur") or "0"))
                return abs(deficit_raw)
    except Exception:
        return None
    return None


def _clean_source_quality(raw: Any) -> str:
    value = str(raw or "").strip().lower()
    if value not in ALLOWED_SOURCE_QUALITY:
        return ""
    return value


def _load_apu_targets(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return _load_json(path)
    except Exception:
        return None


def _weighted_quality_coverage(rows: List[Dict[str, Any]]) -> float:
    total = 0.0
    covered = 0.0
    for row in rows:
        amount = abs(float(row.get("amount_eur") or 0.0))
        if amount <= 0.0:
            continue
        total += amount
        if _clean_source_quality(row.get("source_quality")):
            covered += amount
    if total <= 0.0:
        return 0.0
    return (covered / total) * 100.0


def _build_expenditure_targets_from_rows(rows: List[Dict[str, Any]]) -> Dict[str, float]:
    out: Dict[str, float] = defaultdict(float)
    for row in rows:
        mass_id = str(row.get("mass_id") or "").strip().upper()
        if not mass_id:
            continue
        out[mass_id] += float(row.get("amount_eur") or 0.0)
    return dict(out)


def _build_revenue_targets_from_rows(rows: List[Dict[str, Any]]) -> Dict[str, float]:
    out: Dict[str, float] = defaultdict(float)
    for row in rows:
        group_id = str(row.get("group_id") or "").strip()
        if not group_id:
            continue
        out[group_id] += float(row.get("amount_eur") or 0.0)
    return dict(out)


def _build_expenditure_targets(
    aggregates: dict,
    excluded_state_codes: set[str],
    apu_targets: dict | None = None,
) -> tuple[Dict[str, float], List[Dict[str, Any]], List[str]]:
    warnings: List[str] = []
    if apu_targets:
        rows = [
            row
            for row in (apu_targets.get("targets", {}) or {}).get("expenditure", [])
            if isinstance(row, dict)
        ]
        if rows:
            filtered_rows: List[Dict[str, Any]] = []
            for row in rows:
                mass_id = str(row.get("mass_id") or "").strip().upper()
                amount = float(row.get("amount_eur") or 0.0)
                if not mass_id or amount <= 0.0:
                    continue
                filtered_rows.append(
                    {
                        "mass_id": mass_id,
                        "amount_eur": amount,
                        "source_quality": _clean_source_quality(row.get("source_quality")),
                        "subsector": str(row.get("subsector") or "").strip().upper(),
                        "source_ref": str(row.get("source_ref") or "").strip(),
                        "method_note": str(row.get("method_note") or "").strip(),
                    }
                )
            if filtered_rows:
                return _build_expenditure_targets_from_rows(filtered_rows), filtered_rows, warnings
            warnings.append("APU targets file found but no valid expenditure rows were usable")

    out: Dict[str, float] = defaultdict(float)
    rows_out: List[Dict[str, Any]] = []

    state_missions = (
        aggregates.get("state", {})
        .get("etat_b_cp_by_mission_eur", {})
    )
    state_ref = str((aggregates.get("sources", {}) or {}).get("state_b_csv") or "")
    for code, amount in state_missions.items():
        mission_code = str(code).strip().upper()
        if not mission_code or mission_code in excluded_state_codes:
            continue
        mapping = PLF_TO_SIM_MISSION.get(mission_code)
        if not mapping:
            continue
        amt = float(amount or 0.0)
        for mass, w in mapping.items():
            value = amt * float(w)
            out[mass] += value
            rows_out.append(
                {
                    "mass_id": mass,
                    "amount_eur": value,
                    "source_quality": "voted",
                    "subsector": "S1311",
                    "source_ref": state_ref,
                    "method_note": f"legacy bridge ETAT B mission {mission_code}",
                }
            )

    social_branches = (
        aggregates.get("social", {})
        .get("lfss_branch_equilibre_eur", {})
    )
    social_ref = str((aggregates.get("sources", {}) or {}).get("lfss_branch_csv") or "")
    for branch_key, map_weights in LFSS_BRANCH_TO_SIM_MISSION.items():
        dep = float((social_branches.get(branch_key) or {}).get("depenses_eur") or 0.0)
        if dep <= 0.0:
            continue
        for mass, w in map_weights.items():
            value = dep * float(w)
            out[mass] += value
            rows_out.append(
                {
                    "mass_id": mass,
                    "amount_eur": value,
                    "source_quality": "voted",
                    "subsector": "S1314",
                    "source_ref": social_ref,
                    "method_note": f"legacy bridge LFSS branch {branch_key}",
                }
            )

    warnings.append("APU targets file unavailable, using legacy ETAT/LFSS bridge")
    return dict(out), rows_out, warnings


def _build_revenue_group_targets(
    aggregates: dict,
    apu_targets: dict | None = None,
) -> tuple[Dict[str, float], List[Dict[str, Any]], List[str]]:
    warnings: List[str] = []
    if apu_targets:
        rows = [
            row
            for row in (apu_targets.get("targets", {}) or {}).get("revenue", [])
            if isinstance(row, dict)
        ]
        if rows:
            filtered_rows: List[Dict[str, Any]] = []
            for row in rows:
                group_id = str(row.get("group_id") or "").strip()
                amount = float(row.get("amount_eur") or 0.0)
                if not group_id or amount <= 0.0:
                    continue
                filtered_rows.append(
                    {
                        "group_id": group_id,
                        "amount_eur": amount,
                        "source_quality": _clean_source_quality(row.get("source_quality")),
                        "subsector": str(row.get("subsector") or "").strip().upper(),
                        "source_ref": str(row.get("source_ref") or "").strip(),
                        "method_note": str(row.get("method_note") or "").strip(),
                    }
                )
            if filtered_rows:
                return _build_revenue_targets_from_rows(filtered_rows), filtered_rows, warnings
            warnings.append("APU targets file found but no valid revenue rows were usable")

    revenue_targets = (
        aggregates.get("calibration_targets", {})
        .get("revenue_targets_eur", {})
    )
    source_state_a = str((aggregates.get("sources", {}) or {}).get("state_a_csv") or "")
    source_lfss = str((aggregates.get("sources", {}) or {}).get("lfss_branch_csv") or "")
    rows_out = [
        {
            "group_id": "social_security",
            "amount_eur": float(revenue_targets.get("lfss_all_branches_recettes_eur") or 0.0),
            "source_quality": "voted",
            "subsector": "S1314",
            "source_ref": source_lfss,
            "method_note": "legacy bridge LFSS recettes",
        },
        {
            "group_id": "state_fiscal",
            "amount_eur": float(revenue_targets.get("state_fiscal_eur") or 0.0),
            "source_quality": "voted",
            "subsector": "S1311",
            "source_ref": source_state_a,
            "method_note": "legacy bridge ETAT A fiscal",
        },
        {
            "group_id": "state_non_fiscal",
            "amount_eur": float(revenue_targets.get("state_non_fiscal_eur") or 0.0),
            "source_quality": "voted",
            "subsector": "S1311",
            "source_ref": source_state_a,
            "method_note": "legacy bridge ETAT A non-fiscal",
        },
    ]
    rows_out = [row for row in rows_out if float(row["amount_eur"]) > 0.0]
    warnings.append("APU targets file unavailable, using legacy revenue groups bridge")
    return _build_revenue_targets_from_rows(rows_out), rows_out, warnings


def _apply_expenditure_overlay(
    baseline: dict,
    piece_missions: Dict[str, List[Tuple[str, float]]],
    target_masses: Dict[str, float],
    iterations: int,
    mode: str,
) -> tuple[float, Dict[str, float]]:
    if mode == "true_level":
        _seed_zero_mass_targets(baseline, piece_missions, target_masses)

    current_totals = _mission_totals_from_baseline(baseline, piece_missions)
    masses = sorted(set(current_totals.keys()) & set(target_masses.keys()))
    if not masses:
        return 0.0, {}

    covered_current = sum(float(current_totals.get(k, 0.0)) for k in masses)
    covered_target = sum(float(target_masses.get(k, 0.0)) for k in masses)
    if covered_current <= 0.0 or covered_target <= 0.0:
        return 0.0, {}

    if mode == "share_rebalance":
        applied_targets = {
            k: covered_current * (float(target_masses[k]) / covered_target)
            for k in masses
        }
        covered_reference = covered_current
    elif mode == "true_level":
        applied_targets = {k: float(target_masses[k]) for k in masses}
        covered_reference = covered_target
    else:
        raise ValueError(f"Unsupported overlay mode: {mode}")

    _iterative_rebalance(baseline, piece_missions, applied_targets, iterations)

    return covered_reference / max(_sum_type(baseline, "expenditure"), 1.0), applied_targets


def _apply_revenue_overlay(
    baseline: dict,
    aggregates: dict,
    group_target_values: Dict[str, float],
    mode: str,
    year: int,
) -> tuple[float, Dict[str, float], List[Dict[str, Any]]]:
    adjustments: List[Dict[str, Any]] = []
    group_targets = {k: float(v or 0.0) for k, v in (group_target_values or {}).items()}

    macro_deficit_target_abs = _macro_deficit_target_abs_eur(year) if mode == "true_level" else None
    macro_residual_closure_eur = 0.0
    if mode == "true_level" and macro_deficit_target_abs is not None:
        dep_total_now = _sum_type(baseline, "expenditure")
        desired_rev_total = max(dep_total_now - macro_deficit_target_abs, 0.0)
        base_rev_total = (
            group_targets.get("social_security", 0.0)
            + group_targets.get("state_fiscal", 0.0)
            + group_targets.get("state_non_fiscal", 0.0)
        )
        macro_residual_closure_eur = desired_rev_total - base_rev_total
        group_targets["state_non_fiscal"] = max(
            group_targets.get("state_non_fiscal", 0.0) + macro_residual_closure_eur,
            0.0,
        )
        adjustments.append(
            {
                "kind": "macro_deficit_closure",
                "group_id": "state_non_fiscal",
                "amount_eur": macro_residual_closure_eur,
                "note": "Applied to close to baseline deficit target in true_level mode",
            }
        )

    amount_by_piece: Dict[str, float] = {}
    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) != "revenue":
            continue
        amount_by_piece[str(ent.get("id"))] = float(ent.get("amount_eur") or 0.0)

    # Defensive check: no overlap between defined groups.
    owner: Dict[str, str] = {}
    for group, pieces in REVENUE_GROUP_PIECES.items():
        for pid in pieces:
            if pid in owner:
                raise RuntimeError(f"Revenue piece '{pid}' appears in multiple groups: {owner[pid]} and {group}")
            owner[pid] = group

    current_by_group: Dict[str, float] = {}
    for group, pieces in REVENUE_GROUP_PIECES.items():
        current_by_group[group] = sum(amount_by_piece.get(pid, 0.0) for pid in pieces)

    if mode == "share_rebalance":
        valid_groups = [
            g
            for g in REVENUE_GROUP_PIECES.keys()
            if current_by_group.get(g, 0.0) > 0.0 and group_targets.get(g, 0.0) > 0.0
        ]
    elif mode == "true_level":
        valid_groups = [
            g
            for g in REVENUE_GROUP_PIECES.keys()
            if group_targets.get(g, 0.0) > 0.0 and len(REVENUE_GROUP_PIECES.get(g, [])) > 0
        ]
    else:
        raise ValueError(f"Unsupported overlay mode: {mode}")

    if not valid_groups:
        return 0.0, {}, adjustments

    covered_current = sum(current_by_group[g] for g in valid_groups)
    covered_target = sum(group_targets[g] for g in valid_groups)
    if covered_current <= 0.0 or covered_target <= 0.0:
        return 0.0, {}, adjustments

    if mode == "share_rebalance":
        applied_target_by_group = {
            g: covered_current * (group_targets[g] / covered_target)
            for g in valid_groups
        }
        covered_reference = covered_current
    elif mode == "true_level":
        applied_target_by_group = {
            g: group_targets[g]
            for g in valid_groups
        }
        covered_reference = covered_target
    else:
        raise ValueError(f"Unsupported overlay mode: {mode}")

    original_total = _sum_type(baseline, "revenue")
    next_amount_by_piece = dict(amount_by_piece)
    state_anchors = _build_state_anchor_amounts(aggregates) if mode == "true_level" else {}

    for group in valid_groups:
        target = float(applied_target_by_group[group])
        piece_ids = list(REVENUE_GROUP_PIECES.get(group, []))
        if not piece_ids:
            continue

        # For true-level voted 2026, anchor state fiscal/non-fiscal pieces using ETAT A line items.
        if mode == "true_level" and group in {"state_fiscal", "state_non_fiscal"} and state_anchors:
            anchored = {
                pid: max(float(state_anchors.get(pid, 0.0)), 0.0)
                for pid in piece_ids
                if pid in state_anchors
            }
            if anchored:
                anchored_total = sum(anchored.values())
                residual_ids = [pid for pid in piece_ids if pid not in anchored]

                if anchored_total > target and anchored_total > 0.0:
                    scale = target / anchored_total
                    for pid in anchored:
                        next_amount_by_piece[pid] = anchored[pid] * scale
                    for pid in residual_ids:
                        next_amount_by_piece[pid] = 0.0
                    continue

                for pid in anchored:
                    next_amount_by_piece[pid] = anchored[pid]

                residual_target = max(target - anchored_total, 0.0)
                residual_split = _distribute_residual(amount_by_piece, residual_ids, residual_target)
                for pid, amt in residual_split.items():
                    next_amount_by_piece[pid] = max(amt, 0.0)

                # Force exact closure to the group target.
                got = sum(float(next_amount_by_piece.get(pid, 0.0)) for pid in piece_ids)
                diff = target - got
                if abs(diff) > 1e-6:
                    if group == "state_non_fiscal" and "rev_transfers_in" in piece_ids:
                        adjust_pid = "rev_transfers_in"
                    else:
                        adjust_pid = residual_ids[0] if residual_ids else max(anchored.keys(), key=lambda p: anchored[p])
                    next_amount_by_piece[adjust_pid] = max(float(next_amount_by_piece.get(adjust_pid, 0.0)) + diff, 0.0)
                continue

        # Generic proportional scaling.
        current = sum(float(amount_by_piece.get(pid, 0.0)) for pid in piece_ids)
        if current > 0.0:
            factor = target / current
            for pid in piece_ids:
                next_amount_by_piece[pid] = max(float(amount_by_piece.get(pid, 0.0)) * factor, 0.0)
        else:
            split = _distribute_residual(amount_by_piece, piece_ids, target)
            for pid, amt in split.items():
                next_amount_by_piece[pid] = max(amt, 0.0)

        got = sum(float(next_amount_by_piece.get(pid, 0.0)) for pid in piece_ids)
        diff = target - got
        if abs(diff) > 1e-6 and piece_ids:
            adjust_pid = max(piece_ids, key=lambda p: float(next_amount_by_piece.get(p, 0.0)))
            next_amount_by_piece[adjust_pid] = max(float(next_amount_by_piece.get(adjust_pid, 0.0)) + diff, 0.0)

    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) != "revenue":
            continue
        pid = str(ent.get("id"))
        group = owner.get(pid)
        if group in valid_groups and pid in next_amount_by_piece:
            ent["amount_eur"] = float(next_amount_by_piece[pid])

    if mode == "share_rebalance":
        # Preserve overall revenue total for simulation comparability; only rebalance shares.
        new_total = _sum_type(baseline, "revenue")
        rev_scale = (original_total / new_total) if new_total > 0.0 else 1.0
        if rev_scale != 1.0:
            for ent in baseline.get("pieces", []):
                if str(ent.get("type")) == "revenue":
                    ent["amount_eur"] = float(ent.get("amount_eur") or 0.0) * rev_scale

    if mode == "true_level" and macro_deficit_target_abs is not None:
        applied_target_by_group["apu_macro_closure_state_non_fiscal_delta_eur"] = macro_residual_closure_eur
        applied_target_by_group["macro_deficit_target_abs_eur"] = macro_deficit_target_abs

    return covered_reference / max(original_total, 1.0), applied_target_by_group, adjustments


def _recompute_totals_and_shares(baseline: dict) -> None:
    dep_total = _sum_type(baseline, "expenditure")
    rev_total = _sum_type(baseline, "revenue")

    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) == "expenditure":
            amt = float(ent.get("amount_eur") or 0.0)
            ent["share"] = (amt / dep_total) if dep_total > 0.0 else 0.0

    baseline["depenses_total_eur"] = dep_total
    baseline["recettes_total_eur"] = rev_total


def _build_sentinel_checks(
    after_masses: Dict[str, float],
    applied_exp_targets: Dict[str, float],
) -> List[Dict[str, Any]]:
    checks: List[Dict[str, Any]] = []
    for mass_id in SENTINEL_MASSES:
        amount = float(after_masses.get(mass_id, 0.0))
        targeted = mass_id in applied_exp_targets
        status = "ok"
        note = "targeted and non-zero"
        if not targeted:
            status = "warn"
            note = "not explicitly targeted in overlay inputs"
        if amount <= 0.0:
            status = "warn"
            note = "resulting amount is zero or negative"
        checks.append(
            {
                "mass_id": mass_id,
                "status": status,
                "amount_eur": amount,
                "targeted": targeted,
                "note": note,
            }
        )
    return checks


def _build_double_count_checks(
    baseline: dict,
    after_masses: Dict[str, float],
) -> List[Dict[str, Any]]:
    revenue_by_id = {
        str(ent.get("id")): float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "expenditure"
    }
    transfer_state_to_local = float(revenue_by_id.get("grants_to_locals", 0.0))
    local_usage_total = sum(
        float(after_masses.get(mass_id, 0.0))
        for mass_id in ["M_TRANSPORT", "M_EDU", "M_SOLIDARITY", "M_HOUSING", "M_CIVIL_PROT", "M_ENVIRONMENT", "M_CULTURE"]
    )

    status = "ok"
    note = "No obvious transfer/final-use overlap signal."
    if transfer_state_to_local > 0.0 and local_usage_total > 0.0:
        status = "warn"
        note = (
            "Heuristic risk: state->local transfers and APUL-sensitive final-use blocks are both non-zero. "
            "Ensure transfers are not re-counted as additional final spending."
        )

    return [
        {
            "name": "state_to_local_vs_local_final_use",
            "status": status,
            "value_eur": transfer_state_to_local,
            "local_final_use_eur": local_usage_total,
            "note": note,
        }
    ]


def apply_overlay(
    baseline_path: Path,
    lego_cfg_path: Path,
    aggregates_path: Path,
    out_path: Path,
    iterations: int,
    excluded_state_codes: set[str],
    mode: str,
    apu_targets_path: Path | None,
) -> OverlayStats:
    baseline = _load_json(baseline_path)
    lego_cfg = _load_json(lego_cfg_path)
    aggregates = _load_json(aggregates_path)

    dep_before = _sum_type(baseline, "expenditure")
    rev_before = _sum_type(baseline, "revenue")

    piece_missions = _build_piece_missions(lego_cfg)
    apu_targets = _load_apu_targets(apu_targets_path) if apu_targets_path else None
    exp_targets, exp_target_rows, exp_target_warnings = _build_expenditure_targets(
        aggregates,
        excluded_state_codes,
        apu_targets=apu_targets,
    )
    rev_group_targets, rev_target_rows, rev_target_warnings = _build_revenue_group_targets(
        aggregates,
        apu_targets=apu_targets,
    )

    covered_exp_share, applied_exp_targets = _apply_expenditure_overlay(
        baseline,
        piece_missions,
        exp_targets,
        iterations,
        mode,
    )

    if mode == "share_rebalance":
        # Preserve overall expenditure total.
        dep_after_overlay = _sum_type(baseline, "expenditure")
        dep_scale = (dep_before / dep_after_overlay) if dep_after_overlay > 0.0 else 1.0
        if dep_scale != 1.0:
            for ent in baseline.get("pieces", []):
                if str(ent.get("type")) == "expenditure":
                    ent["amount_eur"] = float(ent.get("amount_eur") or 0.0) * dep_scale

    covered_rev_share, applied_rev_targets, rev_adjustments = _apply_revenue_overlay(
        baseline,
        aggregates,
        group_target_values=rev_group_targets,
        mode=mode,
        year=int(baseline.get("year") or 2026),
    )

    _recompute_totals_and_shares(baseline)
    after_masses = _mission_totals_from_baseline(baseline, piece_missions)

    post_checks: Dict[str, Dict[str, float] | float | int] = {}
    if mode == "true_level":
        # Check mission-level convergence against targeted masses (iterative reweighting).
        max_mission_rel_err = 0.0
        max_mission_abs_err = 0.0
        for mass_id, target in applied_exp_targets.items():
            if target <= 0.0:
                continue
            got = float(after_masses.get(mass_id, 0.0))
            abs_err = abs(got - target)
            rel_err = abs_err / target
            max_mission_abs_err = max(max_mission_abs_err, abs_err)
            max_mission_rel_err = max(max_mission_rel_err, rel_err)

        # Check exact grouped revenue targets.
        rev_by_id = {
            str(ent.get("id")): float(ent.get("amount_eur") or 0.0)
            for ent in baseline.get("pieces", [])
            if str(ent.get("type")) == "revenue"
        }
        max_rev_rel_err = 0.0
        max_rev_abs_err = 0.0
        for group, target in applied_rev_targets.items():
            if group not in REVENUE_GROUP_PIECES:
                continue
            ids = REVENUE_GROUP_PIECES.get(group, [])
            got = sum(rev_by_id.get(pid, 0.0) for pid in ids)
            abs_err = abs(got - target)
            rel_err = abs_err / target if target > 0 else 0.0
            max_rev_abs_err = max(max_rev_abs_err, abs_err)
            max_rev_rel_err = max(max_rev_rel_err, rel_err)

        post_checks = {
            "mission_target_count": len(applied_exp_targets),
            "mission_max_abs_error_eur": max_mission_abs_err,
            "mission_max_rel_error": max_mission_rel_err,
            "revenue_group_target_count": len(applied_rev_targets),
            "revenue_group_max_abs_error_eur": max_rev_abs_err,
            "revenue_group_max_rel_error": max_rev_rel_err,
        }
        if max_mission_rel_err > 0.01:
            raise RuntimeError(
                f"True-level overlay mission convergence too imprecise: max_rel_error={max_mission_rel_err:.6f}"
            )
        if max_rev_rel_err > 1e-9:
            raise RuntimeError(
                f"True-level overlay revenue mismatch: max_rel_error={max_rev_rel_err:.6f}"
            )

    dep_after_now = _sum_type(baseline, "expenditure")
    targeted_exp_total = sum(float(v or 0.0) for v in applied_exp_targets.values())
    uncovered_exp_residual_eur = dep_after_now - targeted_exp_total

    sentinel_checks = _build_sentinel_checks(after_masses, applied_exp_targets)
    double_count_checks = _build_double_count_checks(baseline, after_masses)
    source_quality_rows = exp_target_rows + rev_target_rows
    source_quality_coverage_pct = _weighted_quality_coverage(source_quality_rows)
    residual_adjustments: List[Dict[str, Any]] = []
    residual_adjustments.extend(rev_adjustments)
    if abs(uncovered_exp_residual_eur) > 1e-6:
        residual_adjustments.append(
            {
                "kind": "uncovered_expenditure_residual",
                "amount_eur": uncovered_exp_residual_eur,
                "note": "Difference between total expenditure and sum of explicitly targeted masses.",
            }
        )

    quality_warnings: List[str] = []
    quality_warnings.extend(exp_target_warnings)
    quality_warnings.extend(rev_target_warnings)
    if source_quality_coverage_pct < 100.0:
        quality_warnings.append(
            f"Source quality coverage is {source_quality_coverage_pct:.2f}% (<100%)."
        )
    if abs(uncovered_exp_residual_eur) > 1_000_000.0:
        quality_warnings.append(
            f"Uncovered expenditure residual is {uncovered_exp_residual_eur:.2f} EUR."
        )
    for chk in sentinel_checks:
        if str(chk.get("status")) == "warn":
            quality_warnings.append(f"Sentinel {chk.get('mass_id')}: {chk.get('note')}")
    for chk in double_count_checks:
        if str(chk.get("status")) == "warn":
            quality_warnings.append(str(chk.get("note")))

    meta = baseline.setdefault("meta", {})
    warning = str(meta.get("warning") or "")
    overlay_note = (
        "Voted-2026 overlay applied from LFI ETAT A/ETAT B and LFSS branch balances "
        "(explicit residual and source-quality reporting enabled)"
    )
    meta["warning"] = f"{warning}; {overlay_note}".strip("; ").strip()
    meta["voted_2026_overlay"] = {
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "sources_bundle": str(aggregates_path.resolve()),
        "apu_targets_path": str(apu_targets_path.resolve()) if apu_targets_path and apu_targets_path.exists() else "",
        "mode": mode,
        "excluded_state_codes": sorted(excluded_state_codes),
        "iterations": iterations,
        "applied_expenditure_targets_eur": applied_exp_targets,
        "applied_revenue_targets_eur": applied_rev_targets,
        "post_checks": post_checks,
        "revenue_groups": REVENUE_GROUP_PIECES,
        "state_line_codes_by_piece": STATE_LINE_CODES_BY_PIECE,
        "state_vat_total_line_codes": STATE_VAT_TOTAL_LINE_CODES,
        "state_to_sim_mapping": PLF_TO_SIM_MISSION,
        "lfss_to_sim_mapping": LFSS_BRANCH_TO_SIM_MISSION,
        "quality": {
            "warning_count": len(quality_warnings),
            "warnings": quality_warnings,
            "source_quality_coverage_pct": source_quality_coverage_pct,
            "residual_adjustments_total_eur": sum(abs(float(x.get("amount_eur") or 0.0)) for x in residual_adjustments),
            "residual_adjustments": residual_adjustments,
            "sentinel_checks": sentinel_checks,
            "double_count_checks": double_count_checks,
        },
    }

    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(baseline, fh, ensure_ascii=False, indent=2)

    dep_after = _sum_type(baseline, "expenditure")
    rev_after = _sum_type(baseline, "revenue")

    return OverlayStats(
        depenses_total_before=dep_before,
        depenses_total_after=dep_after,
        recettes_total_before=rev_before,
        recettes_total_after=rev_after,
        covered_exp_share=covered_exp_share,
        covered_rev_share=covered_rev_share,
        iterations=iterations,
        mode=mode,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Apply voted-2026 LFI/LFSS overlay to lego_baseline while keeping current "
            "simulation typology and explicit quality-tagged residual reporting."
        )
    )
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument(
        "--baseline",
        type=str,
        default="",
        help="Input baseline JSON path (defaults to data/cache/lego_baseline_<year>.json)",
    )
    parser.add_argument(
        "--lego-config",
        type=str,
        default=str(DATA_DIR / "lego_pieces.json"),
    )
    parser.add_argument(
        "--aggregates",
        type=str,
        default=str(DATA_DIR / "reference" / "voted_2026_aggregates.json"),
    )
    parser.add_argument(
        "--apu-targets",
        type=str,
        default=str(DEFAULT_APU_TARGETS_JSON),
        help="Optional explicit APU targets JSON (defaults to data/reference/apu_2026_targets.json).",
    )
    parser.add_argument(
        "--out",
        type=str,
        default="",
        help="Output path (defaults to overwrite baseline input)",
    )
    parser.add_argument("--iterations", type=int, default=14)
    parser.add_argument(
        "--mode",
        type=str,
        choices=["true_level", "share_rebalance"],
        default="true_level",
        help=(
            "Overlay mode: true_level applies absolute voted levels to covered blocks; "
            "share_rebalance preserves global totals and only reshuffles shares."
        ),
    )
    parser.add_argument(
        "--exclude-state-codes",
        type=str,
        default="RD,PC",
        help="Comma-separated LFI mission codes excluded from state overlay (default: RD,PC)",
    )
    args = parser.parse_args()

    baseline_path = Path(args.baseline) if args.baseline else DATA_DIR / "cache" / f"lego_baseline_{args.year}.json"
    out_path = Path(args.out) if args.out else baseline_path
    excluded_state_codes = {x.strip().upper() for x in str(args.exclude_state_codes).split(",") if x.strip()}

    stats = apply_overlay(
        baseline_path=baseline_path,
        lego_cfg_path=Path(args.lego_config),
        aggregates_path=Path(args.aggregates),
        out_path=out_path,
        iterations=args.iterations,
        excluded_state_codes=excluded_state_codes,
        mode=args.mode,
        apu_targets_path=Path(args.apu_targets) if str(args.apu_targets).strip() else None,
    )

    print(f"Wrote {out_path}")
    print(
        "Overlay stats:",
        {
            "depenses_total_before": stats.depenses_total_before,
            "depenses_total_after": stats.depenses_total_after,
            "recettes_total_before": stats.recettes_total_before,
            "recettes_total_after": stats.recettes_total_after,
            "covered_exp_share": stats.covered_exp_share,
            "covered_rev_share": stats.covered_rev_share,
            "iterations": stats.iterations,
            "mode": stats.mode,
        },
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
