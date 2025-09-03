#!/usr/bin/env python3
"""
Generate dbt seed CSVs from repo config files.

Currently builds:
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
    src = os.path.join(ROOT, "data", "cofog_mapping.json")
    dst_dir = os.path.join(ROOT, "warehouse", "seeds")
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, "mapping_state_to_cofog.csv")
    with open(src, "r", encoding="utf-8") as f:
        js = json.load(f)
    rows: list[dict[str, Any]] = []

    def add_rows(kind: str, mapping: Dict[str, Iterable[Dict[str, Any]]]) -> None:
        for code, arr in mapping.items():
            for ent in arr:
                rows.append(
                    {
                        "source": kind,
                        "source_code": str(code),
                        "cofog_code": str(ent.get("code")),
                        "weight": float(ent.get("weight", 1.0)),
                        "notes": "",
                    }
                )

    add_rows("mission", js.get("mission_to_cofog", {}))
    add_rows("programme", js.get("programme_to_cofog", {}))
    # Year-aware programme mappings are flattened using default set (by_year omitted here for simplicity)
    prog_years = js.get("programme_to_cofog_years", {})
    for pcode, entry in prog_years.items():
        default = entry.get("default") or []
        for ent in default:
            rows.append(
                {
                    "source": "programme",
                    "source_code": str(pcode),
                    "cofog_code": str(ent.get("code")),
                    "weight": float(ent.get("weight", 1.0)),
                    "notes": "default",
                }
            )

    # Write CSV
    with open(dst, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["source", "source_code", "cofog_code", "weight", "notes"])
        w.writeheader()
        w.writerows(rows)
    return dst


def main() -> None:
    out = write_mapping_seed()
    print(out)


if __name__ == "__main__":
    main()

