#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Tuple


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")
API_DIR = os.path.join(ROOT, "services", "api")


def _load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_weights(entries: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
    total = sum(weight for _, weight in entries)
    if total <= 0:
        return []
    return [(code, float(weight) / total) for code, weight in entries if weight > 0]


def _build_mission_bridges(pieces: List[dict]) -> Dict[str, List[Tuple[str, float]]]:
    mission_by_piece: Dict[str, List[Tuple[str, float]]] = {}
    for piece in pieces:
        pid = str(piece.get("id"))
        mapping = piece.get("mapping") or {}
        missions_raw = mapping.get("mission") or []
        missions: List[Tuple[str, float]] = []
        for ent in missions_raw:
            code = str(ent.get("code") or "").strip()
            if not code:
                continue
            try:
                weight = float(ent.get("weight", 0.0))
            except Exception:
                weight = 0.0
            if weight <= 0:
                continue
            missions.append((code.upper(), weight))
        missions = _normalize_weights(missions) if missions else []
        if missions:
            mission_by_piece[pid] = missions
    return mission_by_piece


def _cofog_majors(piece: dict) -> List[str]:
    majors: List[str] = []
    mapping = piece.get("mapping") or {}
    for ent in mapping.get("cofog") or []:
        code = str(ent.get("code") or "").strip()
        if not code:
            continue
        major = code.split(".")[0][:2]
        if major and major not in majors:
            majors.append(major)
    return majors


def _build_lego_pieces(pieces: List[dict], mission_by_piece: Dict[str, List[Tuple[str, float]]]) -> List[dict]:
    out: List[dict] = []
    for piece in pieces:
        pid = str(piece.get("id"))
        label = piece.get("label")
        description = piece.get("description")
        out.append({
            "id": pid,
            "label": str(label) if label is not None else pid,
            "description": str(description) if description is not None else None,
            "type": str(piece.get("type") or "expenditure"),
            "cofogMajors": _cofog_majors(piece),
            "missions": [
                {"code": code, "weight": weight}
                for code, weight in mission_by_piece.get(pid, [])
            ],
        })
    return out


def _build_lego_baseline(baseline: dict, mission_by_piece: Dict[str, List[Tuple[str, float]]]) -> dict:
    pieces_out: List[dict] = []
    for ent in baseline.get("pieces", []):
        pid = str(ent.get("id"))
        pieces_out.append({
            "id": pid,
            "amountEur": ent.get("amount_eur"),
            "share": ent.get("share"),
            "missions": [
                {"code": code, "weight": weight}
                for code, weight in mission_by_piece.get(pid, [])
            ],
        })
    return {
        "pib": baseline.get("pib_eur", 0.0),
        "depensesTotal": baseline.get("depenses_total_eur", 0.0),
        "recettesTotal": baseline.get("recettes_total_eur", 0.0),
        "pieces": pieces_out,
    }


def _format_mass_totals(totals: Dict[str, float]) -> List[dict]:
    total_amount = sum(max(float(v), 0.0) for v in totals.values())
    items: List[dict] = []
    for code, amount in totals.items():
        val = max(float(amount), 0.0)
        if val == 0.0:
            continue
        share = (val / total_amount) if total_amount > 0 else 0.0
        items.append({"massId": code, "amountEur": val, "share": share})
    items.sort(key=lambda x: x["amountEur"], reverse=True)
    return items


def _build_builder_masses_admin(baseline: dict, mission_by_piece: Dict[str, List[Tuple[str, float]]]) -> List[dict]:
    totals: Dict[str, float] = defaultdict(float)
    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) != "expenditure":
            continue
        try:
            amt = float(ent.get("amount_eur") or 0.0)
        except Exception:
            amt = 0.0
        if amt == 0.0:
            continue
        pid = str(ent.get("id"))
        missions = mission_by_piece.get(pid) or []
        if not missions:
            totals["M_UNKNOWN"] += amt
            continue
        for code, weight in missions:
            totals[code] += amt * weight
    return _format_mass_totals(totals)


