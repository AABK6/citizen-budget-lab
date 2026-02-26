#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
import os
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Tuple


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")


# Mapping from PLF 2026 state-budget missions to the simulation mission typology (M_*).
# We keep the simulation's mission keys and only rebalance weights inside that typology.
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

# Proposed (legacy) vs voted (new) bridge used for conservative deltas.
# Proposed totals correspond to the previously deployed 2026 proposal baseline.
LEGACY_CORE_PROPOSED_BY_SIM_MISSION: Dict[str, Dict[str, object]] = {
    # Previously proposed 2026 values: AA=3.2bn, AD=3.7bn
    "M_DIPLO": {"codes": ["AA", "AD"], "proposed_total_eur": 6_900_000_000.0},
    # Previously proposed 2026 value: JA=10.6bn
    "M_JUSTICE": {"codes": ["JA"], "proposed_total_eur": 10_600_000_000.0},
    # Previously proposed 2026 value: EC=64.5bn
    "M_EDU": {"codes": ["EC"], "proposed_total_eur": 64_500_000_000.0},
    # Previously proposed 2026 value: DA=57.1bn
    "M_DEFENSE": {"codes": ["DA"], "proposed_total_eur": 57_100_000_000.0},
}


@dataclass
class RebalanceStats:
    original_depenses_total: float
    new_depenses_total: float
    covered_current_total: float
    covered_target_total: float
    coverage_share_of_depenses: float
    iterations: int
    excluded_codes: List[str]
    mode: str


def _load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
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


def _plf_to_sim_mission_totals(plf_csv: str, excluded_codes: set[str]) -> Tuple[Dict[str, float], List[str]]:
    totals: Dict[str, float] = defaultdict(float)
    unmapped: List[str] = []
    with open(plf_csv, "r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            code = str(row.get("mission_code") or "").strip().upper()
            if not code or code in excluded_codes:
                continue
            try:
                amount = float(row.get("plf_ceiling_eur") or 0.0)
            except Exception:
                amount = 0.0
            mapping = PLF_TO_SIM_MISSION.get(code)
            if not mapping:
                unmapped.append(code)
                continue
            for mass_id, weight in mapping.items():
                totals[mass_id] += amount * float(weight)
    return dict(totals), sorted(set(unmapped))


def _read_plf_amounts_by_code(plf_csv: str) -> Dict[str, float]:
    out: Dict[str, float] = {}
    with open(plf_csv, "r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            code = str(row.get("mission_code") or "").strip().upper()
            if not code:
                continue
            try:
                amount = float(row.get("plf_ceiling_eur") or 0.0)
            except Exception:
                amount = 0.0
            out[code] = amount
    return out


def _apply_fixed_mission_factors(
    baseline: dict,
    piece_missions: Dict[str, List[Tuple[str, float]]],
    factors: Dict[str, float],
) -> None:
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

            # Weighted geometric mean keeps positive amounts and avoids overreactive swings.
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


def rebalance_lego_baseline(
    baseline_path: str,
    lego_cfg_path: str,
    plf_csv_path: str,
    *,
    iterations: int = 14,
    excluded_codes: set[str] | None = None,
) -> Tuple[dict, RebalanceStats, List[str]]:
    excluded_codes = excluded_codes or {"RD", "PC"}
    baseline = _load_json(baseline_path)
    lego_cfg = _load_json(lego_cfg_path)
    piece_missions = _build_piece_missions(lego_cfg)

    original_dep = float(baseline.get("depenses_total_eur") or 0.0)
    current_totals = _mission_totals_from_baseline(baseline, piece_missions)
    plf_mission_totals, unmapped_codes = _plf_to_sim_mission_totals(plf_csv_path, excluded_codes)

    target_masses = sorted(set(current_totals.keys()) & set(plf_mission_totals.keys()))
    if not target_masses:
        raise RuntimeError("No overlapping mission masses between LEGO baseline and PLF mapping.")

    covered_current_total = sum(float(current_totals.get(k, 0.0)) for k in target_masses)
    covered_plf_total = sum(float(plf_mission_totals.get(k, 0.0)) for k in target_masses)
    if covered_current_total <= 0.0 or covered_plf_total <= 0.0:
        raise RuntimeError("Invalid totals for rebalance: covered mission totals are zero.")

    target_totals = {
        mass_id: covered_current_total * (float(plf_mission_totals[mass_id]) / covered_plf_total)
        for mass_id in target_masses
    }

    _iterative_rebalance(baseline, piece_missions, target_totals, iterations)

    # Preserve global APU total for comparability.
    new_dep = sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "expenditure"
    )
    dep_scale = (original_dep / new_dep) if new_dep > 0.0 else 1.0
    if dep_scale != 1.0:
        for ent in baseline.get("pieces", []):
            if str(ent.get("type")) == "expenditure":
                ent["amount_eur"] = float(ent.get("amount_eur") or 0.0) * dep_scale

    dep_total = sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "expenditure"
    )
    rev_total = sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "revenue"
    )
    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) == "expenditure":
            amt = float(ent.get("amount_eur") or 0.0)
            ent["share"] = (amt / dep_total) if dep_total > 0.0 else 0.0

    baseline["depenses_total_eur"] = dep_total
    baseline["recettes_total_eur"] = rev_total

    meta = baseline.setdefault("meta", {})
    warning = str(meta.get("warning") or "")
    overlay_note = (
        f"PLF-2026 mission overlay applied from {os.path.relpath(plf_csv_path, ROOT)} "
        f"(excluded: {','.join(sorted(excluded_codes))}; iterations={iterations})"
    )
    meta["warning"] = f"{warning}; {overlay_note}".strip("; ").strip()
    meta["plf_overlay"] = {
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "source_csv": os.path.abspath(plf_csv_path),
        "excluded_codes": sorted(excluded_codes),
        "mapped_codes": sorted(PLF_TO_SIM_MISSION.keys()),
        "unmapped_codes": unmapped_codes,
        "target_masses": target_masses,
        "iterations": iterations,
    }

    stats = RebalanceStats(
        original_depenses_total=original_dep,
        new_depenses_total=dep_total,
        covered_current_total=covered_current_total,
        covered_target_total=sum(target_totals.values()),
        coverage_share_of_depenses=(covered_current_total / original_dep) if original_dep > 0.0 else 0.0,
        iterations=iterations,
        excluded_codes=sorted(excluded_codes),
    )
    return baseline, stats, target_masses


