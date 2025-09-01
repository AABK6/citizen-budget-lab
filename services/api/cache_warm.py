from __future__ import annotations

"""
Cache warmer CLI for essential public-finance datasets used by the app.

Writes normalized snapshots under data/cache/ so the app can serve without
relying on live upstreams for every request.

Usage examples:

  python -m services.api.cache_warm plf \
    --base https://data.economie.gouv.fr \
    --dataset plf25-depenses-2025-selon-destination \
    --year 2025

  python -m services.api.cache_warm eurostat-cofog --year 2026 --countries FR,DE,IT
"""

import argparse
import csv
import json
import os
from typing import Any, Dict, Iterable, List

from .clients import eurostat as eu
from .clients import ods


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(ROOT, "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _ods_results(js: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Opendatasoft Explore v2.1 returns a JSON with a top-level `results` list.
    # Be defensive and accept alternative shapes.
    return (
        js.get("results")
        or js.get("records")
        or js.get("data")
        or []
    )


def _slug(s: str) -> str:
    import re
    import unicodedata

    s2 = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s2 = s2.lower()
    s2 = re.sub(r"[^a-z0-9]+", " ", s2)
    return s2


def _guess_fields(meta: Dict[str, Any]) -> Dict[str, str]:
    fields = meta.get("dataset", {}).get("fields") or meta.get("fields") or []
    names = {str(f.get("name") or ""): f for f in fields}
    # Build candidates by slug of name/label
    def cand_score(label: str, name: str, target: str) -> int:
        lx = _slug(label)
        nx = _slug(name)
        score = 0
        if target == "cp":
            for tok in ["cp", "credit", "paiement", "paiements"]:
                if tok in lx or tok in nx:
                    score += 1
        elif target == "ae":
            for tok in ["ae", "autorisation", "engagement"]:
                if tok in lx or tok in nx:
                    score += 1
        elif target == "year":
            for tok in ["exercice", "annee", "year"]:
                if tok in lx or tok in nx:
                    score += 1
        elif target == "mission_code":
            for tok in ["code mission", "mission code", "code_mission"]:
                if tok in lx or tok in nx:
                    score += 1
        elif target == "mission_label":
            for tok in ["mission"]:
                if tok in lx or tok in nx:
                    score += 1
        return score

    def pick(target: str, numeric: bool | None = None) -> str | None:
        best = (0, None)
        for f in fields:
            name = str(f.get("name") or "")
            label = str(f.get("label") or name)
            typ = str(f.get("type") or "")
            if numeric is True and typ not in ("double", "int", "bigint", "float", "decimal"):
                continue
            sc = cand_score(label, name, target)
            if sc > best[0]:
                best = (sc, name)
        return best[1]

    # Prefer explicit known French column names when present
    cp_name = pick("cp", numeric=True) or ("credit_de_paiement" if "credit_de_paiement" in names else None) or "cp"
    ae_name = pick("ae", numeric=True) or ("autorisation_engagement" if "autorisation_engagement" in names else None) or "ae"

    # Mission code/label heuristics
    mission_code = pick("mission_code", numeric=None)
    mission_label = pick("mission_label", numeric=None)
    # Prefer explicit French columns when available
    if not mission_code:
        if "code_mission" in names:
            mission_code = "code_mission"
        elif "mission" in names:
            mission_code = "mission"
    if not mission_label:
        if "libelle_mission" in names:
            mission_label = "libelle_mission"
        elif "mission" in names:
            mission_label = "mission"
    # If label would equal code and a libelle exists, prefer the libelle for label
    if mission_label == mission_code and "libelle_mission" in names:
        mission_label = "libelle_mission"

    return {
        "cp": cp_name,
        "ae": ae_name,
        "year": pick("year", numeric=None) or ("exercice" if "exercice" in names else None),
        "mission_code": mission_code or "mission",
        "mission_label": mission_label or "mission",
    }


def warm_plf_state_budget(
    base: str,
    dataset: str,
    year: int,
    cp_field: str = "",
    ae_field: str = "",
    extra_where: str | None = None,
) -> str:
    """Fetch aggregated PLF/LFI credits by mission and write CSV snapshot.

    Output schema: year, mission_code, mission_label, programme_code, programme_label, cp_eur, ae_eur
    (programme columns left blank at this aggregation level)
    """
    _ensure_dir(CACHE_DIR)

    # Introspect fields and decide actual names
    meta = ods.dataset_info(base, dataset)
    guesses = _guess_fields(meta)
    cp_col = cp_field or guesses["cp"]
    ae_col = ae_field or guesses["ae"]
    code_col = guesses["mission_code"]
    label_col = guesses["mission_label"]
    year_col = guesses.get("year")

    # Build server-side aggregation; avoid duplicate columns if label==code
    if code_col == label_col:
        select = f"{code_col},sum({cp_col}) as cp_eur,sum({ae_col}) as ae_eur"
        group_by = f"{code_col}"
    else:
        select = f"{code_col},{label_col},sum({cp_col}) as cp_eur,sum({ae_col}) as ae_eur"
        group_by = f"{code_col},{label_col}"
    out_csv = os.path.join(CACHE_DIR, f"state_budget_mission_{year}.csv")

    where = None
    if year_col:
        where = f"{year_col}={year}"
    if extra_where:
        where = f"{where} AND ({extra_where})" if where else extra_where

    rows: List[Dict[str, Any]] = []
    try:
        # Try server-side aggregation first
        js = ods.records(base, dataset, select=select, where=where, group_by=group_by, order_by=code_col, limit=500)
        rows = _ods_results(js)
    except Exception:
        rows = []

    # Fallback: client-side aggregation over rows
    if not rows:
        agg: Dict[str, Dict[str, Any]] = {}
        # Unique selection columns
        base_cols = [code_col, label_col, cp_col, ae_col, year_col or ""]
        uniq_cols: List[str] = []
        for c in base_cols:
            if c and c not in uniq_cols:
                uniq_cols.append(c)
        sel_cols = ",".join(uniq_cols)

        def _parse_conditions(expr: str | None) -> List[tuple[str, str]]:
            if not expr:
                return []
            import re

            conds: List[tuple[str, str]] = []
            # Split on AND (case-insensitive)
            parts = re.split(r"\s+AND\s+", expr, flags=re.IGNORECASE)
            for p in parts:
                m = re.search(r"([A-Za-z0-9_]+)\s*=\s*'([^']*)'", p)
                if not m:
                    m = re.search(r'([A-Za-z0-9_]+)\s*=\s*"([^"]*)"', p)
                if m:
                    conds.append((m.group(1), m.group(2)))
            return conds

        conds = _parse_conditions(extra_where)

        # First try with server-side where; if that errors, fetch without where and filter locally
        tried_without_where = False
        drop_order_by = False
        for attempt in range(3):
            try:
                where_clause = None if tried_without_where else where
                for rec in ods.iterate_records(
                    base,
                    dataset,
                    select=sel_cols,
                    where=where_clause,
                    order_by=None if drop_order_by else code_col,
                    page_size=1000,
                    max_pages=200,
                ):
                    # Local filters
                    if year_col:
                        try:
                            yv = rec.get(year_col)
                            if yv is None:
                                continue
                            # Support numeric/double values
                            if int(float(yv)) != int(year):
                                continue
                        except Exception:
                            continue
                    # Apply simple equality conditions
                    ok = True
                    if conds:
                        for k, v in conds:
                            rv = rec.get(k)
                            if rv is None or str(rv) != v:
                                ok = False
                                break
                    if not ok:
                        continue
                    code = str(rec.get(code_col) or "")
                    label = str(rec.get(label_col) or rec.get(code_col) or "")
                    cpv = float(rec.get(cp_col) or 0)
                    aev = float(rec.get(ae_col) or 0)
                    ent = agg.setdefault(code, {"code": code, "label": label, "cp_eur": 0.0, "ae_eur": 0.0})
                    ent["cp_eur"] = float(ent["cp_eur"]) + cpv
                    ent["ae_eur"] = float(ent["ae_eur"]) + aev
                # If we got here without exception, break
                break
            except Exception:
                # Retry without server-side where
                if not tried_without_where:
                    tried_without_where = True
                elif not drop_order_by:
                    drop_order_by = True
                else:
                    # Already dropped both filters; give up loop
                    break
                continue
        rows = list(agg.values())

        # If nothing matched and we had extra conditions, retry ignoring them (keep year filter only)
        if not rows and conds:
            agg = {}
            for rec in ods.iterate_records(
                base,
                dataset,
                select=sel_cols,
                where=None if tried_without_where else where,
                order_by=None,
                page_size=1000,
                max_pages=200,
            ):
                if year_col:
                    try:
                        yv = rec.get(year_col)
                        if yv is None:
                            continue
                        if int(float(yv)) != int(year):
                            continue
                    except Exception:
                        continue
                code = str(rec.get(code_col) or "")
                label = str(rec.get(label_col) or rec.get(code_col) or "")
                cpv = float(rec.get(cp_col) or 0)
                aev = float(rec.get(ae_col) or 0)
                ent = agg.setdefault(code, {"code": code, "label": label, "cp_eur": 0.0, "ae_eur": 0.0})
                ent["cp_eur"] = float(ent["cp_eur"]) + cpv
                ent["ae_eur"] = float(ent["ae_eur"]) + aev
            rows = list(agg.values())

        # Final safety: if API keeps rejecting even without filters, fetch raw rows (no select/order) and aggregate locally
        if not rows:
            agg = {}
            for rec in ods.iterate_records(
                base,
                dataset,
                select=None,
                where=None,
                order_by=None,
                page_size=1000,
                max_pages=200,
            ):
                # Basic guards: skip rows missing required fields
                if year_col:
                    try:
                        yv = rec.get(year_col)
                        if yv is None or int(float(yv)) != int(year):
                            continue
                    except Exception:
                        continue
                code = str(rec.get(code_col) or rec.get("code_mission") or rec.get("mission") or "")
                label = str(rec.get(label_col) or rec.get("libelle_mission") or rec.get("mission") or code)
                try:
                    cpv = float(rec.get(cp_col) or rec.get("credit_de_paiement") or 0)
                except Exception:
                    cpv = 0.0
                try:
                    aev = float(rec.get(ae_col) or rec.get("autorisation_engagement") or 0)
                except Exception:
                    aev = 0.0
                if not code:
                    continue
                ent = agg.setdefault(code, {"code": code, "label": label, "cp_eur": 0.0, "ae_eur": 0.0})
                ent["cp_eur"] = float(ent["cp_eur"]) + cpv
                ent["ae_eur"] = float(ent["ae_eur"]) + aev
            rows = list(agg.values())

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["year", "mission_code", "mission_label", "programme_code", "programme_label", "cp_eur", "ae_eur"])
        for rec in rows:
            code = str(rec.get("code") or rec.get(code_col))
            label = str(rec.get("label") or rec.get(label_col) or rec.get(code_col))
            cp = float(rec.get("cp_eur") or rec.get(cp_col) or 0)
            ae = float(rec.get("ae_eur") or rec.get(ae_col) or 0)
            w.writerow([year, code, label, "", "", cp, ae])

    return out_csv


