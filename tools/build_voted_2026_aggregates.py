#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import defaultdict
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any


ROOT = Path(__file__).resolve().parents[1]


# Keep aligned with current simulation typology used in the overlay tool.
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

ALLOWED_SOURCE_QUALITY = {"voted", "observed", "estimated"}
EXCLUDED_STATE_MISSION_CODES = {"RD", "PC"}
PILLAR_BY_SUBSECTOR = {
    "S1311": "state",
    "S1313": "local",
    "S1314": "social",
}
PILLAR_KEYS = ("state", "social", "local")


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def _to_bool(raw: str | None) -> bool:
    return str(raw or "").strip().lower() in {"1", "true", "yes", "y"}


def _to_int(raw: str | None) -> int:
    return int(float(str(raw or "0").strip()))


def _to_float(raw: str | None) -> float:
    return float(str(raw or "0").strip())


def _clean_source_quality(raw: str | None) -> str:
    value = str(raw or "estimated").strip().lower()
    if value not in ALLOWED_SOURCE_QUALITY:
        return "estimated"
    return value


def _read_apul_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise RuntimeError(
            f"APUL verified CSV is required for hardening but is missing: {path}"
        )
    rows = _read_csv(path)
    out: list[dict[str, Any]] = []
    for row in rows:
        mass_id = str(row.get("mass_id") or "").strip().upper()
        if not mass_id:
            continue
        match_ok = _to_bool(row.get("match_ok"))
        if not match_ok:
            raise RuntimeError(f"APUL verification CSV contains mismatches for mass '{mass_id}'")
        out.append(
            {
                "year": _to_int(row.get("year")),
                "mass_id": mass_id,
                "mass_label": str(row.get("mass_label") or "").strip(),
                "subsector": str(row.get("subsector") or "S1313").strip().upper() or "S1313",
                "amount_eur": _to_float(row.get("amount_eur")),
                "source_quality": _clean_source_quality(row.get("source_quality")),
                "source_ref": str(row.get("source_ref") or "").strip(),
                "method_note": str(row.get("method_note") or "").strip(),
                "match_ok": match_ok,
            }
        )
    return out


def _pillar_for_subsector(subsector: str | None) -> str | None:
    return PILLAR_BY_SUBSECTOR.get(str(subsector or "").strip().upper())


def _init_pillars() -> Dict[str, Dict[str, list[dict[str, Any]]]]:
    return {key: {"expenditure": [], "revenue": []} for key in PILLAR_KEYS}