def apply_legacy_core_delta(
    baseline_path: str,
    lego_cfg_path: str,
    plf_csv_path: str,
) -> Tuple[dict, RebalanceStats, Dict[str, float]]:
    baseline = _load_json(baseline_path)
    lego_cfg = _load_json(lego_cfg_path)
    piece_missions = _build_piece_missions(lego_cfg)

    original_dep = float(baseline.get("depenses_total_eur") or 0.0)
    current_totals = _mission_totals_from_baseline(baseline, piece_missions)
    voted_amounts = _read_plf_amounts_by_code(plf_csv_path)

    factors: Dict[str, float] = {}
    for sim_mass, cfg in LEGACY_CORE_PROPOSED_BY_SIM_MISSION.items():
        proposed = float(cfg.get("proposed_total_eur") or 0.0)
        codes = [str(c).upper() for c in (cfg.get("codes") or [])]
        voted = sum(float(voted_amounts.get(code, 0.0)) for code in codes)
        if proposed <= 0.0 or voted <= 0.0 or not codes:
            continue
        factors[sim_mass] = voted / proposed

    if not factors:
        raise RuntimeError("Could not compute legacy core factors from PLF CSV.")

    _apply_fixed_mission_factors(baseline, piece_missions, factors)

    # Preserve global APU total.
    new_dep = sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "expenditure"
    )
    dep_scale = (original_dep / new_dep) if new_dep > 0.0 else 1.0
    if dep_scale != 1.0:
        for ent in baseline.get("pieces", []):
            if str(ent.get("type")) == "expenditure":
                ent["amount_eur"] = float(ent.get("amount_eur") or 0.0) * dep_scale

    dep_total = sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "expenditure"
    )
    rev_total = sum(
        float(ent.get("amount_eur") or 0.0)
        for ent in baseline.get("pieces", [])
        if str(ent.get("type")) == "revenue"
    )
    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) == "expenditure":
            amt = float(ent.get("amount_eur") or 0.0)
            ent["share"] = (amt / dep_total) if dep_total > 0.0 else 0.0

    baseline["depenses_total_eur"] = dep_total
    baseline["recettes_total_eur"] = rev_total

    covered_current_total = sum(float(current_totals.get(m, 0.0)) for m in factors.keys())

    meta = baseline.setdefault("meta", {})
    warning = str(meta.get("warning") or "")
    overlay_note = (
        "PLF-2026 conservative overlay applied on core missions (AA/JA/EC/DA) "
        "using voted/proposed ratios"
    )
    meta["warning"] = f"{warning}; {overlay_note}".strip("; ").strip()
    meta["plf_overlay"] = {
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "source_csv": os.path.abspath(plf_csv_path),
        "mode": "legacy_core_ratio",
        "legacy_core_proposed_by_sim_mission": LEGACY_CORE_PROPOSED_BY_SIM_MISSION,
        "applied_factors_by_sim_mission": factors,
    }

    stats = RebalanceStats(
        original_depenses_total=original_dep,
        new_depenses_total=dep_total,
        covered_current_total=covered_current_total,
        covered_target_total=covered_current_total,
        coverage_share_of_depenses=(covered_current_total / original_dep) if original_dep > 0.0 else 0.0,
        iterations=1,
        excluded_codes=[],
        mode="legacy_core_ratio",
    )
    return baseline, stats, factors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rebalance lego_baseline_2026 expenditures using PLF 2026 mission ceilings while keeping APU totals."
    )
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--lego", type=str, default="")
    parser.add_argument("--lego-config", type=str, default=os.path.join(DATA_DIR, "lego_pieces.json"))
    parser.add_argument("--plf-csv", type=str, default=os.path.join(ROOT, "warehouse", "seeds", "plf_2026_plafonds.csv"))
    parser.add_argument("--out", type=str, default="")
    parser.add_argument("--iterations", type=int, default=14)
    parser.add_argument("--exclude-codes", type=str, default="RD,PC")
    parser.add_argument(
        "--mode",
        choices=["legacy_core_ratio", "share_rebalance"],
        default="legacy_core_ratio",
        help="legacy_core_ratio: conservative voted/proposed deltas on core missions; "
        "share_rebalance: full PLF share rebalance over mapped masses.",
    )
    args = parser.parse_args()

    baseline_path = args.lego or os.path.join(DATA_DIR, "cache", f"lego_baseline_{args.year}.json")
    out_path = args.out or baseline_path
    excluded_codes = {c.strip().upper() for c in str(args.exclude_codes).split(",") if c.strip()}

    if args.mode == "share_rebalance":
        baseline, stats, target_masses = rebalance_lego_baseline(
            baseline_path=baseline_path,
            lego_cfg_path=args.lego_config,
            plf_csv_path=args.plf_csv,
            iterations=args.iterations,
            excluded_codes=excluded_codes,
        )
    else:
        baseline, stats, factors = apply_legacy_core_delta(
            baseline_path=baseline_path,
            lego_cfg_path=args.lego_config,
            plf_csv_path=args.plf_csv,
        )
        target_masses = sorted(factors.keys())

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(baseline, fh, ensure_ascii=False, indent=2)

    print(f"Wrote {out_path}")
    print(
        "Rebalance stats:",
        {
            "original_depenses_total": stats.original_depenses_total,
            "new_depenses_total": stats.new_depenses_total,
            "covered_current_total": stats.covered_current_total,
            "covered_target_total": stats.covered_target_total,
            "coverage_share_of_depenses": stats.coverage_share_of_depenses,
            "iterations": stats.iterations,
            "excluded_codes": stats.excluded_codes,
            "mode": stats.mode,
            "target_masses": target_masses,
        },
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
