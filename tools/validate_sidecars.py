#!/usr/bin/env python3
"""
Validate warmed sidecar metadata files for basic schema and integrity.

Usage:
  python tools/validate_sidecars.py <YEAR>

Behavior:
  - If sidecar files are absent, exits 0 (no warm data yet).
  - If present, validates required keys and produced_columns content.
  - Fails with a non-zero exit code on schema violations.
"""
from __future__ import annotations

import json
import os
import sys
from typing import List


def _load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _check_keys(obj: dict, required: List[str], ctx: str) -> None:
    missing = [k for k in required if k not in obj]
    if missing:
        raise SystemExit(f"{ctx}: missing keys: {', '.join(missing)}")


def validate_plf(year: int) -> None:
    csv_path = os.path.join("data", "cache", f"state_budget_mission_{year}.csv")
    meta_path = csv_path.replace(".csv", ".meta.json")
    if not os.path.exists(meta_path):
        return
    meta = _load_json(meta_path)
    _check_keys(meta, ["extraction_ts", "dataset", "base", "year", "row_count", "produced_columns"], "PLF sidecar")
    cols = meta.get("produced_columns") or []
    required_cols = [
        "year",
        "mission_code",
        "mission_label",
        "programme_code",
        "programme_label",
        "cp_eur",
        "ae_eur",
    ]
    for c in required_cols:
        if c not in cols:
            raise SystemExit(f"PLF sidecar: missing produced column: {c}")


def validate_decp(year: int) -> None:
    csv_path = os.path.join("data", "cache", f"procurement_contracts_{year}.csv")
    meta_path = csv_path.replace(".csv", ".meta.json")
    if not os.path.exists(meta_path):
        return
    meta = _load_json(meta_path)
    _check_keys(meta, ["extraction_ts", "row_count", "source", "produced_columns"], "DECP sidecar")
    cols = meta.get("produced_columns") or []
    required_cols = [
        "year",
        "contract_id",
        "buyer_org_id",
        "supplier_siren",
        "supplier_name",
        "signed_date",
        "amount_eur",
        "cpv_code",
        "procedure_type",
        "lot_count",
        "location_code",
        "amount_quality",
        "supplier_naf",
        "supplier_company_size",
    ]
    for c in required_cols:
        if c not in cols:
            raise SystemExit(f"DECP sidecar: missing produced column: {c}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python tools/validate_sidecars.py <YEAR>")
        raise SystemExit(2)
    try:
        year = int(sys.argv[1])
    except Exception:
        raise SystemExit("YEAR must be an integer")

    # Run validations (no error if sidecars absent)
    validate_plf(year)
    validate_decp(year)
    print(f"Sidecars validated for {year} (if present)")


if __name__ == "__main__":
    main()

