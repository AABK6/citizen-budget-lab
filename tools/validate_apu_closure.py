#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data" / "reference" / "apu_2026_targets.json"
DEFAULT_AGGREGATES = ROOT / "data" / "reference" / "voted_2026_aggregates.json"
DEFAULT_BRIDGE = ROOT / "data" / "reference" / "cofog_bridge_apu_2026.csv"
DEFAULT_OUT = ROOT / "data" / "outputs" / "validation_report_2026.json"

REQUIRED_BRIDGE_COLUMNS = {
    "year",
    "entry_type",
    "subsector",
    "key",
    "cofog",
    "na_item",
    "mass_id",
    "weight",
    "source",
    "source_url",
}
SUBSECTOR_CODES = {
    "state": "S1311",
    "social": "S1314",
    "local": "S1313",
    "S1311": "S1311",
    "S1313": "S1313",
    "S1314": "S1314",
}


def _read_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def _to_float(raw: Any) -> float:
    return float(str(raw or "0").strip())


def _to_int(raw: Any) -> int:
    return int(float(str(raw or "0").strip()))


def _normalize_subsector(raw: str | None) -> str:
    key = str(raw or "").strip()
    if key in SUBSECTOR_CODES:
        return SUBSECTOR_CODES[key]
    lowered = key.lower()
    if lowered in SUBSECTOR_CODES:
        return SUBSECTOR_CODES[lowered]
    raise RuntimeError(f"Unsupported subsector '{raw}' in bridge")


def _load_bridge(path: Path, year: int) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    if not path.exists():
        raise RuntimeError(f"Bridge file not found: {path}")
    rows = _read_csv(path)
    if not rows:
        raise RuntimeError(f"Bridge file is empty: {path}")

    missing = REQUIRED_BRIDGE_COLUMNS - set(rows[0].keys())
    if missing:
        raise RuntimeError(f"Bridge file missing required columns: {', '.join(sorted(missing))}")

    out: list[dict[str, Any]] = []
    weights_by_group: Dict[tuple[str, str, str], float] = defaultdict(float)
    dedupe: set[tuple[str, str, str, str]] = set()

    for idx, row in enumerate(rows, start=2):
        row_year = _to_int(row.get("year"))
        if row_year != int(year):
            continue
        entry_type = str(row.get("entry_type") or "").strip().lower()
        key = str(row.get("key") or "").strip().upper()
        mass_id = str(row.get("mass_id") or "").strip().upper()
        cofog = str(row.get("cofog") or "").strip().upper()
        na_item = str(row.get("na_item") or "").strip().upper()
        source = str(row.get("source") or "").strip()
        source_url = str(row.get("source_url") or "").strip()
        weight = _to_float(row.get("weight"))

        try:
            subsector = _normalize_subsector(row.get("subsector"))
        except RuntimeError as exc:
            errors.append(f"line {idx}: {exc}")
            continue

        if not entry_type:
            errors.append(f"line {idx}: missing entry_type")
        if not key:
            errors.append(f"line {idx}: missing key")
        if not mass_id:
            errors.append(f"line {idx}: missing mass_id")
        if not cofog:
            errors.append(f"line {idx}: missing cofog")
        if not na_item:
            errors.append(f"line {idx}: missing na_item")
        if not source or not source_url:
            errors.append(f"line {idx}: source and source_url are required")
        if weight <= 0.0:
            errors.append(f"line {idx}: non-positive weight {weight} for {entry_type}/{key}/{mass_id}")

        dup_key = (entry_type, key, mass_id, subsector)
        if dup_key in dedupe:
            errors.append(f"line {idx}: duplicate mapping {dup_key}")
        dedupe.add(dup_key)

        normalized = {
            "year": row_year,
            "entry_type": entry_type,
            "subsector": subsector,
            "key": key,
            "mass_id": mass_id,
            "cofog": cofog,
            "na_item": na_item,
            "weight": weight,
            "source": source,
            "source_url": source_url,
            "note": str(row.get("note") or "").strip(),
        }
        out.append(normalized)
        weights_by_group[(entry_type, subsector, key)] += weight

    for (entry_type, subsector, key), total in sorted(weights_by_group.items()):
        if abs(total - 1.0) > 1e-9:
            errors.append(
                f"bridge weights do not close for {entry_type}/{subsector}/{key}: got {total:.12f}, expected 1.0"
            )

    if not out:
        errors.append(f"bridge has no rows for year {year}")
    return out, errors


