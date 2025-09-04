#!/usr/bin/env python3
"""Quick probes to validate warmer sources before running heavy jobs.

Checks:
- Eurostat JSON gov_10a_exp for subshares (per-country, TE) and SDMX fallback.
- ODS PLF dataset id presence and CP/AE fields.
- ODS DECP dataset (optional) or CSV path existence.

Usage:
  python3 tools/verify_warmers.py --year 2026 --countries FR,DE,IT \
    --plf-dataset plf25-depenses-2025-du-bg-et-des-ba-selon-nomenclatures-destination-et-nature \
    [--decp-dataset decp-v3-marches-valides | --decp-csv path]
"""

import argparse
import os
from typing import Any, Dict, List

from services.api.clients import eurostat as eu
from services.api.clients import ods


_had_warn = False


def ok(msg: str) -> None:
    print(f"[OK] {msg}")


def warn(msg: str) -> None:
    global _had_warn
    _had_warn = True
    print(f"[WARN] {msg}")


def probe_eurostat(year: int, countries: List[str]) -> None:
    # JSON per-country for subshares
    for c in countries:
        try:
            _ = eu.fetch("gov_10a_exp", {"time": str(year), "unit": "MIO_EUR", "sector": "S13", "na_item": "TE", "geo": c})
            ok(f"Eurostat JSON gov_10a_exp (TE) for {c} {year}")
        except Exception:
            # JSON failures are common; SDMX below is authoritative
            pass
    # SDMX single key sanity
    try:
        v = eu.sdmx_value("gov_10a_exp", f"A.MIO_EUR.S13.GF09.TE.{countries[0]}", time=str(year))
        if v is not None:
            ok(f"Eurostat SDMX gov_10a_exp GF09 TE {countries[0]} {year}")
        else:
            warn("Eurostat SDMX value None for a known key")
    except Exception as e:
        warn(f"Eurostat SDMX failed: {type(e).__name__}")


def probe_plf(dataset: str | None) -> None:
    base = "https://data.economie.gouv.fr"
    if not dataset:
        return
    try:
        meta = ods.dataset_info(base, dataset)
        fields = meta.get("fields") or meta.get("dataset", {}).get("fields") or []
        names = {f.get("name"): f for f in fields}
        if any(k in names for k in ("cp_plf", "ae_plf", "credit_de_paiement", "autorisation_engagement")):
            ok(f"ODS PLF dataset looks OK: {dataset}")
        else:
            warn(f"ODS PLF dataset present but CP/AE fields not found: {dataset}")
    except Exception as e:
        warn(f"ODS PLF dataset probe failed for {dataset}: {type(e).__name__}")


def probe_decp(dataset: str | None, csv_path: str | None) -> None:
    base = "https://data.economie.gouv.fr"
    if dataset:
        try:
            js = ods.records(base, dataset, limit=1)
            if (js.get("results") or js.get("records") or js.get("data")):
                ok(f"ODS DECP records() works for {dataset}")
            else:
                warn(f"ODS DECP empty response for {dataset}")
        except Exception as e:
            warn(f"ODS DECP probe failed for {dataset}: {type(e).__name__}")
    if csv_path:
        if os.path.exists(csv_path):
            ok(f"DECP CSV exists: {csv_path}")
        else:
            warn(f"DECP CSV not found: {csv_path}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=2026)
    ap.add_argument("--countries", default="FR")
    ap.add_argument("--plf-dataset", default=None)
    ap.add_argument("--decp-dataset", default=None)
    ap.add_argument("--decp-csv", default=None)
    args = ap.parse_args()

    countries = [c.strip() for c in args.countries.split(",") if c.strip()]
    print(f"Probing sources for year={args.year} countries={countries}")
    probe_eurostat(args.year, countries)
    probe_plf(args.plf_dataset)
    probe_decp(args.decp_dataset, args.decp_csv)
    if _had_warn:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