def _build_labels(ux_labels: dict) -> tuple[List[dict], List[dict]]:
    mass_labels = []
    for ent in ux_labels.get("masses", []):
        mass_labels.append({
            "id": str(ent.get("id")),
            "displayLabel": str(ent.get("displayLabel") or ent.get("id")),
            "color": ent.get("color"),
            "icon": ent.get("icon"),
        })
    mission_labels = []
    for ent in ux_labels.get("missions", []):
        mission_labels.append({
            "id": str(ent.get("id")),
            "displayLabel": str(ent.get("displayLabel") or ent.get("id")),
            "color": ent.get("color"),
            "icon": ent.get("icon"),
        })
    return mass_labels, mission_labels


def _build_popular_intents(intents: dict, limit: int = 6) -> List[dict]:
    arr = sorted(intents.get("intents", []), key=lambda e: float(e.get("popularity", 0.0)), reverse=True)[:limit]
    out: List[dict] = []
    for it in arr:
        out.append({
            "id": str(it.get("id")),
            "label": str(it.get("label")),
            "emoji": str(it.get("emoji") or ""),
            "massId": str(it.get("massId") or ""),
            "seed": it.get("seed") or {},
        })
    return out


def _build_policy_levers() -> List[dict]:
    sys.path.insert(0, API_DIR)
    import policy_catalog as pol  # type: ignore

    items = pol.list_policy_levers()
    out: List[dict] = []
    for it in items:
        impact = it.get("impact") or {}
        out.append({
            "id": str(it.get("id")),
            "family": str(it.get("family")),
            "budgetSide": str(it.get("budget_side") or ""),
            "majorAmendment": bool(it.get("major_amendment", False)),
            "label": str(it.get("label")),
            "description": str(it.get("description") or ""),
            "fixedImpactEur": it.get("fixed_impact_eur"),
            "massMapping": it.get("mass_mapping") or {},
            "missionMapping": it.get("mission_mapping") or {},
            "impact": {
                "householdsImpacted": impact.get("householdsImpacted"),
                "decile1ImpactEur": impact.get("decile1ImpactEur"),
                "decile10ImpactEur": impact.get("decile10ImpactEur"),
                "gdpImpactPct": impact.get("gdpImpactPct"),
                "jobsImpactCount": impact.get("jobsImpactCount"),
            } if impact else None,
        })
    return out


def build_snapshot(year: int) -> dict:
    baseline_path = os.path.join(CACHE_DIR, f"lego_baseline_{year}.json")
    lego_path = os.path.join(DATA_DIR, "lego_pieces.json")
    ux_path = os.path.join(DATA_DIR, "ux_labels.json")
    intents_path = os.path.join(DATA_DIR, "intents.json")

    baseline = _load_json(baseline_path)
    lego_cfg = _load_json(lego_path)
    pieces = lego_cfg.get("pieces", [])
    mission_by_piece = _build_mission_bridges(pieces)

    mass_labels, mission_labels = _build_labels(_load_json(ux_path))
    snapshot = {
        "legoBaseline": _build_lego_baseline(baseline, mission_by_piece),
        "legoPieces": _build_lego_pieces(pieces, mission_by_piece),
        "builderMassesAdmin": _build_builder_masses_admin(baseline, mission_by_piece),
        "massLabels": mass_labels,
        "missionLabels": mission_labels,
        "policyLevers": _build_policy_levers(),
        "popularIntents": _build_popular_intents(_load_json(intents_path)),
    }
    return snapshot


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a precomputed Build page snapshot JSON.")
    parser.add_argument("--year", type=int, default=2026, help="Baseline year to snapshot.")
    parser.add_argument("--out", type=str, default="", help="Output path for JSON.")
    args = parser.parse_args()

    out_path = args.out or os.path.join(CACHE_DIR, f"build_page_{args.year}.json")
    snapshot = build_snapshot(args.year)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    meta_path = out_path.replace(".json", ".meta.json")
    meta = {
        "year": args.year,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "tools/build_snapshot.py",
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Wrote {out_path}")
    print(f"Wrote {meta_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