def _rows_from_targets(apu_targets: dict, section: str) -> list[dict[str, Any]]:
    targets = apu_targets.get("targets", {}) if isinstance(apu_targets.get("targets", {}), dict) else {}
    rows = targets.get(section, [])
    if isinstance(rows, list):
        return [row for row in rows if isinstance(row, dict)]
    return []


def _build_bridge_index(rows: Iterable[dict[str, Any]]) -> Dict[tuple[str, str], list[dict[str, Any]]]:
    idx: Dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        idx[(str(row.get("entry_type") or ""), str(row.get("key") or ""))].append(row)
    return idx


def _compute_allocations(
    aggregates: dict,
    bridge_rows: list[dict[str, Any]],
    excluded_state_codes: set[str],
) -> tuple[list[dict[str, Any]], list[str], Dict[str, float], Dict[str, float]]:
    errors: list[str] = []
    index = _build_bridge_index(bridge_rows)
    allocations: list[dict[str, Any]] = []

    source_totals_by_subsector: Dict[str, float] = defaultdict(float)
    allocated_totals_by_subsector: Dict[str, float] = defaultdict(float)

    state_missions = aggregates.get("state", {}).get("etat_b_cp_by_mission_eur", {})
    for code, amount in state_missions.items():
        mission = str(code).strip().upper()
        if not mission or mission in excluded_state_codes:
            continue
        amount_eur = float(amount or 0.0)
        if amount_eur <= 0.0:
            continue
        mappings = index.get(("state_mission", mission), [])
        if not mappings:
            errors.append(f"missing bridge mapping for state mission {mission}")
            continue
        source_totals_by_subsector["S1311"] += amount_eur
        for mapping in mappings:
            alloc = amount_eur * float(mapping.get("weight") or 0.0)
            allocated_totals_by_subsector[str(mapping.get("subsector") or "S1311")] += alloc
            allocations.append(
                {
                    "entry_type": "state_mission",
                    "source_key": mission,
                    "subsector": str(mapping.get("subsector") or "S1311"),
                    "cofog": str(mapping.get("cofog") or ""),
                    "na_item": str(mapping.get("na_item") or ""),
                    "mass_id": str(mapping.get("mass_id") or ""),
                    "amount_eur": alloc,
                }
            )

    social_branches = aggregates.get("social", {}).get("lfss_branch_equilibre_eur", {})
    for branch_key, values in social_branches.items():
        branch = str(branch_key).strip().upper()
        if branch == "ALL_BRANCHES_HORS_TRANSFERTS":
            continue
        depenses = float((values or {}).get("depenses_eur") or 0.0)
        if depenses <= 0.0:
            continue
        mappings = index.get(("social_branch", branch), [])
        if not mappings:
            errors.append(f"missing bridge mapping for social branch {branch_key}")
            continue
        source_totals_by_subsector["S1314"] += depenses
        for mapping in mappings:
            alloc = depenses * float(mapping.get("weight") or 0.0)
            allocated_totals_by_subsector[str(mapping.get("subsector") or "S1314")] += alloc
            allocations.append(
                {
                    "entry_type": "social_branch",
                    "source_key": branch,
                    "subsector": str(mapping.get("subsector") or "S1314"),
                    "cofog": str(mapping.get("cofog") or ""),
                    "na_item": str(mapping.get("na_item") or ""),
                    "mass_id": str(mapping.get("mass_id") or ""),
                    "amount_eur": alloc,
                }
            )

    apul_rows = aggregates.get("local", {}).get("apul_rows", [])
    for row in apul_rows:
        key = str(row.get("mass_id") or "").strip().upper()
        amount_eur = float(row.get("amount_eur") or 0.0)
        if not key or amount_eur <= 0.0:
            continue
        mappings = index.get(("local_mass", key), [])
        if not mappings:
            errors.append(f"missing bridge mapping for APUL mass {key}")
            continue
        source_totals_by_subsector["S1313"] += amount_eur
        for mapping in mappings:
            alloc = amount_eur * float(mapping.get("weight") or 0.0)
            allocated_totals_by_subsector[str(mapping.get("subsector") or "S1313")] += alloc
            allocations.append(
                {
                    "entry_type": "local_mass",
                    "source_key": key,
                    "subsector": str(mapping.get("subsector") or "S1313"),
                    "cofog": str(mapping.get("cofog") or ""),
                    "na_item": str(mapping.get("na_item") or ""),
                    "mass_id": str(mapping.get("mass_id") or ""),
                    "amount_eur": alloc,
                }
            )

    return allocations, errors, dict(source_totals_by_subsector), dict(allocated_totals_by_subsector)


