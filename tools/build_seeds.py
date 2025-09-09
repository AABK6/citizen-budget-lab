#!/usr/bin/env python3
"""
Generate dbt seed CSVs from repo config files.

Builds:
- warehouse/seeds/mapping_state_to_cofog.csv from data/cofog_mapping.json
"""
from __future__ import annotations

import csv
import json
import os
from typing import Any, Dict, Iterable

HERE = os.path.abspath(os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))


def write_mapping_seed() -> str:
    """
    Generate a comprehensive mapping CSV from the nested cofog_mapping.json.
    The output includes year-specific and default mappings for programmes.
    """
    src = os.path.join(ROOT, "data", "cofog_mapping.json")
    dst_dir = os.path.join(ROOT, "warehouse", "seeds")
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, "mapping_state_to_cofog.csv")
    with open(src, "r", encoding="utf-8") as f:
        js = json.load(f)
    rows: list[dict[str, Any]] = []

    # Mission mappings (year-agnostic)
    for mission_code, arr in js.get("mission_to_cofog", {}).items():
        for ent in arr:
            rows.append({
                "source": "mission",
                "year": None,
                "mission_code": str(mission_code),
                "programme_code": None,
                "cofog_code": str(ent.get("code")),
                "weight": float(ent.get("weight", 1.0)),
            })

    # Programme mappings (year-agnostic)
    for prog_code, arr in js.get("programme_to_cofog", {}).items():
        for ent in arr:
            rows.append({
                "source": "programme",
                "year": None,
                "mission_code": None,  # Mission can be inferred from programme later
                "programme_code": str(prog_code),
                "cofog_code": str(ent.get("code")),
                "weight": float(ent.get("weight", 1.0)),
            })

    # Year-aware programme mappings
    for prog_code, entry in js.get("programme_to_cofog_years", {}).items():
        # Default entry
        for ent in entry.get("default", []):
            rows.append({
                "source": "programme_year",
                "year": None,  # Null year means default
                "mission_code": None,
                "programme_code": str(prog_code),
                "cofog_code": str(ent.get("code")),
                "weight": float(ent.get("weight", 1.0)),
            })
        # by_year entries
        for year, arr in entry.get("by_year", {}).items():
            for ent in arr:
                rows.append({
                    "source": "programme_year",
                    "year": int(year),
                    "mission_code": None,
                    "programme_code": str(prog_code),
                    "cofog_code": str(ent.get("code")),
                    "weight": float(ent.get("weight", 1.0)),
                })

    # Write CSV
    fieldnames = ["source", "year", "mission_code", "programme_code", "cofog_code", "weight"]
    with open(dst, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    return dst


def main() -> None:
    out = write_mapping_seed()
    print(f"Successfully generated seed file at: {out}")


if __name__ == "__main__":
    main()