def _build_apu_targets(payload: Dict[str, Any]) -> Dict[str, Any]:
    entries_exp: list[dict[str, Any]] = []
    entries_rev: list[dict[str, Any]] = []

    sources = payload.get("sources", {})
    state_source = str(sources.get("state_b_csv") or "")
    social_source = str(sources.get("lfss_branch_csv") or "")
    apul_source = str(sources.get("apul_csv") or "")

    state_missions = payload.get("state", {}).get("etat_b_cp_by_mission_eur", {})
    for mission_code, amount in state_missions.items():
        mission_key = str(mission_code).strip().upper()
        if not mission_key or mission_key in EXCLUDED_STATE_MISSION_CODES:
            continue
        mapping = PLF_TO_SIM_MISSION.get(mission_key)
        if not mapping:
            continue
        base_amount = float(amount or 0.0)
        if base_amount <= 0.0:
            continue
        for mass_id, weight in mapping.items():
            entries_exp.append(
                {
                    "mass_id": mass_id,
                    "subsector": "S1311",
                    "amount_eur": base_amount * float(weight),
                    "source_quality": "voted",
                    "source_ref": state_source,
                    "method_note": f"LFI ETAT B mission {mission_key} mapped to simulation mass",
                }
            )

    social_branches = payload.get("social", {}).get("lfss_branch_equilibre_eur", {})
    for branch_key, mapping in LFSS_BRANCH_TO_SIM_MISSION.items():
        dep = float((social_branches.get(branch_key) or {}).get("depenses_eur") or 0.0)
        if dep <= 0.0:
            continue
        for mass_id, weight in mapping.items():
            entries_exp.append(
                {
                    "mass_id": mass_id,
                    "subsector": "S1314",
                    "amount_eur": dep * float(weight),
                    "source_quality": "voted",
                    "source_ref": social_source,
                    "method_note": f"LFSS branch {branch_key} mapped to simulation mass",
                }
            )

    apul_rows = payload.get("local", {}).get("apul_rows", [])
    for row in apul_rows:
        amount = float(row.get("amount_eur") or 0.0)
        if amount <= 0.0:
            continue
        entries_exp.append(
            {
                "mass_id": str(row.get("mass_id") or "").strip().upper(),
                "subsector": str(row.get("subsector") or "S1313").strip().upper() or "S1313",
                "amount_eur": amount,
                "source_quality": _clean_source_quality(row.get("source_quality")),
                "source_ref": str(row.get("source_ref") or apul_source).strip(),
                "method_note": str(row.get("method_note") or "DGCL-first APUL bridge row").strip(),
            }
        )

    revenue_targets = payload.get("calibration_targets", {}).get("revenue_targets_eur", {})
    state_fiscal = float(revenue_targets.get("state_fiscal_eur") or 0.0)
    state_non_fiscal = float(revenue_targets.get("state_non_fiscal_eur") or 0.0)
    social_security = float(revenue_targets.get("lfss_all_branches_recettes_eur") or 0.0)
    local_revenue = float(revenue_targets.get("apul_local_revenue_eur") or 0.0)
    if state_fiscal > 0.0:
        entries_rev.append(
            {
                "group_id": "state_fiscal",
                "subsector": "S1311",
                "amount_eur": state_fiscal,
                "source_quality": "voted",
                "source_ref": str(sources.get("state_a_csv") or state_source),
                "method_note": "LFI ETAT A fiscal receipts net of PSR",
            }
        )
    if state_non_fiscal > 0.0:
        entries_rev.append(
            {
                "group_id": "state_non_fiscal",
                "subsector": "S1311",
                "amount_eur": state_non_fiscal,
                "source_quality": "voted",
                "source_ref": str(sources.get("state_a_csv") or state_source),
                "method_note": "LFI ETAT A non-fiscal receipts",
            }
        )
    if social_security > 0.0:
        entries_rev.append(
            {
                "group_id": "social_security",
                "subsector": "S1314",
                "amount_eur": social_security,
                "source_quality": "voted",
                "source_ref": social_source,
                "method_note": "LFSS all branches receipts (hors transferts entre branches)",
            }
        )
    if local_revenue > 0.0:
        entries_rev.append(
            {
                "group_id": "local_non_fiscal",
                "subsector": "S1313",
                "amount_eur": local_revenue,
                "source_quality": "estimated",
                "source_ref": apul_source,
                "method_note": "APUL local revenue estimate from DGCL-first bridge",
            }
        )

    # Summaries are useful for quick coverage diagnostics.
    exp_by_mass: Dict[str, float] = defaultdict(float)
    for row in entries_exp:
        exp_by_mass[str(row.get("mass_id"))] += float(row.get("amount_eur") or 0.0)
    rev_by_group: Dict[str, float] = defaultdict(float)
    for row in entries_rev:
        rev_by_group[str(row.get("group_id"))] += float(row.get("amount_eur") or 0.0)

    pillars = _init_pillars()
    for row in entries_exp:
        pillar = _pillar_for_subsector(str(row.get("subsector") or ""))
        if pillar:
            pillars[pillar]["expenditure"].append(row)
    for row in entries_rev:
        pillar = _pillar_for_subsector(str(row.get("subsector") or ""))
        if pillar:
            pillars[pillar]["revenue"].append(row)

    summary_by_pillar: Dict[str, Dict[str, float | int]] = {}
    for pillar in PILLAR_KEYS:
        exp_rows = pillars[pillar]["expenditure"]
        rev_rows = pillars[pillar]["revenue"]
        summary_by_pillar[pillar] = {
            "expenditure_eur": sum(float(row.get("amount_eur") or 0.0) for row in exp_rows),
            "revenue_eur": sum(float(row.get("amount_eur") or 0.0) for row in rev_rows),
            "expenditure_rows": len(exp_rows),
            "revenue_rows": len(rev_rows),
        }

    return {
        "year": int(payload.get("year") or 2026),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
        "targets": {
            "expenditure": entries_exp,
            "revenue": entries_rev,
        },
        "pillars": pillars,
        "summary": {
            "expenditure_by_mass_eur": dict(exp_by_mass),
            "revenue_by_group_eur": dict(rev_by_group),
            "by_pillar": summary_by_pillar,
        },
        "notes": [
            "APU targets are explicit rows with source_quality tags (voted/observed/estimated).",
            "Local APUL rows are DGCL-first bridge estimates until full observed accounts are available.",
            "Values are meant for transparent calibration; warn-level quality checks are performed in overlay stage.",
        ],
    }


