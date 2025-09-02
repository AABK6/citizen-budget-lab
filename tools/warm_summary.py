#!/usr/bin/env python3
import json
import os
import sys
from typing import List, Tuple


def load_baseline(year: str) -> dict:
    path = os.path.join("data", "cache", f"lego_baseline_{year}.json")
    if not os.path.exists(path):
        print(f"No LEGO baseline found at {path}. Run 'make warm-eurostat YEAR={year}' first.")
        sys.exit(2)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def sum_amt(arr: List[dict]) -> float:
    return sum(float(p.get("amount_eur") or 0.0) for p in arr)


def top(arr: List[dict], n: int = 5) -> List[Tuple[str, float]]:
    pairs = [(p.get("label") or p.get("id"), float(p.get("amount_eur") or 0.0)) for p in arr]
    pairs.sort(key=lambda x: x[1], reverse=True)
    return pairs[:n]


def main() -> None:
    year = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("YEAR") or "").strip()
    if not year:
        print("Usage: python3 tools/warm_summary.py <YEAR>")
        sys.exit(2)
    js = load_baseline(year)
    pieces = js.get("pieces") or []
    exp = [p for p in pieces if p.get("type") == "expenditure"]
    rev = [p for p in pieces if p.get("type") == "revenue"]

    print(f"Year: {year}")
    print(f"  Expenditures total (reported): €{js.get('depenses_total_eur'):,}")
    print(f"  Expenditures total (sum):      €{sum_amt(exp):,}")
    print(f"  Revenues total (reported):    €{js.get('recettes_total_eur'):,}")
    print(f"  Revenues total (sum):         €{sum_amt(rev):,}")
    print(f"  Non-zero exp pieces:          {sum(1 for p in exp if (p.get('amount_eur') or 0)>0)} / {len(exp)}")
    print(f"  Non-zero rev pieces:          {sum(1 for p in rev if (p.get('amount_eur') or 0)>0)} / {len(rev)}")
    warn = (js.get("meta") or {}).get("warning") or ""
    if warn:
        print(f"  Warning: {warn}")
    print("  Top 5 expenditure pieces:")
    for name, amt in top(exp, 5):
        print(f"    - {name}: €{amt:,.0f}")
    if rev:
        print("  Top 5 revenue pieces:")
        for name, amt in top(rev, 5):
            print(f"    - {name}: €{amt:,.0f}")


if __name__ == "__main__":
    main()

