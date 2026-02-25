#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any


ROOT = Path(__file__).resolve().parents[1]


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def _to_bool(raw: str | None) -> bool:
    return str(raw or "").strip().lower() in {"1", "true", "yes", "y"}


def _to_int(raw: str | None) -> int:
    return int(float(str(raw or "0").strip()))


def _to_float(raw: str | None) -> float:
    return float(str(raw or "0").strip())


def build_aggregates(
    state_b_csv: Path,
    state_a_csv: Path,
    state_a_lines_csv: Path,
    lfss_branch_csv: Path,
    lfss_asso_csv: Path,
) -> Dict[str, Any]:
    rows_b = _read_csv(state_b_csv)
    rows_a = _read_csv(state_a_csv)
    rows_a_lines = _read_csv(state_a_lines_csv)
    rows_lfss_branch = _read_csv(lfss_branch_csv)
    rows_lfss_asso = _read_csv(lfss_asso_csv)

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
        "--out",
        default=str(ROOT / "data" / "reference" / "voted_2026_aggregates.json"),
    )
    args = parser.parse_args()

    payload = build_aggregates(
        Path(args.state_b_csv),
        Path(args.state_a_csv),
        Path(args.state_a_lines_csv),
        Path(args.lfss_branch_csv),
        Path(args.lfss_asso_csv),
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote aggregate bundle: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