def _compare_maps(
    left: Dict[str, float],
    right: Dict[str, float],
    abs_tol_eur: float,
    rel_tol: float,
) -> dict:
    keys = sorted(set(left.keys()) | set(right.keys()))
    by_key: Dict[str, Dict[str, float | bool]] = {}
    max_abs = 0.0
    max_rel = 0.0
    ok = True

    for key in keys:
        lv = float(left.get(key, 0.0))
        rv = float(right.get(key, 0.0))
        diff = lv - rv
        abs_diff = abs(diff)
        denom = abs(rv) if abs(rv) > 0.0 else 1.0
        rel_diff = abs_diff / denom
        key_ok = abs_diff <= abs_tol_eur or rel_diff <= rel_tol
        if not key_ok:
            ok = False
        max_abs = max(max_abs, abs_diff)
        max_rel = max(max_rel, rel_diff)
        by_key[key] = {
            "left_eur": lv,
            "right_eur": rv,
            "diff_eur": diff,
            "abs_diff_eur": abs_diff,
            "rel_diff": rel_diff,
            "ok": key_ok,
        }

    return {
        "ok": ok,
        "max_abs_diff_eur": max_abs,
        "max_rel_diff": max_rel,
        "by_key": by_key,
    }


def build_validation_report(
    targets_path: Path,
    aggregates_path: Path,
    bridge_path: Path,
    year: int,
    excluded_state_codes: set[str],
    abs_tol_eur: float,
    rel_tol: float,
) -> dict:
    errors: list[str] = []

    targets = _read_json(targets_path)
    aggregates = _read_json(aggregates_path)
    bridge_rows, bridge_errors = _load_bridge(bridge_path, year=year)
    errors.extend(bridge_errors)

    allocations, alloc_errors, source_by_subsector, allocated_by_subsector = _compute_allocations(
        aggregates,
        bridge_rows,
        excluded_state_codes,
    )
    errors.extend(alloc_errors)

    target_exp_rows = _rows_from_targets(targets, "expenditure")
    target_mass_totals: Dict[str, float] = defaultdict(float)
    target_subsector_totals: Dict[str, float] = defaultdict(float)
    for row in target_exp_rows:
        mass_id = str(row.get("mass_id") or "").strip().upper()
        subsector = str(row.get("subsector") or "").strip().upper()
        amount_eur = float(row.get("amount_eur") or 0.0)
        if not mass_id or amount_eur <= 0.0:
            continue
        target_mass_totals[mass_id] += amount_eur
        if subsector:
            target_subsector_totals[subsector] += amount_eur

    allocated_mass_totals: Dict[str, float] = defaultdict(float)
    allocated_subsector_totals: Dict[str, float] = defaultdict(float)
    allocated_cofog_totals: Dict[str, float] = defaultdict(float)
    for row in allocations:
        amount = float(row.get("amount_eur") or 0.0)
        mass_id = str(row.get("mass_id") or "").strip().upper()
        subsector = str(row.get("subsector") or "").strip().upper()
        cofog = str(row.get("cofog") or "").strip().upper()
        if amount <= 0.0:
            continue
        if mass_id:
            allocated_mass_totals[mass_id] += amount
        if subsector:
            allocated_subsector_totals[subsector] += amount
        if cofog:
            allocated_cofog_totals[cofog] += amount

    subsector_closure = _compare_maps(
        source_by_subsector,
        allocated_by_subsector,
        abs_tol_eur=abs_tol_eur,
        rel_tol=rel_tol,
    )
    mass_closure = _compare_maps(
        dict(allocated_mass_totals),
        dict(target_mass_totals),
        abs_tol_eur=abs_tol_eur,
        rel_tol=rel_tol,
    )
    target_subsector_vs_alloc = _compare_maps(
        dict(allocated_subsector_totals),
        dict(target_subsector_totals),
        abs_tol_eur=abs_tol_eur,
        rel_tol=rel_tol,
    )

    total_alloc = sum(allocated_mass_totals.values())
    total_cofog = sum(allocated_cofog_totals.values())
    cofog_closure = {
        "ok": abs(total_alloc - total_cofog) <= abs_tol_eur,
        "allocated_total_eur": total_alloc,
        "cofog_total_eur": total_cofog,
        "diff_eur": total_alloc - total_cofog,
        "by_cofog_eur": dict(sorted(allocated_cofog_totals.items())),
    }

    rev_targets = (aggregates.get("calibration_targets", {}) or {}).get("revenue_targets_eur", {})
    state_fiscal_gross = float(rev_targets.get("state_fiscal_gross_eur") or 0.0)
    state_psr = float(rev_targets.get("state_psr_collectivites_ue_eur") or 0.0)
    state_fiscal_net = float(rev_targets.get("state_fiscal_eur") or 0.0)
    fiscal_identity_diff = (state_fiscal_gross - state_psr) - state_fiscal_net

    double_count_guards = {
        "state_fiscal_net_identity": {
            "ok": abs(fiscal_identity_diff) <= abs_tol_eur,
            "state_fiscal_gross_eur": state_fiscal_gross,
            "state_psr_collectivites_ue_eur": state_psr,
            "state_fiscal_net_eur": state_fiscal_net,
            "diff_eur": fiscal_identity_diff,
        },
        "all_branches_bridge_forbidden": {
            "ok": not any(r.get("entry_type") == "social_branch" and r.get("key") == "ALL_BRANCHES_HORS_TRANSFERTS" for r in bridge_rows),
        },
    }

    if not subsector_closure.get("ok"):
        errors.append("subsector closure failed")
    if not mass_closure.get("ok"):
        errors.append("mass closure failed")
    if not target_subsector_vs_alloc.get("ok"):
        errors.append("target subsector closure failed")
    if not cofog_closure.get("ok"):
        errors.append("cofog closure failed")
    if not double_count_guards["state_fiscal_net_identity"]["ok"]:
        errors.append("state fiscal net identity failed")
    if not double_count_guards["all_branches_bridge_forbidden"]["ok"]:
        errors.append("invalid social bridge row for all_branches_hors_transferts")

    report = {
        "year": int(year),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "targets": str(targets_path.resolve()),
            "aggregates": str(aggregates_path.resolve()),
            "bridge": str(bridge_path.resolve()),
            "excluded_state_codes": sorted(excluded_state_codes),
        },
        "tolerance": {
            "abs_eur": abs_tol_eur,
            "rel": rel_tol,
        },
        "checks": {
            "bridge_row_count": len(bridge_rows),
            "allocation_row_count": len(allocations),
            "subsector_closure": subsector_closure,
            "mass_closure": mass_closure,
            "target_subsector_vs_alloc": target_subsector_vs_alloc,
            "cofog_closure": cofog_closure,
            "double_count_guards": double_count_guards,
        },
        "status": "ok" if not errors else "failed",
        "errors": sorted(set(errors)),
    }
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate APU 2026 closure across subsector/COFOG/mass with bridge controls.")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--targets", type=str, default=str(DEFAULT_TARGETS))
    parser.add_argument("--aggregates", type=str, default=str(DEFAULT_AGGREGATES))
    parser.add_argument("--bridge", type=str, default=str(DEFAULT_BRIDGE))
    parser.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    parser.add_argument("--exclude-state-codes", type=str, default="RD,PC")
    parser.add_argument("--abs-tol-eur", type=float, default=1e-6)
    parser.add_argument("--rel-tol", type=float, default=1e-9)
    parser.add_argument("--strict", dest="strict", action="store_true", help="Fail with non-zero exit code when any check fails.")
    parser.add_argument("--no-strict", dest="strict", action="store_false", help="Always exit 0 and only emit report.")
    parser.set_defaults(strict=True)
    args = parser.parse_args()

    excluded_state_codes = {
        item.strip().upper()
        for item in str(args.exclude_state_codes).split(",")
        if item.strip()
    }

    report = build_validation_report(
        targets_path=Path(args.targets),
        aggregates_path=Path(args.aggregates),
        bridge_path=Path(args.bridge),
        year=int(args.year),
        excluded_state_codes=excluded_state_codes,
        abs_tol_eur=float(args.abs_tol_eur),
        rel_tol=float(args.rel_tol),
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote validation report: {out_path}")
    print(f"Status: {report['status']}")
    if report.get("errors"):
        for err in report["errors"]:
            print(f"- {err}")

    if args.strict and report.get("status") != "ok":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