def build_aggregates(
    state_b_csv: Path,
    state_a_csv: Path,
    state_a_lines_csv: Path,
    lfss_branch_csv: Path,
    lfss_asso_csv: Path,
    apul_csv: Path,
) -> Dict[str, Any]:
    rows_b = _read_csv(state_b_csv)
    rows_a = _read_csv(state_a_csv)
    rows_a_lines = _read_csv(state_a_lines_csv)
    rows_lfss_branch = _read_csv(lfss_branch_csv)
    rows_lfss_asso = _read_csv(lfss_asso_csv)
    rows_apul = _read_apul_rows(apul_csv)

    if not rows_b:
        raise RuntimeError(f"No rows in {state_b_csv}")
    if not rows_a:
        raise RuntimeError(f"No rows in {state_a_csv}")
    if not rows_lfss_branch:
        raise RuntimeError(f"No rows in {lfss_branch_csv}")
    if not rows_lfss_asso:
        raise RuntimeError(f"No rows in {lfss_asso_csv}")
    if not rows_a_lines:
        raise RuntimeError(f"No rows in {state_a_lines_csv}")
    if not rows_apul:
        raise RuntimeError(
            f"No APUL rows in {apul_csv}. Hardening requires explicit, verified APUL rows."
        )

    if any(not _to_bool(r.get("match_ok")) for r in rows_b):
        raise RuntimeError("State B verification CSV contains mismatches")
    if any(not _to_bool(r.get("match_ok")) for r in rows_a):
        raise RuntimeError("State A verification CSV contains mismatches")
    if any(not _to_bool(r.get("match_ok")) for r in rows_lfss_branch):
        raise RuntimeError("LFSS branch verification CSV contains mismatches")
    if any(not _to_bool(r.get("match_ok")) for r in rows_lfss_asso):
        raise RuntimeError("LFSS ASSO verification CSV contains mismatches")

    state_b_cp_by_mission_eur: Dict[str, int] = {}
    for row in rows_b:
        code = str(row.get("mission_code") or "").strip().upper()
        if not code:
            continue
        state_b_cp_by_mission_eur[code] = _to_int(row.get("cp_eur_jo") or row.get("cp_eur_budget_annex"))

    state_a_aggregates_eur: Dict[str, int] = {}
    for row in rows_a:
        key = str(row.get("metric_key") or "").strip()
        if not key:
            continue
        state_a_aggregates_eur[key] = _to_int(row.get("value_eur"))

    lfss_branch_equilibre_eur: Dict[str, Dict[str, int]] = {}
    for row in rows_lfss_branch:
        key = str(row.get("branch_key") or "").strip()
        if not key:
            continue
        lfss_branch_equilibre_eur[key] = {
            "recettes_eur": _to_int(row.get("recettes_eur")),
            "depenses_eur": _to_int(row.get("depenses_eur")),
            "solde_eur": _to_int(row.get("solde_eur")),
        }

    lfss_asso_pct_pib: Dict[str, float] = {}
    for row in rows_lfss_asso:
        key = str(row.get("metric_key") or "").strip()
        if not key:
            continue
        lfss_asso_pct_pib[key] = _to_float(row.get("value_pct_pib"))

    state_a_line_items_eur: Dict[str, Dict[str, Any]] = {}
    for row in rows_a_lines:
        line_code = str(row.get("line_code") or "").strip()
        if not line_code:
            continue
        state_a_line_items_eur[line_code] = {
            "section": str(row.get("section") or "").strip(),
            "label": str(row.get("label") or "").strip(),
            "amount_eur": _to_int(row.get("amount_eur")),
        }

    apul_blocks_eur: Dict[str, float] = defaultdict(float)
    for row in rows_apul:
        apul_blocks_eur[str(row.get("mass_id"))] += float(row.get("amount_eur") or 0.0)

    state_psr_eur = int(state_a_aggregates_eur.get("budget_general_psr_collectivites_ue", 0))
    state_fiscal_gross_eur = int(state_a_aggregates_eur.get("budget_general_recettes_fiscales_nettes", 0))
    state_fiscal_eur = max(state_fiscal_gross_eur - state_psr_eur, 0)
    state_non_fiscal_eur = int(state_a_aggregates_eur.get("budget_general_recettes_non_fiscales", 0))
    lfss_all_branches_recettes_eur = int(
        lfss_branch_equilibre_eur.get("all_branches_hors_transferts", {}).get("recettes_eur", 0)
    )
    lfss_all_branches_depenses_eur = int(
        lfss_branch_equilibre_eur.get("all_branches_hors_transferts", {}).get("depenses_eur", 0)
    )

    payload: Dict[str, Any] = {
        "year": 2026,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "state_b_csv": str(state_b_csv.resolve()),
            "state_a_csv": str(state_a_csv.resolve()),
            "state_a_lines_csv": str(state_a_lines_csv.resolve()),
            "lfss_branch_csv": str(lfss_branch_csv.resolve()),
            "lfss_asso_csv": str(lfss_asso_csv.resolve()),
            "apul_csv": str(apul_csv.resolve()) if apul_csv.exists() else "",
        },
        "state": {
            "etat_b_cp_by_mission_eur": state_b_cp_by_mission_eur,
            "etat_a_aggregates_eur": state_a_aggregates_eur,
            "etat_a_line_items_eur": state_a_line_items_eur,
        },
        "social": {
            "lfss_branch_equilibre_eur": lfss_branch_equilibre_eur,
            "lfss_asso_pct_pib": lfss_asso_pct_pib,
        },
        "local": {
            "apul_blocks_eur": dict(apul_blocks_eur),
            "apul_rows": rows_apul,
        },
        "calibration_targets": {
            "revenue_targets_eur": {
                "state_fiscal_eur": state_fiscal_eur,
                "state_fiscal_gross_eur": state_fiscal_gross_eur,
                "state_psr_collectivites_ue_eur": state_psr_eur,
                "state_non_fiscal_eur": state_non_fiscal_eur,
                "lfss_all_branches_recettes_eur": lfss_all_branches_recettes_eur,
                "lfss_all_branches_depenses_eur": lfss_all_branches_depenses_eur,
            },
            "notes": [
                "State mission CP targets are from ETAT B.",
                "State fiscal target is ETAT A fiscal receipts net of PSR (collectivites + UE) for APU resource consistency.",
                "State non-fiscal target is from ETAT A.",
                "Social branch receipts/expenses are from LFSS voted branch equilibrium table.",
                "Local APUL bridge rows are imported from verify_apul_2026 output (DGCL-first, source-tagged).",
            ],
        },
    }
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build consolidated voted-2026 aggregates bundle from verified LFI/LFSS CSVs."
    )
    parser.add_argument(
        "--state-b-csv",
        default=str(ROOT / "data" / "reference" / "lfi_2026_etat_b_cp_verified.csv"),
    )
    parser.add_argument(
        "--state-a-csv",
        default=str(ROOT / "data" / "reference" / "lfi_2026_etat_a_aggregates_verified.csv"),
    )
    parser.add_argument(
        "--state-a-lines-csv",
        default=str(ROOT / "data" / "reference" / "lfi_2026_etat_a_line_items_verified.csv"),
    )
    parser.add_argument(
        "--lfss-branch-csv",
        default=str(ROOT / "data" / "reference" / "lfss_2026_branch_equilibre_verified.csv"),
    )
    parser.add_argument(
        "--lfss-asso-csv",
        default=str(ROOT / "data" / "reference" / "lfss_2026_asso_pct_verified.csv"),
    )
    parser.add_argument(
        "--apul-csv",
        default=str(ROOT / "data" / "reference" / "apul_2026_verified.csv"),
    )
    parser.add_argument(
        "--out",
        default=str(ROOT / "data" / "reference" / "voted_2026_aggregates.json"),
    )
    parser.add_argument(
        "--targets-out",
        default=str(ROOT / "data" / "reference" / "apu_2026_targets.json"),
    )
    args = parser.parse_args()

    payload = build_aggregates(
        Path(args.state_b_csv),
        Path(args.state_a_csv),
        Path(args.state_a_lines_csv),
        Path(args.lfss_branch_csv),
        Path(args.lfss_asso_csv),
        Path(args.apul_csv),
    )
    apu_targets = _build_apu_targets(payload)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    targets_out_path = Path(args.targets_out)
    targets_out_path.parent.mkdir(parents=True, exist_ok=True)
    targets_out_path.write_text(json.dumps(apu_targets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote aggregate bundle: {out_path}")
    print(f"Wrote APU targets: {targets_out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
