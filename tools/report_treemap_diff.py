#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

import httpx


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _to_mass_map(snapshot: dict) -> Dict[str, float]:
    entries = snapshot.get("builderMassesAdmin") or []
    return {str(e["massId"]): float(e.get("amountEur") or 0.0) for e in entries}


def _to_label_map(snapshot: dict) -> Dict[str, str]:
    labels = snapshot.get("missionLabels") or []
    return {str(e.get("id")): str(e.get("displayLabel") or e.get("id")) for e in labels}


def _fmt_eur(value: float) -> str:
    return f"{value:,.0f}".replace(",", " ")


def build_report(local_snapshot: dict, live_snapshot: dict, local_path: Path, live_url: str) -> str:
    local_map = _to_mass_map(local_snapshot)
    live_map = _to_mass_map(live_snapshot)
    label_map = _to_label_map(local_snapshot)

    ids = sorted(set(local_map) | set(live_map))
    rows: List[dict] = []
    for mass_id in ids:
        new_val = local_map.get(mass_id, 0.0)
        old_val = live_map.get(mass_id, 0.0)
        delta = new_val - old_val
        pct = (delta / old_val * 100.0) if old_val else 0.0
        rows.append(
            {
                "mass_id": mass_id,
                "label": label_map.get(mass_id, mass_id),
                "old": old_val,
                "new": new_val,
                "delta": delta,
                "pct": pct,
            }
        )

    rows.sort(key=lambda r: abs(r["delta"]), reverse=True)
    total_old = sum(r["old"] for r in rows)
    total_new = sum(r["new"] for r in rows)
    total_delta = total_new - total_old

    lines = [
        "# Diff treemap 2026 (local vs live)",
        "",
        f"- Local snapshot: `{local_path}`",
        f"- Live snapshot: `{live_url}`",
        "",
        f"- Total live: **{_fmt_eur(total_old)} €**",
        f"- Total local: **{_fmt_eur(total_new)} €**",
        f"- Delta total: **{_fmt_eur(total_delta)} €**",
        "",
        "| Bloc | ID | Live (€) | Local (€) | Delta (€) | Delta (%) |",
        "| --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for r in rows:
        lines.append(
            f"| {r['label']} | `{r['mass_id']}` | {_fmt_eur(r['old'])} | {_fmt_eur(r['new'])} | "
            f"{_fmt_eur(r['delta'])} | {r['pct']:+.2f}% |"
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate treemap block deltas between local and live snapshots.")
    parser.add_argument("--local-json", default="data/cache/build_page_2026.json")
    parser.add_argument("--live-url", default="https://budget-citoyen.fr/api/build-snapshot?year=2026")
    parser.add_argument("--out", default="docs/treemap_diff_vs_live_2026.md")
    args = parser.parse_args()

    local_path = Path(args.local_json)
    local_snapshot = _load_json(local_path)

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(args.live_url)
        resp.raise_for_status()
        live_snapshot = resp.json()

    report = build_report(local_snapshot, live_snapshot, local_path, args.live_url)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