def warm_eurostat_cofog(year: int, countries: List[str]) -> str:
    """Fetch Eurostat COFOG aggregates and compute shares per country.

    Writes data/cache/eu_cofog_shares_{year}.json with structure:
    { "FR": [{"code":"09","label":"Education","share":0.21}, ...], ... }
    """
    _ensure_dir(CACHE_DIR)
    out: Dict[str, Any] = {}
    try:
        js = eu.fetch("gov_10a_exp", {"time": str(year), "unit": "MIO_EUR", "sector": "S13"})
        for c in countries:
            shares = eu.cofog_shares(js, year=year, geo=c)
            out[c] = [{"code": code, "label": label, "share": share} for code, label, share in shares]
    except Exception as e:
        # Provide helpful guidance and fallback to local FR mapping if available via allocation_by_cofog
        out["__warning__"] = (
            "Eurostat fetch failed. Ensure EUROSTAT_BASE is reachable and EUROSTAT_COOKIE is set if required. "
            f"Error: {type(e).__name__}"
        )
        try:
            from .data_loader import allocation_by_cofog
            from .models import Basis

            items = allocation_by_cofog(year, Basis.CP)
            for c in countries:
                out[c] = [{"code": i.code, "label": i.label, "share": i.share} for i in items]
        except Exception:
            pass
    out_path = os.path.join(CACHE_DIR, f"eu_cofog_shares_{year}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    return out_path


# ------------------------------
# LEGO baseline (expenditures v0)
# ------------------------------

def _load_lego_config() -> Dict[str, Any]:
    path = os.path.join(DATA_DIR, "lego_pieces.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _cofog_to_gf(code: str) -> List[str]:
    """Map a COFOG code like '09.1' to Eurostat 'GF091' (and sensible fallbacks).

    Returns a list of candidate codes to try in order.
    """
    code = str(code).strip()
    if not code:
        return []
    cand: List[str] = []
    base = code.split(".")[0]
    sub = code.split(".")[1] if "." in code else None
    if sub and sub != "0":
        cand.append(f"GF{base}{sub}")  # e.g., 09.1 -> GF091
        cand.append(f"GF{base}{sub.zfill(2)}")  # 09.10 -> GF0910 (just in case)
    # top-level
    cand.append(f"GF{base}")
    # Raw as-is (if Eurostat already uses with dot)
    cand.append(code)
    return cand


def _val_mio(js: Dict[str, Any], year: int, country: str, sector: str, unit: str, cofog_code: str, na_item: str) -> float:
    """Best-effort extraction of a MIO_EUR value for given coordinates.
    Tries several COFOG code candidates.
    """
    # Build base coords; allow missing dims gracefully by value_at
    coords: Dict[str, str] = {"time": str(year)}
    # Always try to set commonly present dims if they exist
    dims = js.get("dimension", {}).get("id") or []
    if "unit" in dims:
        coords["unit"] = unit
    if "geo" in dims:
        coords["geo"] = country
    if "sector" in dims:
        coords["sector"] = sector
    if "na_item" in dims:
        coords["na_item"] = na_item
    # Try COFOG candidates
    from .clients import eurostat as eu_client

    for c in _cofog_to_gf(cofog_code):
        c2 = c
        if "cofog99" in dims:
            coords["cofog99"] = c2
        v = eu.value_at(js, coords)
        if v is not None:
            return float(v)
    return 0.0


def warm_lego_baseline(year: int, country: str = "FR", scope: str = "S13") -> str:
    """Compute a baseline by LEGO piece (expenditures v0) and write JSON snapshot.

    Output: data/cache/lego_baseline_{year}.json with fields:
      { year, scope, country, pib_eur, depenses_total_eur, pieces: [{id,type,amount_eur,share}], meta }
    """
    _ensure_dir(CACHE_DIR)
    cfg = _load_lego_config()

    # Fetch Eurostat datasets (expenditures + revenues if available)
    try:
        js_exp = eu.fetch("gov_10a_exp", {"time": str(year), "unit": "MIO_EUR", "geo": country})
    except Exception as e:
        js_exp = {}
        warn = f"Eurostat gov_10a_exp fetch failed: {type(e).__name__}"
    else:
        warn = ""
    try:
        js_rev = eu.fetch("gov_10a_main", {"time": str(year), "unit": "MIO_EUR", "geo": country})
    except Exception as e:
        js_rev = {}
        warn = (warn + "; " if warn else "") + f"Eurostat gov_10a_main fetch failed: {type(e).__name__}"

    # GDP series (for info/ratios)
    try:
        from .data_loader import _read_gdp_series  # type: ignore

        gdp_map = _read_gdp_series()
        pib_eur = float(gdp_map.get(int(year), 0.0))
    except Exception:
        pib_eur = 0.0

    pieces_out: List[Dict[str, Any]] = []
    dep_total = 0.0

    recettes_total = 0.0
    for p in cfg.get("pieces", []):
        pid = str(p.get("id"))
        ptype = str(p.get("type"))
        amt_eur: float | None = None
        if ptype == "expenditure" and js_exp:
            cofogs = p.get("mapping", {}).get("cofog") or []
            na_items = p.get("mapping", {}).get("na_item") or []
            total_mio = 0.0
            for mc in cofogs:
                c_code = str(mc.get("code"))
                c_w = float(mc.get("weight", 1.0))
                for ni in na_items:
                    ni_code = str(ni.get("code"))
                    ni_w = float(ni.get("weight", 1.0))
                    v_mio = _val_mio(js_exp, year, country, scope, "MIO_EUR", c_code, ni_code)
                    total_mio += c_w * ni_w * v_mio
            amt_eur = total_mio * 1_000_000.0
            dep_total += amt_eur
        elif ptype == "revenue" and js_rev:
            esa = p.get("mapping", {}).get("esa") or []
            total_mio = 0.0
            for ent in esa:
                code = str(ent.get("code"))
                w = float(ent.get("weight", 1.0))
                # Try direct na_item lookup
                coords = {"time": str(year), "unit": "MIO_EUR", "geo": country}
                # Add sector if present
                dims = js_rev.get("dimension", {}).get("id") or []
                if "sector" in dims:
                    coords["sector"] = scope
                if "na_item" in dims:
                    coords["na_item"] = code
                from .clients import eurostat as eu_client  # lazy

                v = eu.value_at(js_rev, coords) if coords.get("na_item") else None
                if v is None:
                    v = 0.0
                total_mio += w * float(v)
            amt_eur = total_mio * 1_000_000.0
            recettes_total += amt_eur
        pieces_out.append({
            "id": pid,
            "type": ptype,
            "amount_eur": amt_eur,
            "share": None,  # filled for expenditures after total known
        })

    # Fill shares for expenditures
    for ent in pieces_out:
        if ent["type"] == "expenditure" and dep_total > 0:
            ent["share"] = float(ent["amount_eur"] or 0.0) / dep_total

    out: Dict[str, Any] = {
        "year": int(year),
        "scope": scope,
        "country": country,
        "pib_eur": pib_eur,
        "depenses_total_eur": dep_total,
        "recettes_total_eur": recettes_total,
        "pieces": pieces_out,
        "meta": {
            "source": "Eurostat gov_10a_exp + gov_10a_main",
            "warning": warn,
        },
    }

    out_path = os.path.join(CACHE_DIR, f"lego_baseline_{year}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    return out_path


def main(argv: Iterable[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Cache warmer for essential budget data")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp_plf = sub.add_parser("plf", help="Cache PLF/LFI mission-level credits from ODS")
    sp_plf.add_argument("--base", default="https://data.economie.gouv.fr", help="ODS base URL")
    sp_plf.add_argument("--dataset", required=True, help="Dataset id, e.g. plf25-depenses-2025-selon-destination")
    sp_plf.add_argument("--year", type=int, required=True, help="Budget year (for output tagging)")
    # Leave empty by default to enable auto-detection from dataset fields
    sp_plf.add_argument("--cp-field", default="", help="Field name for CP amount (override autodetect)")
    sp_plf.add_argument("--ae-field", default="", help="Field name for AE amount (override autodetect)")
    sp_plf.add_argument("--where", dest="extra_where", default=None, help="Extra ODS where clause, e.g. typebudget='PLF'")

    sp_eu = sub.add_parser("eurostat-cofog", help="Cache Eurostat COFOG shares for countries/year")
    sp_eu.add_argument("--year", type=int, required=True)
    sp_eu.add_argument("--countries", required=True, help="Comma-separated country codes, e.g. FR,DE,IT")

    sp_fields = sub.add_parser("ods-fields", help="List fields for an ODS dataset (to help pick cp/ae/year fields)")
    sp_fields.add_argument("--base", default="https://data.economie.gouv.fr")
    sp_fields.add_argument("--dataset", required=True)

    # LEGO baseline warmer (expenditures v0)
    sp_lego = sub.add_parser("lego", help="Build LEGO baseline for a year (expenditures v0)")
    sp_lego.add_argument("--year", type=int, required=True)
    sp_lego.add_argument("--country", default="FR")
    sp_lego.add_argument("--scope", default="S13")

    args = p.parse_args(list(argv) if argv is not None else None)

    if args.cmd == "plf":
        path = warm_plf_state_budget(args.base, args.dataset, args.year, args.cp_field, args.ae_field, args.extra_where)
        print(f"Wrote {path}")
        return

    if args.cmd == "eurostat-cofog":
        countries = [c.strip() for c in args.countries.split(",") if c.strip()]
        path = warm_eurostat_cofog(args.year, countries)
        print(f"Wrote {path}")
        return

    if args.cmd == "ods-fields":
        meta = ods.dataset_info(args.base, args.dataset)
        fields = meta.get("dataset", {}).get("fields") or meta.get("fields") or []
        for f in fields:
            print(f"{f.get('name')}: {f.get('type')} — {f.get('label')}")
        return

    if args.cmd == "lego":
        path = warm_lego_baseline(args.year, country=args.country, scope=args.scope)
        print(f"Wrote {path}")
        return


if __name__ == "__main__":
    main()
