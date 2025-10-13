from __future__ import annotations

import base64
import csv
import datetime as dt
import io
import os
from collections import defaultdict
import json
import hashlib
from functools import lru_cache
from typing import Dict, Iterable, List, Tuple
import unicodedata

import yaml

from .models import (
    Accounting,
    Allocation,
    Basis,
    Compliance,
    Source,
    MacroResult,
    MissionAllocation,
    ProcurementItem,
    Supplier,
)
from .validation import validate_scenario
from .settings import get_settings
from . import warehouse_client as wh


DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
CACHE_DIR = os.path.join(DATA_DIR, "cache")
STATE_BUDGET_CSV = os.path.join(DATA_DIR, "sample_state_budget.csv")
PROCUREMENT_CSV = os.path.join(DATA_DIR, "sample_procurement.csv")
GDP_CSV = os.path.join(DATA_DIR, "gdp_series.csv")
BASELINE_DEF_DEBT_CSV = os.path.join(DATA_DIR, "baseline_deficit_debt.csv")
COFOG_MAP_JSON = os.path.join(DATA_DIR, "cofog_mapping.json")
MACRO_IRF_JSON = os.path.join(DATA_DIR, "macro_irfs.json")
SOURCES_JSON = os.path.join(DATA_DIR, "sources.json")
LEGO_PIECES_JSON = os.path.join(DATA_DIR, "lego_pieces.json")


def _read_csv(path: str) -> Iterable[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row


def _state_budget_path(year: int) -> str:
    """Prefer a cached mission-level snapshot for the requested year if present."""
    cached = os.path.join(CACHE_DIR, f"state_budget_mission_{year}.csv")
    return cached if os.path.exists(cached) else STATE_BUDGET_CSV


def allocation_by_mission(year: int, basis: Basis) -> Allocation:
    # Prefer warehouse (dbt) if available
    try:
        if wh.warehouse_available():
            items = wh.allocation_by_mission(year, basis)
            if items:
                return Allocation(mission=items)
    except Exception:
        pass
    total = 0.0
    agg: Dict[Tuple[str, str], float] = defaultdict(float)
    for row in _read_csv(_state_budget_path(year)):
        if int(row["year"]) != year:
            continue
        key = (row["mission_code"], row["mission_label"])
        val = float(row["cp_eur"]) if basis == Basis.CP else float(row["ae_eur"])
        agg[key] += val
        total += val
    missions: List[MissionAllocation] = []
    for (code, label), amount in sorted(agg.items(), key=lambda x: x[1], reverse=True):
        share = (amount / total) if total else 0.0
        missions.append(MissionAllocation(code=code, label=label, amount_eur=amount, share=share))
    return Allocation(mission=missions)


def allocation_by_programme(year: int, basis: Basis, mission_code: str) -> List[MissionAllocation]:
    """Return programme-level aggregation for a given mission.

    Prefer the warehouse (dbt) when available; otherwise, try ODS sidecar if present.
    """
    # Warehouse path
    try:
        if wh.warehouse_available():
            progs = wh.programmes_for_mission(year, basis, mission_code)
            if progs:
                return progs
    except Exception:
        pass
    # ODS fallback via sidecar if available
    sidecar_path = os.path.join(CACHE_DIR, f"state_budget_mission_{year}.meta.json")
    if not os.path.exists(sidecar_path):
        return []
    try:
        meta = _read_file_json(sidecar_path)  # type: ignore[assignment]
    except Exception:
        return []
    base = meta.get("base") or "https://data.economie.gouv.fr"
    dataset = meta.get("dataset")
    code_field = meta.get("mission_code_field") or "code_mission"
    prog_field = "programme"
    prog_label_field = "libelle_programme"
    cp_field = meta.get("cp_field") or "cp_plf"
    ae_field = meta.get("ae_field") or "ae_plf"
    if not dataset:
        return []
    select = f"{prog_field},{prog_label_field},sum({cp_field}) as cp_eur,sum({ae_field}) as ae_eur"
    where = f"{code_field}='{mission_code}'"
    extra = meta.get("where")
    if extra:
        where = f"({where}) AND ({extra})"
    group_by = f"{prog_field},{prog_label_field}"
    try:
        from .clients import ods as ods_client

        js = ods_client.records(base, dataset, select=select, where=where, group_by=group_by, order_by=prog_field, limit=1000)
        rows = js.get("results") or js.get("records") or js.get("data") or []
    except Exception:
        rows = []
    total = 0.0
    items: List[MissionAllocation] = []
    for r in rows:
        code = str(r.get(prog_field) or r.get("programme") or "")
        label = str(r.get(prog_label_field) or r.get("libelle_programme") or code)
        val = float(r.get("cp_eur") or 0.0) if basis == Basis.CP else float(r.get("ae_eur") or 0.0)
        total += val
        items.append(MissionAllocation(code=code, label=label, amount_eur=val, share=0.0))
    if total > 0:
        items = [MissionAllocation(code=i.code, label=i.label, amount_eur=i.amount_eur, share=i.amount_eur / total) for i in items]
    items.sort(key=lambda x: x.amount_eur, reverse=True)
    return items


_COFOG_LABELS = {
    "01": "General public services",
    "02": "Defense",
    "03": "Public order",
    "04": "Economic affairs",
    "05": "Environment",
    "06": "Housing",
    "07": "Health",
    "08": "Recreation, culture",
    "09": "Education",
    "10": "Social protection",
}


def allocation_by_cofog(year: int, basis: Basis) -> List[MissionAllocation]:
    # Warehouse-only: the warehouse model fct_admin_by_cofog implements mapping logic.
    try:
        if wh.warehouse_available():
            items = wh.allocation_by_cofog(year, basis)
            if items:
                return items
    except Exception:
        # Fallback to empty list if warehouse fails
        return []
    # No Python fallback: call mapping_cofog_aggregate directly if you need mapping parity without warehouse.
    return []


def allocation_by_apu(year: int, basis: Basis) -> List[MissionAllocation]:
    """Return allocation aggregated by APU subsector (APUC/APUL/ASSO)."""
    try:
        if wh.warehouse_available():
            items = wh.allocation_by_apu(year, basis)
            if items:
                return items
    except Exception:
        return []
    return []

def mapping_cofog_aggregate(year: int, basis: Basis) -> List[MissionAllocation]:
    """Aggregate by COFOG major using the JSON mapping and sample mission/programme CSV.

    Independent of warehouse availability; usable for parity checks.
    """
    rows = [r for r in _read_csv(_state_budget_path(year)) if int(r.get("year", 0)) == int(year)]
    if not rows:
        return []
    mapping = _load_json(COFOG_MAP_JSON)
    mission_map = mapping.get("mission_to_cofog", {}) or {}
    prog_map = mapping.get("programme_to_cofog", {}) or {}
    prog_years = mapping.get("programme_to_cofog_years", {}) or {}
    totals: Dict[str, float] = defaultdict(float)
    for r in rows:
        try:
            amt = float(r["cp_eur"]) if basis == Basis.CP else float(r["ae_eur"])
        except Exception:
            continue
        mcode = str(r.get("mission_code") or "")
        pcode = str(r.get("programme_code") or "")
        weights = None
        if pcode and pcode in prog_years:
            obj = prog_years.get(pcode) or {}
            by_year = obj.get("by_year") or obj.get("byYear") or {}
            y_arr = by_year.get(str(year))
            if y_arr:
                weights = y_arr
            elif obj.get("default"):
                weights = obj.get("default")
        if weights is None and pcode and pcode in prog_map:
            weights = prog_map.get(pcode)
        if weights is None and mcode and mcode in mission_map:
            weights = mission_map.get(mcode)
        if not weights:
            continue
        for ent in weights:
            code = str(ent.get("code") or "")
            try:
                w = float(ent.get("weight", 0.0))
            except Exception:
                w = 0.0
            if w <= 0.0 or not code:
                continue
            major = code.split(".")[0][:2]
            totals[major] += amt * w
    if not totals:
        return []
    items: List[MissionAllocation] = []
    sum_amt = sum(totals.values())
    for major, v in totals.items():
        label = _COFOG_LABELS.get(major, major)
        share = (v / sum_amt) if sum_amt > 0 else 0.0
        items.append(MissionAllocation(code=major, label=label, amount_eur=float(v), share=share))
    items.sort(key=lambda x: x.amount_eur, reverse=True)
    return items


def allocation_by_cofog_s13(year: int) -> List[MissionAllocation]:
    """Prefer warmed Eurostat S13 COFOG shares and scale by warmed LEGO baseline total expenditures.

    Fallback to mission/programme mapping if warmed caches are not present.
    """
    shares_path = os.path.join(CACHE_DIR, f"eu_cofog_shares_{year}.json")
    if os.path.exists(shares_path):
        try:
            import json as _json

            with open(shares_path, "r", encoding="utf-8") as f:
                js = _json.load(f)
            fr = js.get("FR") or js.get("fr") or []
            bl = load_lego_baseline(year)
            total = float(bl.get("depenses_total_eur", 0.0)) if isinstance(bl, dict) else 0.0
            items: List[MissionAllocation] = []
            for ent in fr:
                code = str(ent.get("code"))
                label = str(ent.get("label") or _COFOG_LABELS.get(code, code))
                share = float(ent.get("share") or 0.0)
                amt = share * total if total > 0 else 0.0
                items.append(MissionAllocation(code=code[:2], label=label, amount_eur=amt, share=share))
            # Normalize shares to sum to 1.0 defensively
            s = sum(i.share for i in items)
            if s > 0:
                items = [MissionAllocation(code=i.code, label=i.label, amount_eur=i.amount_eur, share=i.share / s) for i in items]
            items.sort(key=lambda x: x.amount_eur, reverse=True)
            return items
        except Exception:
            pass
    # Fallback to mapping-based aggregation from sample mission CSV
    return allocation_by_cofog(year, Basis.CP)


def allocation_by_cofog_subfunctions(year: int, country: str, major: str) -> List[MissionAllocation]:
    """Return COFOG subfunction breakdown for a given major code (e.g., '07') for S13.

    Uses Eurostat REST JSON with SDMX-XML fallback. Amounts are scaled using the warmed LEGO baseline total expenditures.
    Shares are relative to total expenditures (not only the major), for consistency with top-level view.
    """
    # Normalize major (e.g., '07' or '7' -> '07')
    major = str(major).zfill(2)
    total = 0.0
    bl = load_lego_baseline(year)
    if isinstance(bl, dict):
        try:
            total = float(bl.get("depenses_total_eur", 0.0))
        except Exception:
            total = 0.0
    out: List[MissionAllocation] = []
    # Prefer warmed cache if present
    try:
        cache_path = os.path.join(CACHE_DIR, f"eu_cofog_subshares_{year}.json")
        if os.path.exists(cache_path):
            import json as _json
            with open(cache_path, "r", encoding="utf-8") as f:
                js = _json.load(f)
            arr = (js.get(country.upper()) or js.get(country) or {}).get(major)
            if isinstance(arr, list) and total > 0:
                for ent in arr:
                    code = str(ent.get("code"))
                    label = str(ent.get("label") or code)
                    share = float(ent.get("share") or 0.0)
                    out.append(MissionAllocation(code=code, label=label, amount_eur=share * total, share=share))
                if out:
                    out.sort(key=lambda x: x.amount_eur, reverse=True)
                    return out
    except Exception:
        pass
    try:
        from .clients import eurostat as eu

        # Request a valid slice including na_item TE to avoid 404 on Eurostat JSON
        js = eu.fetch("gov_10a_exp", {"time": str(year), "unit": "MIO_EUR", "sector": "S13", "na_item": "TE", "geo": country})
        dims, _, idx_maps, labels = eu._dim_maps(js)  # type: ignore[attr-defined]
        cof_map = idx_maps.get("cofog99", {})
        # Gather subcodes for this major (GF07x) excluding the top-level GF07
        vals: List[tuple[str, str, float]] = []
        total_mio = 0.0
        for code in cof_map.keys():
            if not code.startswith(f"GF{major}"):
                continue
            if code == f"GF{major}":
                continue
            v = eu.value_at(js, {**{"unit": "MIO_EUR", "geo": country, "time": str(year)}, **{"cofog99": code, "sector": "S13", "na_item": "TE"}})
            if v is None:
                continue
            total_mio += float(v)
            lab = labels.get("cofog99", {}).get(code, code)
            vals.append((code, lab, float(v)))
        if vals and total_mio > 0:
            for code, lab, v in sorted(vals, key=lambda x: x[2], reverse=True):
                share = (v / total_mio) * (total_mio / total) if total > 0 else 0.0  # share over total expenditures
                amt = share * total if total > 0 else 0.0
                # Canonicalize code to e.g., '07.3' from 'GF073'
                canon = f"{major}.{code.replace('GF','')[2:]}" if len(code) >= 5 else major
                out.append(MissionAllocation(code=canon, label=lab, amount_eur=amt, share=share))
            return out
    except Exception:
        pass
    # SDMX fallback: fetch each GF{major}{sub}
    try:
        from .clients import eurostat as eu

        # Try a list of subcodes 1..9
        vals: List[tuple[str, str, float]] = []
        total_mio = 0.0
        for sub in range(1, 10):
            code = f"GF{major}{sub}"
            v = eu.sdmx_value("gov_10a_exp", f"A.MIO_EUR.S13.{code}.TE.{country}", time=str(year))
            if v is None:
                # fallback to last available Obs if target year missing
                v = eu.sdmx_value("gov_10a_exp", f"A.MIO_EUR.S13.{code}.TE.{country}")
            if v is None:
                continue
            total_mio += v
            vals.append((code, f"{major}.{sub}", v))
        if vals and total_mio > 0:
            for code, lab, v in sorted(vals, key=lambda x: x[2], reverse=True):
                share = (v / total_mio) * (total_mio / total) if total > 0 else 0.0
                amt = share * total if total > 0 else 0.0
                canon = f"{major}.{code.replace('GF','')[2:]}" if len(code) >= 5 else major
                out.append(MissionAllocation(code=canon, label=lab, amount_eur=amt, share=share))
    except Exception:
        pass
    return out


def allocation_by_beneficiary(year: int) -> List[MissionAllocation]:
    """Aggregate expenditures by implied beneficiary categories using LEGO baseline.

    Categories:
    - HH: households (D.62 benefits + D.1 public wages proxy via piece config)
    - ENT: enterprises (D.3 subsidies + P.2 intermediate purchases proxy)
    - COL: collective (P.51g investment and residual public services)

    Falls back to zeros if baseline is missing.
    """
    try:
        bl = load_lego_baseline(year)  # type: ignore  # imported at runtime in schema
        cfg = load_lego_config()  # type: ignore
    except Exception:
        bl, cfg = None, None
    if not bl or not cfg:
        return [
            MissionAllocation(code="HH", label="Households", amount_eur=0.0, share=0.0),
            MissionAllocation(code="ENT", label="Enterprises", amount_eur=0.0, share=0.0),
            MissionAllocation(code="COL", label="Collective", amount_eur=0.0, share=0.0),
        ]
    # Map piece id -> beneficiaries weights
    weights: Dict[str, Dict[str, float]] = {}
    for p in cfg.get("pieces", []):
        pid = str(p.get("id"))
        b = p.get("beneficiaries") or {}
        weights[pid] = {
            "HH": float(b.get("households", 0.0)),
            "ENT": float(b.get("enterprises", 0.0)),
            "COL": float(b.get("collective", 0.0)),
        }
    totals = {"HH": 0.0, "ENT": 0.0, "COL": 0.0}
    dep_total = 0.0
    for ent in bl.get("pieces", []):
        if str(ent.get("type")) != "expenditure":
            continue
        pid = str(ent.get("id"))
        amt = ent.get("amount_eur")
        if not isinstance(amt, (int, float)):
            continue
        dep_total += float(amt)
        w = weights.get(pid) or {"HH": 0.0, "ENT": 0.0, "COL": 0.0}
        for k in ("HH", "ENT", "COL"):
            totals[k] += float(amt) * float(w.get(k, 0.0))
    out = []
    for code, label in [("HH", "Households"), ("ENT", "Enterprises"), ("COL", "Collective")]:
        amt = totals[code]
        share = (amt / dep_total) if dep_total > 0 else 0.0
        out.append(MissionAllocation(code=code, label=label, amount_eur=amt, share=share))
    # Sort desc by amount
    out.sort(key=lambda x: x.amount_eur, reverse=True)
    return out


def procurement_top_suppliers(
    year: int,
    region: str,
    top_n: int = 10,
    cpv_prefix: str | None = None,
    procedure_type: str | None = None,
    min_amount_eur: float | None = None,
    max_amount_eur: float | None = None,
) -> List[ProcurementItem]:
    # Prefer warehouse semantic layer if available
    try:
        if wh.warehouse_available():
            items = wh.procurement_top_suppliers(
                year,
                region,
                cpv_prefix=cpv_prefix,
                procedure_type=procedure_type,
                min_amount_eur=min_amount_eur,
                max_amount_eur=max_amount_eur,
                top_n=top_n,
            )
            if items:
                return items
    except Exception:
        pass
    # Aggregate by supplier within region code prefix (e.g., "75")
    by_supplier: Dict[str, Dict[str, float | str]] = {}
    for row in _read_csv(_procurement_path(year)):
        signed = dt.date.fromisoformat(row["signed_date"]) if row["signed_date"] else None
        if not signed or signed.year != year:
            continue
        if not row["location_code"].startswith(region):
            continue
        siren = row["supplier_siren"]
        amount = float(row["amount_eur"]) if row["amount_eur"] else 0.0
        # Filters
        if cpv_prefix and not (row.get("cpv_code") or "").startswith(cpv_prefix):
            continue
        if procedure_type and (row.get("procedure_type") or "").lower() != procedure_type.lower():
            continue
        if min_amount_eur is not None and amount < float(min_amount_eur):
            continue
        if max_amount_eur is not None and amount > float(max_amount_eur):
            continue
        ent = by_supplier.setdefault(
            siren,
            {
                "name": row.get("supplier_name") or siren,
                "amount": 0.0,
                "cpv": row.get("cpv_code"),
                "procedure_type": row.get("procedure_type"),
                "location_code": row.get("location_code"),
                "source_url": f"https://www.data.gouv.fr/fr/search/?q={siren}",
            },
        )
        ent["amount"] = float(ent["amount"]) + amount
        # Update non-aggregated fields if missing
        if not ent.get("cpv") and row.get("cpv_code"):
            ent["cpv"] = row.get("cpv_code")
        if not ent.get("procedure_type") and row.get("procedure_type"):
            ent["procedure_type"] = row.get("procedure_type")
        if not ent.get("location_code") and row.get("location_code"):
            ent["location_code"] = row.get("location_code")
    # Optional enrichment from INSEE SIRENE (best-effort), can be disabled via env for perf/benchmarks
    naf_map: Dict[str, str] = {}
    size_map: Dict[str, str] = {}
    try:
        from .settings import get_settings as _get_settings  # lazy import

        if _get_settings().procurement_enrich_sirene:
            from .clients import insee as insee_client
            for siren in list(by_supplier.keys())[: top_n]:
                try:
                    js = insee_client.sirene_by_siren(siren)
                    # SIRENE shapes may vary; try common paths
                    ul = js.get("uniteLegale") or js.get("unite_legale") or {}
                    naf = ul.get("activitePrincipaleUniteLegale") or ul.get("activite_principale") or ""
                    size = ul.get("trancheEffectifsUniteLegale") or ul.get("tranche_effectifs") or ""
                    if naf:
                        naf_map[siren] = str(naf)
                    if size:
                        size_map[siren] = str(size)
                except Exception:
                    continue
    except Exception:
        pass

    items: List[ProcurementItem] = []
    for siren, ent in sorted(by_supplier.items(), key=lambda x: x[1]["amount"], reverse=True)[:top_n]:
        items.append(
            ProcurementItem(
                supplier=Supplier(siren=siren, name=str(ent["name"])),
                amount_eur=float(ent["amount"]),
                cpv=str(ent.get("cpv") or ""),
                procedure_type=str(ent.get("procedure_type") or ""),
                location_code=str(ent.get("location_code") or ""),
                source_url=str(ent.get("source_url") or ""),
                naf=naf_map.get(siren),
                company_size=size_map.get(siren),
            )
        )
    return items


def _decode_yaml_base64(b64: str) -> dict:
    raw = base64.b64decode(b64)
    return yaml.safe_load(io.BytesIO(raw)) or {}


def _read_gdp_series() -> Dict[int, float]:
    """Return a map of year→GDP (EUR).

    Preference order:
      1) Warmed INSEE macro cache at data/cache/macro_series_FR.json (if present and parseable)
      2) Local CSV fallback at data/gdp_series.csv
    """
    # 1) Try warmed INSEE macro cache
    try:
        macro_path = os.path.join(CACHE_DIR, "macro_series_FR.json")
        if os.path.exists(macro_path):
            js = _read_file_json(macro_path)  # type: ignore[assignment]
            items = js.get("items") or []

            def _looks_like_gdp(item: dict) -> bool:
                # Heuristics: id/dataset/series contains PIB/GDP token
                txt = (str(item.get("id") or "") + " " + str(item.get("dataset") or "") + " " + " ".join([str(x) for x in (item.get("series") or [])])).lower()
                return any(tok in txt for tok in ("pib", "gdp"))

            def _extract_year_values(payload: dict) -> Dict[int, float]:
                vals: Dict[int, float] = {}
                # Traverse recursively and collect nodes with period/time/date and value
                def rec(node: object) -> None:
                    if isinstance(node, dict):
                        lower = {k.lower(): k for k in node.keys()}
                        pkey = next((lower[k] for k in ("period", "time", "time_period", "date") if k in lower), None)
                        vkey = next((lower[k] for k in ("value", "obs_value", "val") if k in lower), None)
                        if pkey and vkey:
                            try:
                                p = str(node[pkey])
                                y = int(p[:4])
                                vals[y] = float(node[vkey])
                            except Exception:
                                pass
                        for v in node.values():
                            rec(v)
                    elif isinstance(node, list):
                        for it in node:
                            rec(it)
                rec(payload)
                return vals

            for it in items:
                if not _looks_like_gdp(it):
                    continue
                payload = it.get("data") or {}
                vals = _extract_year_values(payload if isinstance(payload, dict) else {})
                if vals:
                    return vals
    except Exception:
        pass

    # 2) Fallback to local CSV
    out: Dict[int, float] = {}
    for row in _read_csv(GDP_CSV):
        out[int(row["year"])] = float(row["gdp_eur"])
    return out


def _read_baseline_def_debt() -> Dict[int, Tuple[float, float]]:
    out: Dict[int, Tuple[float, float]] = {}
    for row in _read_csv(BASELINE_DEF_DEBT_CSV):
        out[int(row["year"])] = (float(row["deficit_eur"]), float(row["debt_eur"]))
    return out


def _load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def list_sources() -> List[Source]:
    raw = _load_json(SOURCES_JSON) or []
    out: List[Source] = []
    for r in raw:
        out.append(
            Source(
                id=str(r.get("id")),
                dataset_name=str(r.get("dataset_name")),
                url=str(r.get("url")),
                license=str(r.get("license")),
                refresh_cadence=str(r.get("refresh_cadence")),
                vintage=str(r.get("vintage")),
            )
        )
    return out


# --------------------------
# LEGO pieces & baselines
# --------------------------

def _read_file_json(path: str) -> dict | list:
    import json as _json

    with open(path, "r", encoding="utf-8") as f:
        return _json.load(f)


def _normalize_weights(entries: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
    total = sum(w for _, w in entries)
    if total <= 0:
        return []
    return [(code, float(weight) / total) for code, weight in entries if weight > 0]


def _build_mission_bridges(cfg: dict) -> tuple[Dict[str, List[Tuple[str, float]]], Dict[str, List[Tuple[str, float]]]]:
    mission_by_piece: Dict[str, List[Tuple[str, float]]] = {}
    cofog_to_mission_acc: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for piece in cfg.get("pieces", []):
        pid = str(piece.get("id"))
        mapping = piece.get("mapping") or {}
        missions_raw = mapping.get("mission") or []
        missions: List[Tuple[str, float]] = []
        for ent in missions_raw:
            code = str(ent.get("code") or "").strip()
            if not code:
                continue
            try:
                weight = float(ent.get("weight", 0.0))
            except Exception:
                weight = 0.0
            if weight <= 0:
                continue
            missions.append((code.upper(), weight))

        missions = _normalize_weights(missions) if missions else []
        if missions:
            mission_by_piece[pid] = missions

        cofogs_raw = mapping.get("cofog") or []
        for ent in cofogs_raw:
            code = str(ent.get("code") or "").strip()
            if not code:
                continue
            major = code.split(".")[0][:2]
            if not major:
                continue
            try:
                cof_weight = float(ent.get("weight", 0.0))
            except Exception:
                cof_weight = 0.0
            if cof_weight <= 0 or not missions:
                continue
            for mission_code, mission_weight in missions:
                cofog_to_mission_acc[major][mission_code] += cof_weight * mission_weight

    cofog_to_mission: Dict[str, List[Tuple[str, float]]] = {}
    for major, weights in cofog_to_mission_acc.items():
        entries = [(mission_code, value) for mission_code, value in weights.items() if value > 0]
        normalized = _normalize_weights(entries)
        if normalized:
            cofog_to_mission[major] = normalized

    return mission_by_piece, cofog_to_mission


@lru_cache(maxsize=1)
def mission_bridges() -> tuple[Dict[str, List[Tuple[str, float]]], Dict[str, List[Tuple[str, float]]]]:
    cfg = load_lego_config()
    return _build_mission_bridges(cfg)


def _normalize_alias(value: str) -> str:
    base = value.strip().lower()
    ascii_form = unicodedata.normalize('NFKD', base).encode('ascii', 'ignore').decode('ascii')
    return ascii_form or base


@lru_cache(maxsize=1)
def mission_alias_map() -> Dict[str, str]:
    aliases: Dict[str, str] = {}
    try:
        data = _read_file_json(os.path.join(DATA_DIR, "ux_labels.json"))
    except Exception:
        return aliases
    for ent in data.get("missions", []):
        mission_id = str(ent.get("id"))
        names = [str(ent.get("displayLabel") or mission_id)]
        names.extend(str(s) for s in (ent.get("synonyms") or []))
        for name in names:
            norm = _normalize_alias(name)
            if norm:
                aliases[norm] = mission_id
    return aliases


def convert_mass_mapping_to_missions(raw_mapping: Dict[str, float]) -> Dict[str, float]:
    mission_map: Dict[str, float] = defaultdict(float)
    _, cofog_to_mission = mission_bridges()

    for key, value in (raw_mapping or {}).items():
        try:
            weight = float(value)
        except Exception:
            continue
        if weight == 0:
            continue
        if isinstance(key, str) and key.upper().startswith("M_"):
            mission_map[key.upper()] += weight
            continue
        major = str(key).split(".")[0][:2]
        if major in cofog_to_mission:
            for mission_code, mission_weight in cofog_to_mission[major]:
                mission_map[mission_code] += weight * mission_weight

    return dict(mission_map)


def load_lego_config() -> dict:
    return _read_file_json(LEGO_PIECES_JSON)


def load_lego_baseline(year: int) -> dict | None:
    if wh.warehouse_available():
        try:
            snap = wh.lego_baseline(year)
            if snap:
                return snap
        except Exception:
            pass
    path = os.path.join(DATA_DIR, "cache", f"lego_baseline_{year}.json")
    if os.path.exists(path):
        try:
            return _read_file_json(path)
        except Exception:
            return None
    return None


def lego_pieces_with_baseline(year: int, scope: str = "S13") -> List[dict]:
    cfg = load_lego_config()
    mission_by_piece, _ = mission_bridges()
    # Prefer warehouse baseline if available; fallback to warmed JSON
    baseline = None
    try:
        if wh.warehouse_available():
            baseline = wh.lego_baseline(year)
    except Exception:
        baseline = None
    if not baseline:
        baseline = load_lego_baseline(year)
    amounts: dict[str, float | None] = {}
    shares: dict[str, float | None] = {}
    # Warehouse baseline does not carry a scope attribute; accept by default
    if baseline and (baseline.get("scope") is None or str(baseline.get("scope", "")).upper() == scope.upper()):
        for ent in baseline.get("pieces", []):
            pid = str(ent.get("id"))
            amounts[pid] = ent.get("amount_eur")
            shares[pid] = ent.get("share")
    out: List[dict] = []
    for p in cfg.get("pieces", []):
        pid = str(p.get("id"))
        pol = p.get("policy") or {}
        cofmaj: list[str] = []
        try:
            for mc in (p.get("mapping", {}).get("cofog") or []):
                code = str(mc.get("code") or "")
                maj = code.split(".")[0][:2] if code else ""
                if maj and maj not in cofmaj:
                    cofmaj.append(maj)
        except Exception:
            pass
        out.append(
            {
                "id": pid,
                "label": p.get("label"),
                "type": p.get("type"),
                "amount_eur": amounts.get(pid),
                "share": shares.get(pid),
                "cofog_majors": cofmaj,
                "missions": [
                    {"code": code, "weight": weight}
                    for code, weight in mission_by_piece.get(pid, [])
                ],
                "beneficiaries": p.get("beneficiaries") or {},
                "examples": p.get("examples") or [],
                "sources": p.get("sources") or [],
                "locked": bool(pol.get("locked_default", False)),
            }
        )
    return out


def lego_distance_from_dsl(year: int, dsl_b64: str, scope: str = "S13") -> dict:
    """Compute a simple distance between the baseline shares and a scenario that tweaks piece.* targets.

    - Decode DSL, parse actions with target: piece.<id>
    - Apply amount_eur (increase/decrease/set) or delta_pct on expenditure pieces only (v0)
    - Recompute shares and return L1 distance with per-piece deltas.
    """
    baseline = load_lego_baseline(year)
    cfg = load_lego_config()
    if not baseline or str(baseline.get("scope", "")).upper() != scope.upper():
        return {"score": 0.0, "byPiece": []}
    # Build current amounts and shares for expenditures only
    amounts: dict[str, float] = {}
    shares: dict[str, float] = {}
    ptypes: dict[str, str] = {str(p.get("id")): str(p.get("type")) for p in cfg.get("pieces", [])}
    for ent in baseline.get("pieces", []):
        pid = str(ent.get("id"))
        if ptypes.get(pid) != "expenditure":
            continue
        ae = ent.get("amount_eur")
        if isinstance(ae, (int, float)):
            amounts[pid] = float(ae)
            sh = ent.get("share")
            shares[pid] = float(sh) if isinstance(sh, (int, float)) else 0.0
    if not amounts:
        return {"score": 0.0, "byPiece": []}

    # Decode DSL
    data = _decode_yaml_base64(dsl_b64)
    actions = data.get("actions") or []
    offsets = data.get("offsets") or []

    def _apply(pid: str, op: str, amt_eur: float | None, delta_pct: float | None):
        if pid not in amounts:
            return
        cur = amounts[pid]
        if op == "set" and amt_eur is not None:
            amounts[pid] = max(0.0, float(amt_eur))
            return
        if amt_eur is not None:
            if op == "increase":
                amounts[pid] = max(0.0, cur + float(amt_eur))
            elif op == "decrease":
                amounts[pid] = max(0.0, cur - float(amt_eur))
        elif delta_pct is not None:
            factor = 1.0 + float(delta_pct) / 100.0
            amounts[pid] = max(0.0, cur * factor)

    for act in actions:
        target = str(act.get("target", ""))
        if not target.startswith("piece."):
            continue
        pid = target.split(".", 1)[1]
        op = str(act.get("op", "increase")).lower()
        amt = act.get("amount_eur")
        amt_eur = float(amt) if isinstance(amt, (int, float)) else None
        dp = act.get("delta_pct")
        delta_pct = float(dp) if isinstance(dp, (int, float)) else None
        _apply(pid, op, amt_eur, delta_pct)

    # New shares
    total = sum(amounts.values())
    if total <= 0:
        return {"score": 0.0, "byPiece": []}
    deltas: List[dict] = []
    score = 0.0
    for pid, old_share in shares.items():
        new_share = amounts[pid] / total
        d = abs(new_share - old_share)
        deltas.append({"id": pid, "shareDelta": d})
        score += d
    return {"score": score, "byPiece": deltas}


def _piece_amounts_after_dsl(year: int, dsl_b64: str, scope: str = "S13") -> tuple[dict[str, float], dict[str, float]]:
    """Return (baseline_amounts_by_piece, scenario_amounts_by_piece) for expenditure pieces.

    Reuses logic from lego_distance_from_dsl to apply piece.* actions to amounts.
    """
    baseline = load_lego_baseline(year)
    cfg = load_lego_config()
    amounts: dict[str, float] = {}
    ptypes: dict[str, str] = {str(p.get("id")): str(p.get("type")) for p in cfg.get("pieces", [])}
    for ent in (baseline or {}).get("pieces", []):
        pid = str(ent.get("id"))
        if ptypes.get(pid) != "expenditure":
            continue
        ae = ent.get("amount_eur")
        if isinstance(ae, (int, float)):
            amounts[pid] = float(ae)
    base = dict(amounts)
    if not amounts:
        return base, {}
    data = _decode_yaml_base64(dsl_b64)
    actions = data.get("actions") or []
    # Policy settings
    lego_policy: Dict[str, dict] = {}
    lego_elast: Dict[str, float] = {}
    try:
        for p in cfg.get("pieces", []):
            pid = str(p.get("id"))
            pol = p.get("policy") or {}
            if pol:
                lego_policy[pid] = pol
            el = p.get("elasticity") or {}
            v = el.get("value")
            if isinstance(v, (int, float)):
                lego_elast[pid] = float(v)
    except Exception:
        pass
    def _apply(pid: str, op: str, amt_eur: float | None, delta_pct: float | None, role: str | None, ptype: str) -> None:
        if pid not in amounts:
            return
        if role == "target":
            return  # targets don't change amounts
        cur = amounts[pid]
        pol = lego_policy.get(pid) or {}
        def _enforce_bounds_amount_change(change: float) -> None:
            bounds_amt = pol.get("bounds_amount_eur") or {}
            try:
                amin = float(bounds_amt.get("min")) if bounds_amt.get("min") is not None else None
                amax = float(bounds_amt.get("max")) if bounds_amt.get("max") is not None else None
            except Exception:
                amin = amax = None
            new_val = cur + change
            if amin is not None and new_val < amin - 1e-9:
                raise ValueError()
            if amax is not None and new_val > amax + 1e-9:
                raise ValueError()
        if amt_eur is not None:
            val = float(amt_eur)
            if ptype == "expenditure":
                if op == "increase":
                    _enforce_bounds_amount_change(val)
                    amounts[pid] = max(0.0, cur + val)
                elif op == "decrease":
                    _enforce_bounds_amount_change(-val)
                    amounts[pid] = max(0.0, cur - val)
                elif op == "set":
                    _enforce_bounds_amount_change(val - cur)
                    amounts[pid] = max(0.0, val)
            else:
                # revenue not modeled here for masses
                pass
        elif delta_pct is not None:
            pct = float(delta_pct)
            sign = 1.0 if op != "decrease" else -1.0
            eff = (pct / 100.0) * cur
            if ptype == "expenditure":
                amounts[pid] = max(0.0, cur + sign * eff)
            else:
                e = lego_elast.get(pid, 1.0)
                amounts[pid] = max(0.0, cur - sign * eff * e)
    for act in actions:
        target = str(act.get("target", ""))
        if not target.startswith("piece."):
            continue
        pid = target.split(".", 1)[1]
        op = str(act.get("op", "increase")).lower()
        role = str(act.get("role") or "")
        amt = act.get("amount_eur")
        amt_eur = float(amt) if isinstance(amt, (int, float)) else None
        dp = act.get("delta_pct")
        delta_pct = float(dp) if isinstance(dp, (int, float)) else None
        _apply(pid, op, amt_eur, delta_pct, role, ptypes.get(pid, "expenditure"))
    return base, amounts


def _mass_shares_from_piece_amounts(amounts: dict[str, float]) -> dict[str, float]:
    # Build piece->cofog map from config
    cfg = load_lego_config()
    cof_map: Dict[str, List[Tuple[str, float]]] = {}
    for p in cfg.get("pieces", []):
        pid = str(p.get("id"))
        cof = []
        for mc in (p.get("mapping", {}).get("cofog") or []):
            cof.append((str(mc.get("code")), float(mc.get("weight", 1.0))))
        if cof:
            cof_map[pid] = cof
    by_major: Dict[str, float] = defaultdict(float)
    total = 0.0
    for pid, amt in amounts.items():
        total += amt
        cof = cof_map.get(pid) or []
        if not cof:
            continue
        # Distribute to majors
        wsum = sum(w for _, w in cof) or 1.0
        for code, w in cof:
            major = str(code).split(".")[0][:2]
            by_major[major] += amt * (w / wsum)
    # Normalize
    shares: Dict[str, float] = {}
    if total > 0:
        for m, v in by_major.items():
            shares[m] = float(v / total)
    return shares


def _map_action_to_cofog(action: dict, baseline_year: int) -> List[Tuple[str, float]]:
    """
    Returns a list of (category, weight) e.g., [("09", 1.0)] or [("tax.ir", 1.0)].
    """
    cfg = _load_json(COFOG_MAP_JSON)
    target = str(action.get("target", ""))
    if target.startswith("tax.ir"):
        return [("tax.ir", 1.0)]
    # Direct COFOG major mapping support (e.g., cofog.07)
    if target.startswith("cofog."):
        key = target.split(".", 1)[1]
        major = str(key).zfill(2)[:2]
        if major.isdigit():
            return [(major, 1.0)]
    # mission.<code-or-name>
    if target.startswith("mission."):
        # Accept mission label (e.g., education) or code
        key = target.split(".", 1)[1]
        # Try treat as code
        if key.isdigit() and key in cfg["mission_to_cofog"]:
            return [(d["code"], float(d["weight"])) for d in cfg["mission_to_cofog"][key]]
        # Try mapping by label via sample CSV (first matching mission label)
        # Build label->code map lazily from sample data
        label_to_code: Dict[str, str] = {}
        for row in _read_csv(_state_budget_path(baseline_year)):
            label_to_code[row["mission_label"].strip().lower()] = row["mission_code"]
        code = label_to_code.get(key.replace("_", " ").lower())
        if code and code in cfg["mission_to_cofog"]:
            return [(d["code"], float(d["weight"])) for d in cfg["mission_to_cofog"][code]]
    return []


def _map_action_to_mission(
    action: dict,
    lego_mission_map: Dict[str, List[Tuple[str, float]]],
    cofog_to_mission: Dict[str, List[Tuple[str, float]]],
) -> List[Tuple[str, float]]:
    target = str(action.get("target", ""))
    if target.startswith("mission."):
        code = target.split(".", 1)[1]
        mission_code = code.upper()
        if mission_code.startswith("M_"):
            return [(mission_code, 1.0)]
        if mission_code.isdigit():
            major = mission_code[:2]
            return cofog_to_mission.get(major, [])
        alias = mission_alias_map().get(_normalize_alias(code))
        if alias:
            return [(alias, 1.0)]
        return [(mission_code, 1.0)]
    if target.startswith("cofog." ):
        key = target.split(".", 1)[1]
        major = str(key).zfill(2)[:2]
        return cofog_to_mission.get(major, [])
    if target.startswith("piece."):
        pid = target.split(".", 1)[1]
        return lego_mission_map.get(pid, [])
    return []


def mission_to_cofog_weights(mission_code: str, cofog_to_mission: Dict[str, List[Tuple[str, float]]]) -> List[Tuple[str, float]]:
    entries = []
    for major, weights in cofog_to_mission.items():
        for code, weight in weights:
            if code == mission_code:
                entries.append((major, weight))
    return _normalize_weights(entries)


def _builder_mission_totals(year: int) -> Dict[str, float]:
    # Prefer warehouse aggregation when available
    try:
        if wh.warehouse_available():
            rows = wh.lego_baseline_mission(year)
            if rows:
                return {str(r.get("mission_code")): float(r.get("amount_eur") or 0.0) for r in rows}
    except Exception:
        pass

    baseline = load_lego_baseline(year)
    if not baseline:
        return {}

    mission_by_piece, _ = mission_bridges()
    totals: Dict[str, float] = defaultdict(float)
    for ent in baseline.get("pieces", []):
        if str(ent.get("type")) != "expenditure":
            continue
        try:
            amt = float(ent.get("amount_eur") or 0.0)
        except Exception:
            amt = 0.0
        if amt == 0.0:
            continue
        pid = str(ent.get("id"))
        missions = mission_by_piece.get(pid)
        if not missions:
            raw = ent.get("missions") or []
            missions = []
            for m in raw:
                code = str(m.get("code") or "").upper()
                if not code:
                    continue
                try:
                    weight = float(m.get("weight") or 0.0)
                except Exception:
                    weight = 0.0
                if weight > 0:
                    missions.append((code, weight))
            missions = _normalize_weights(missions) if missions else []
        if not missions:
            totals["M_UNKNOWN"] += amt
            continue
        total_weight = sum(w for _, w in missions)
        if total_weight <= 0:
            totals["M_UNKNOWN"] += amt
            continue
        for mission_code, weight in missions:
            totals[mission_code] += amt * float(weight)
    return totals


def _format_mass_totals(totals: Dict[str, float]) -> List[dict]:
    items = []
    total_amount = sum(max(float(v), 0.0) for v in totals.values())
    for code, amount in totals.items():
        val = max(float(amount), 0.0)
        if val == 0.0:
            continue
        share = (val / total_amount) if total_amount > 0 else 0.0
        items.append({"massId": code, "amountEur": val, "share": share})
    items.sort(key=lambda x: x["amountEur"], reverse=True)
    return items


def builder_mass_allocation(year: int, lens: str = "MISSION") -> List[dict]:
    lens_key = str(lens).upper()
    mission_totals = _builder_mission_totals(year)
    if not mission_totals:
        return []
    if lens_key == "MISSION":
        return _format_mass_totals(mission_totals)

    if lens_key == "COFOG":
        _, cofog_to_mission = mission_bridges()
        cofog_totals: Dict[str, float] = defaultdict(float)
        for mission_code, amount in mission_totals.items():
            weights = mission_to_cofog_weights(mission_code, cofog_to_mission)
            if weights:
                for major, weight in weights:
                    cofog_totals[major] += float(amount) * weight
            else:
                cofog_totals["UNKNOWN"] += float(amount)
        return _format_mass_totals(cofog_totals)

    return _format_mass_totals(mission_totals)


def _macro_kernel(horizon: int, shocks_pct_gdp: Dict[str, List[float]], gdp_series: List[float]) -> MacroResult:
    # Allow overriding IRF parameter source via env for sensitivity toggles (V2 prep)
    try:
        import os as _os
        env_path = _os.getenv("MACRO_IRFS_PATH")
        if env_path:
            _macro_path = env_path
        else:
            from .settings import get_settings as _get_settings  # lazy import
            _macro_path = _get_settings().macro_irfs_path or MACRO_IRF_JSON
    except Exception:
        _macro_path = MACRO_IRF_JSON
    params = _load_json(_macro_path)
    H_param = int(params.get("horizon", horizon))
    T = min(int(horizon), len(gdp_series), H_param)
    okun = float(params.get("okun_elasticity", 0.4))
    rev_el = float(params.get("revenue_elasticity", 0.5))
    cats = params.get("categories", {})

    delta_gdp_pct: List[float] = [0.0] * T
    for k, s_path in shocks_pct_gdp.items():
        if k not in cats:
            continue
        irf = list(cats[k]["irf_gdp"])
        for t in range(T):
            # Convolution: sum_h irf[h] * s[t-h]
            max_h = min(len(irf) - 1, t)
            for h in range(0, max_h + 1):
                if (t - h) < 0 or (t - h) >= len(s_path):
                    continue
                delta_gdp_pct[t] += irf[h] * s_path[t - h]

    # Convert GDP pct to euros using baseline GDP series for each year
    delta_gdp_eur: List[float] = [delta_gdp_pct[t] * gdp_series[t] / 100.0 for t in range(T)]
    # Employment via Okun
    delta_emp_index: List[float] = [okun * delta_gdp_pct[t] for t in range(T)]
    # Automatic stabilizers effect on deficit: -rev_elasticity * dY
    delta_def_eur: List[float] = [-rev_el * delta_gdp_eur[t] for t in range(T)]

    return MacroResult(
        delta_gdp=delta_gdp_eur,
        delta_employment=delta_emp_index,
        delta_deficit=delta_def_eur,
        assumptions={"okun_elasticity": okun, "revenue_elasticity": rev_el},
    )



def run_scenario(dsl_b64: str, *, lens: str | None = None) -> tuple[str, Accounting, Compliance, MacroResult, dict, List[str]]:
    data = _decode_yaml_base64(dsl_b64)
    if not isinstance(data.get("assumptions"), dict):
        data["assumptions"] = {}
    assumptions = data["assumptions"]
    requested_lens = lens or assumptions.get("lens") or data.get("lens") or "MISSION"
    selected_lens = str(requested_lens).upper()
    if selected_lens not in {"MISSION", "COFOG"}:
        selected_lens = "MISSION"
    assumptions["lens"] = selected_lens
    data.pop("lens", None)
    validate_scenario(data)
    # Deterministic scenario ID from canonicalized DSL
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    sid = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    horizon_years = int((data.get("assumptions") or {}).get("horizon_years", 5))
    baseline_year = int(data.get("baseline_year", 2026))
    actions = data.get("actions") or []
    offsets = data.get("offsets") or []
    warnings: List[str] = []

    # Simple mechanical layer: sum CP deltas by year; recurring applies each year
    # Macro shocks accumulator by COFOG/tax category in % of GDP
    # Baseline GDP series via common provider
    try:
        from . import baselines as _bl  # lazy to avoid cycles
        gdp_series_map = _bl.gdp_series()
    except Exception:
        gdp_series_map = _read_gdp_series()
    gdp_series = [gdp_series_map.get(baseline_year + i, list(gdp_series_map.values())[-1]) for i in range(horizon_years)]
    shocks_pct_gdp: Dict[str, List[float]] = {}
    # Preload LEGO baseline/config to support piece.* targets
    warehouse_ok = wh.warehouse_available()
    allow_fallback = os.getenv("ALLOW_SCENARIO_BASELINE_FALLBACK", "0") in ("1", "true", "True")

    lego_bl = None
    if warehouse_ok:
        lego_bl = wh.lego_baseline(baseline_year)
        if not lego_bl:
            lego_bl = load_lego_baseline(baseline_year)
    elif allow_fallback:
        lego_bl = load_lego_baseline(baseline_year)

    if not lego_bl:
        raise RuntimeError(f"Missing LEGO baseline for {baseline_year}; ensure data is warmed")
    mission_by_piece, cofog_to_mission = mission_bridges()
    lego_mission_map: Dict[str, List[Tuple[str, float]]] = mission_by_piece
    lego_types: Dict[str, str] = {}
    lego_cofog_map: Dict[str, List[Tuple[str, float]]] = {}
    try:
        lego_cfg = load_lego_config()
        for p in lego_cfg.get("pieces", []):
            pid = str(p.get("id"))
            lego_types[pid] = str(p.get("type", "expenditure"))
            cof = []
            for mc in (p.get("mapping", {}).get("cofog") or []):
                cof.append((str(mc.get("code")), float(mc.get("weight", 1.0))))
            if cof:
                lego_cofog_map[pid] = cof
    except Exception:
        pass

    lego_amounts: Dict[str, float] = {}
    lego_elast: Dict[str, float] = {}
    lego_policy: Dict[str, dict] = {}
    if lego_bl:
        for ent in lego_bl.get("pieces", []):
            pid = str(ent.get("id"))
            try:
                val = float(ent.get("amount_eur"))
            except Exception:
                continue
            lego_amounts[pid] = val
    try:
        for p in lego_cfg.get("pieces", []):  # type: ignore[union-attr]
            pid = str(p.get("id"))
            el = p.get("elasticity") or {}
            v = el.get("value")
            if isinstance(v, (int, float)):
                lego_elast[pid] = float(v)
            pol = p.get("policy") or {}
            if pol:
                lego_policy[pid] = pol
    except Exception:
        pass

    # --- Resolution & Delta Calculation ---
    # This logic keeps separate ledgers for CP (cash) and AE (commitments) so that
    # downstream consumers can reason about which dimension each action affected.
    dimensions = ("cp", "ae")
    specified_deltas: dict[str, List[float]] = {dim: [0.0] * horizon_years for dim in dimensions}
    unspecified_deltas: dict[str, List[float]] = {dim: [0.0] * horizon_years for dim in dimensions}
    resolution_specified_by_mission_dim: dict[str, Dict[str, float]] = {dim: defaultdict(float) for dim in dimensions}
    resolution_target_by_mission_dim: dict[str, Dict[str, float]] = {dim: defaultdict(float) for dim in dimensions}
    resolution_specified_by_mission_total: Dict[str, float] = defaultdict(float)
    resolution_target_by_mission_total: Dict[str, float] = defaultdict(float)

    def _dimension_for_action(obj: dict, *, default: str = "cp") -> str:
        dim = str((obj or {}).get("dimension", default)).lower()
        if dim in {"cp", "ae", "tax"}:
            return dim
        return default

    # 1. First pass: Process specified changes (levers and pieces)
    # These have a direct, specified impact on the budget.
    
    # Levers
    levers_by_id_map: Dict[str, dict] | None = None
    try:
        from . import policy_catalog as _pol
        levers_by_id_map = _pol.levers_by_id()
    except Exception:
        levers_by_id_map = None
        
    if levers_by_id_map:
        applied_ids = {str(a.get("id")) for a in actions if str(a.get("id")) in levers_by_id_map}
        for lid in applied_ids:
            conflicts = set(levers_by_id_map[lid].get("conflicts_with") or [])
            clash = conflicts & (applied_ids - {lid})
            if clash:
                other = sorted(list(clash))[0]
                raise ValueError(f"Conflicting levers applied: '{lid}' conflicts with '{other}'")

        for lid in applied_ids:
            lever_def = levers_by_id_map[lid]
            impact = lever_def.get("fixed_impact_eur")
            if not isinstance(impact, (int, float)):
                continue

            # A positive impact is a saving (reduces deficit), a negative one is a cost (increases deficit)
            delta = -impact
            lever_dim = _dimension_for_action(lever_def)
            if lever_dim == "tax":
                lever_dim = "cp"
            ledger = specified_deltas["ae" if lever_dim == "ae" else "cp"]
            # Levers are always recurring over the horizon
            for i in range(horizon_years):
                ledger[i] += delta

            # Attribute to macro shocks using raw COFOG mapping when available
            raw_mass_mapping = lever_def.get("mass_mapping", {}) or {}
            for mass_code, weight in raw_mass_mapping.items():
                try:
                    weight_val = float(weight)
                except Exception:
                    continue
                major = str(mass_code).split(".")[0][:2]
                if not major:
                    continue
                shock_eur = delta * weight_val
                if lever_dim != "ae":
                    for i in range(horizon_years):
                        shocks_pct_gdp.setdefault(major, [0.0] * horizon_years)[i] += 100.0 * shock_eur / gdp_series[i]

            mission_mapping = lever_def.get("mission_mapping") or convert_mass_mapping_to_missions(raw_mass_mapping)
            for mission_code, weight in mission_mapping.items():
                try:
                    weight_val = float(weight)
                except Exception:
                    continue
                if weight_val == 0:
                    continue
                target_dim = "ae" if lever_dim == "ae" else "cp"
                resolution_specified_by_mission_dim[target_dim][mission_code] += -impact * weight_val
                resolution_specified_by_mission_total[mission_code] += -impact * weight_val

    # Pieces
    for act in actions:
        target = str(act.get("target", ""))
        if not target.startswith("piece."):
            continue

        pid = target.split(".", 1)[1]
        if levers_by_id_map and pid in levers_by_id_map:
            continue

        op = (act.get("op") or "").lower()
        recurring = bool(act.get("recurring", False))
        role = str(act.get("role") or "")
        dim = _dimension_for_action(act)
        ledger_key = "ae" if dim == "ae" else "cp"

        if pid not in lego_types:
            raise ValueError(f"Unknown LEGO piece id: '{pid}'")
        ptype = lego_types.get(pid, "expenditure")
        pol = lego_policy.get(pid) or {}
        if bool(pol.get("locked_default", False)):
            raise ValueError(f"Piece '{pid}' is locked by default and cannot be modified")

        base_amt = float(lego_amounts.get(pid, 0.0))
        amt_eur = act.get("amount_eur")
        dp = act.get("delta_pct")
        delta = 0.0

        if amt_eur is not None:
            val = float(amt_eur)
            if role == "target":
                missions = lego_mission_map.get(pid) or []
                if missions:
                    sign = 1.0 if ptype == "expenditure" else -1.0
                    for mission_code, weight in missions:
                        adjusted = val * sign * float(weight)
                        resolution_target_by_mission_dim[ledger_key][mission_code] += adjusted
                        resolution_target_by_mission_total[mission_code] += adjusted
            else:
                bounds_amt = pol.get("bounds_amount_eur") or {}
                try:
                    amin = float(bounds_amt.get("min")) if bounds_amt.get("min") is not None else None
                    amax = float(bounds_amt.get("max")) if bounds_amt.get("max") is not None else None
                except Exception:
                    amin = amax = None
                if ptype == "expenditure":
                    new_val = base_amt + (val if op == "increase" else -val if op == "decrease" else (val - base_amt) if op == "set" else 0.0)
                    if amin is not None and new_val < amin - 1e-9:
                        raise ValueError(f"Change exceeds bounds: amount {new_val:,.0f}€ below min {amin:,.0f}€")
                    if amax is not None and new_val > amax + 1e-9:
                        raise ValueError(f"Change exceeds bounds: amount {new_val:,.0f}€ above max {amax:,.0f}€")
                    delta = new_val - base_amt
                else:
                    new_val = base_amt - (val if op == "increase" else -val if op == "decrease" else (val - base_amt) if op == "set" else 0.0)
                    if amin is not None and new_val < amin - 1e-9:
                        raise ValueError(f"Change exceeds bounds: amount {new_val:,.0f}€ below min {amin:,.0f}€")
                    if amax is not None and new_val > amax + 1e-9:
                        raise ValueError(f"Change exceeds bounds: amount {new_val:,.0f}€ above max {amax:,.0f}€")
                    delta = new_val - base_amt
        elif dp is not None:
            pct = float(dp)
            sign = 1.0 if op != "decrease" else -1.0
            eff = (pct / 100.0) * base_amt
            if role == "target":
                missions = lego_mission_map.get(pid) or []
                eff_sign = sign * (1.0 if ptype == "expenditure" else -1.0)
                if missions:
                    for mission_code, weight in missions:
                        adjusted = eff_sign * eff * float(weight)
                        resolution_target_by_mission_dim[ledger_key][mission_code] += adjusted
                        resolution_target_by_mission_total[mission_code] += adjusted
            else:
                bounds_pct = pol.get("bounds_pct") or {}
                try:
                    pmin = float(bounds_pct.get("min")) if bounds_pct.get("min") is not None else None
                    pmax = float(bounds_pct.get("max")) if bounds_pct.get("max") is not None else None
                except Exception:
                    pmin = pmax = None
                eff_signed = sign * eff
                pct_eff = (eff_signed / base_amt * 100.0) if base_amt != 0 else 0.0
                if pmin is not None and pct_eff < pmin - 1e-9:
                    raise ValueError(f"Percent change {pct_eff:.2f}% below min bound {pmin:.2f}%")
                if pmax is not None and pct_eff > pmax + 1e-9:
                    raise ValueError(f"Percent change {pct_eff:.2f}% above max bound {pmax:.2f}%")
                if ptype == "expenditure":
                    delta = eff_signed
                else:
                    e = lego_elast.get(pid, 1.0)
                    delta = -eff_signed * e

        if delta != 0.0:
            ledger = specified_deltas[ledger_key]
            if recurring:
                for i in range(horizon_years):
                    ledger[i] += delta
            else:
                ledger[0] += delta

            if ptype == "expenditure":
                missions = lego_mission_map.get(pid) or []
                if missions:
                    for mission_code, weight in missions:
                        inc = delta * float(weight)
                        resolution_specified_by_mission_dim[ledger_key][mission_code] += inc
                        resolution_specified_by_mission_total[mission_code] += inc
                else:
                    warnings.append(f"Piece '{pid}' is missing a mission mapping; its resolution impact will be ignored.")

                cof = lego_cofog_map.get(pid) or []
                if cof:
                    for c_code, w in cof:
                        major = str(c_code).split(".")[0][:2]
                        inc = delta * float(w)
                        if ledger_key == "cp":
                            path = shocks_pct_gdp.setdefault(major, [0.0] * horizon_years)
                            if recurring:
                                for i in range(horizon_years):
                                    path[i] += 100.0 * inc / gdp_series[i]
                            else:
                                path[0] += 100.0 * inc / gdp_series[0]
                else:
                    warnings.append(f"Piece '{pid}' is missing a COFOG mapping; its macro impact will be ignored.")

    # 2. Second pass: Process mass targets and compute unspecified changes
    for act in actions:
        target = str(act.get("target", ""))
        if not (target.startswith("mission.") or target.startswith("cofog.")):
            continue
            
        op = (act.get("op") or "").lower()
        recurring = bool(act.get("recurring", False))
        role = str(act.get("role") or "")
        dim = _dimension_for_action(act)
        ledger_key = "ae" if dim == "ae" else "cp"
        
        if "amount_eur" in act:
            amount = float(act["amount_eur"]) * (1 if op == "increase" else -1 if op == "decrease" else 0)
            if amount == 0.0:
                continue

            missions = _map_action_to_mission(act, lego_mission_map, cofog_to_mission)
            if not missions:
                continue

            for mission_code, weight in missions:
                target_delta = amount * float(weight)
                resolution_target_by_mission_dim[ledger_key][mission_code] += target_delta
                resolution_target_by_mission_total[mission_code] += target_delta

                if role != "target":
                    specified_mission = resolution_specified_by_mission_dim[ledger_key].get(mission_code, 0.0)
                    unspecified_delta = target_delta - specified_mission

                    if recurring:
                        for i in range(horizon_years):
                            unspecified_deltas[ledger_key][i] += unspecified_delta
                    else:
                        unspecified_deltas[ledger_key][0] += unspecified_delta

                    if ledger_key == "cp":
                        for major, cof_weight in mission_to_cofog_weights(mission_code, cofog_to_mission):
                            path = shocks_pct_gdp.setdefault(major, [0.0] * horizon_years)
                            if recurring:
                                for i in range(horizon_years):
                                    path[i] += 100.0 * unspecified_delta * cof_weight / gdp_series[i]
                            else:
                                path[0] += 100.0 * unspecified_delta * cof_weight / gdp_series[0]

    # 3. Final combination (CP + AE ledgers)
    cp_deltas_by_year = [s + u for s, u in zip(specified_deltas["cp"], unspecified_deltas["cp"])]
    ae_deltas_by_year = [s + u for s, u in zip(specified_deltas["ae"], unspecified_deltas["ae"])]
    deltas_by_year = cp_deltas_by_year
    
    # Basic tax op handling (simplified, outside main resolution loop)
    for act in actions:
        if str(act.get("dimension")) == "tax" and "delta_bps" in act:
            recurring = bool(act.get("recurring", False))
            for cat, w in _map_action_to_cofog(act, baseline_year):
                path = shocks_pct_gdp.setdefault(cat, [0.0] * horizon_years)
                bps = float(act["delta_bps"])
                shock_pct = -0.001 * bps * float(w)
                if recurring:
                    for i in range(horizon_years):
                        path[i] += shock_pct
                else:
                    path[0] += shock_pct
    
    # Apply offsets (pool-level v0)
    local_deltas_by_year = list(deltas_by_year)
    apu = str((data.get("assumptions") or {}).get("apu_subsector") or "").upper()
    for off in offsets:
        try:
            pool = str(off.get("pool", "")).lower()
            amt = float(off.get("amount_eur") or 0.0)
            recurring = bool(off.get("recurring", False))
        except Exception:
            continue
        
        # Global offsets affect the main deficit path
        if pool in ("spending", "revenue"):
            delta = -amt
            if recurring:
                for i in range(horizon_years):
                    deltas_by_year[i] += delta
            else:
                deltas_by_year[0] += delta
        
        # Local offsets only apply to APUL's balance rule and don't alter the main deficit
        elif apu == "APUL" and pool in ("local_spending", "local_revenue"):
            delta = -amt
            if recurring:
                for i in range(horizon_years):
                    local_deltas_by_year[i] += delta
            else:
                local_deltas_by_year[0] += delta


    # Deficit path = sum of deltas (positive increases deficit)
    deficit_delta_path = [float(x) for x in deltas_by_year]
    debt_delta_path: List[float] = []
    debt = 0.0
    for d in deficit_delta_path:
        debt += d
        debt_delta_path.append(float(debt))

    # Macro kernel
    macro = _macro_kernel(horizon_years, shocks_pct_gdp, gdp_series)

    # Net expenditure rule (simplified):
    # - Baseline net primary expenditure (NPE) assumed at 50% of GDP in year 0
    # - Baseline NPE grows by reference rate each year
    # - Scenario NPE_t = BaselineNPE_t + spending delta for year t (from mechanical layer)
    # - Rule: YOY growth(NPE) <= reference rate ⇒ ok, else breach
    settings = get_settings()
    ref = float(getattr(settings, "net_exp_reference_rate", 0.015))
    base_npe0 = 0.50 * gdp_series[0]
    base_npe_path: List[float] = [base_npe0]
    for i in range(1, horizon_years):
        base_npe_path.append(base_npe_path[-1] * (1.0 + ref))
    scen_npe: List[float] = [base_npe_path[i] + deltas_by_year[i] for i in range(horizon_years)]
    net_exp_status: List[str] = []
    for i in range(horizon_years):
        if i == 0 or scen_npe[i - 1] == 0:
            net_exp_status.append("ok")
            continue
        growth = (scen_npe[i] / scen_npe[i - 1]) - 1.0
        net_exp_status.append("ok" if growth <= ref + 1e-9 else "breach")

    # Baseline series for compliance
    try:
        from . import baselines as _bl  # lazy to avoid cycles
        base_map = _bl.def_debt_series()
    except Exception:
        base_map = _read_baseline_def_debt()
    eu3 = []
    debt_ratio_path: List[float] = []
    baseline_deficit_path: List[float] = []
    baseline_debt_path: List[float] = []
    total_deficit_path: List[float] = []
    total_debt_path: List[float] = []
    gdp_path: List[float] = []
    baseline_deficit_ratio_path: List[float] = []
    deficit_ratio_path: List[float] = []
    baseline_debt_ratio_path: List[float] = []
    for i in range(horizon_years):
        year = baseline_year + i
        base_def, base_debt = base_map.get(year, (0.0, 0.0))
        baseline_deficit_path.append(float(base_def))
        baseline_debt_path.append(float(base_debt))
        total_def = base_def - deficit_delta_path[i] - macro.delta_deficit[i]
        total_debt = base_debt + debt_delta_path[i]
        total_deficit_path.append(float(total_def))
        total_debt_path.append(float(total_debt))
        gdp_val = float(gdp_series[i]) if i < len(gdp_series) else float(gdp_series[-1])
        gdp_path.append(gdp_val)
        if gdp_val != 0.0:
            base_def_ratio = float(base_def) / gdp_val
            scen_def_ratio = float(total_def) / gdp_val
            base_debt_ratio = float(base_debt) / gdp_val
            scen_debt_ratio = float(total_debt) / gdp_val
        else:
            base_def_ratio = 0.0
            scen_def_ratio = 0.0
            base_debt_ratio = 0.0
            scen_debt_ratio = 0.0
        ratio_def = scen_def_ratio
        eu3.append("breach" if ratio_def < -0.03 else "ok")
        debt_ratio_path.append(scen_debt_ratio)
        baseline_deficit_ratio_path.append(base_def_ratio)
        deficit_ratio_path.append(scen_def_ratio)
        baseline_debt_ratio_path.append(base_debt_ratio)
    eu60 = ["above" if r > 0.60 else "info" for r in debt_ratio_path]

    # Local balance checks by subsector
    apu = str((data.get("assumptions") or {}).get("apu_subsector") or "").upper()
    try:
        tol = float(get_settings().local_balance_tolerance_eur)
    except Exception:
        tol = 0.0
    lb: List[str]
    if apu == "APUL":
        # Local gov: balanced each year within tolerance, using local offsets
        lb = ["ok" if abs(d) <= tol else "breach" for d in local_deltas_by_year]
    elif apu == "ASSO":
        # Social security funds: also aim for yearly balance
        lb = ["ok" if abs(d) <= tol else "breach" for d in deltas_by_year]
    elif apu == "APUC":
        # Central gov: multi-year balance — last year cumulative near zero; earlier years 'info'
        cum = sum(deltas_by_year)
        lb = ["info" for _ in range(horizon_years)]
        lb[-1] = "ok" if abs(cum) <= tol else "breach"
    else:
        lb = ["n/a" for _ in range(horizon_years)]

    comp = Compliance(
        eu3pct=eu3,
        eu60pct=eu60,
        net_expenditure=net_exp_status,
        local_balance=lb,
    )

    acc = Accounting(
        deficit_path=total_deficit_path,
        debt_path=total_debt_path,
        commitments_path=[float(v) for v in ae_deltas_by_year],
        deficit_delta_path=deficit_delta_path,
        debt_delta_path=debt_delta_path,
        baseline_deficit_path=baseline_deficit_path,
        baseline_debt_path=baseline_debt_path,
        gdp_path=gdp_path,
        deficit_ratio_path=deficit_ratio_path,
        baseline_deficit_ratio_path=baseline_deficit_ratio_path,
        debt_ratio_path=debt_ratio_path,
        baseline_debt_ratio_path=baseline_debt_ratio_path,
    )

    # Build resolution payloads for both mission and COFOG lenses
    mission_ids = set(
        list(resolution_target_by_mission_total.keys()) + list(resolution_specified_by_mission_total.keys())
    )

    cp_target_by_mission = resolution_target_by_mission_dim.get("cp", {})
    cp_spec_by_mission = resolution_specified_by_mission_dim.get("cp", {})
    by_mass_mission: List[dict] = []
    total_target_abs = 0.0
    total_spec_abs = 0.0
    for mid in sorted(mission_ids):
        t = float(resolution_target_by_mission_total.get(mid, 0.0))
        s = float(resolution_specified_by_mission_total.get(mid, 0.0))
        cp_t = float(cp_target_by_mission.get(mid, 0.0))
        cp_s = float(cp_spec_by_mission.get(mid, 0.0))
        if abs(cp_t) > 1e-9:
            cp_delta = cp_t
            cp_unspecified = cp_t - cp_s
        else:
            cp_delta = cp_s
            cp_unspecified = 0.0
        by_mass_mission.append(
            {
                "massId": mid,
                "targetDeltaEur": t,
                "specifiedDeltaEur": s,
                "cpTargetDeltaEur": cp_t,
                "cpSpecifiedDeltaEur": cp_s,
                "cpDeltaEur": cp_delta,
                "unspecifiedCpDeltaEur": cp_unspecified,
            }
        )
        total_target_abs += abs(t)
        total_spec_abs += abs(s)
    overall_mission = (total_spec_abs / total_target_abs) if total_target_abs > 0 else 0.0
    resolution_mission = {"overallPct": overall_mission, "byMass": by_mass_mission}

    cofog_target_totals: Dict[str, float] = defaultdict(float)
    cofog_spec_totals: Dict[str, float] = defaultdict(float)
    cofog_cp_target_totals: Dict[str, float] = defaultdict(float)
    cofog_cp_spec_totals: Dict[str, float] = defaultdict(float)
    for mid in mission_ids:
        t = float(resolution_target_by_mission_total.get(mid, 0.0))
        s = float(resolution_specified_by_mission_total.get(mid, 0.0))
        cp_t = float(cp_target_by_mission.get(mid, 0.0))
        cp_s = float(cp_spec_by_mission.get(mid, 0.0))
        weights = mission_to_cofog_weights(mid, cofog_to_mission)
        if weights:
            for major, cof_weight in weights:
                cofog_target_totals[major] += t * cof_weight
                cofog_spec_totals[major] += s * cof_weight
                cofog_cp_target_totals[major] += cp_t * cof_weight
                cofog_cp_spec_totals[major] += cp_s * cof_weight
        elif abs(t) > 0 or abs(s) > 0:
            cofog_target_totals["UNKNOWN"] += t
            cofog_spec_totals["UNKNOWN"] += s
            cofog_cp_target_totals["UNKNOWN"] += cp_t
            cofog_cp_spec_totals["UNKNOWN"] += cp_s

    by_mass_cofog: List[dict] = []
    cofog_target_abs = 0.0
    cofog_spec_abs = 0.0
    for code in sorted(cofog_target_totals.keys()):
        t = float(cofog_target_totals.get(code, 0.0))
        s = float(cofog_spec_totals.get(code, 0.0))
        cp_t = float(cofog_cp_target_totals.get(code, 0.0))
        cp_s = float(cofog_cp_spec_totals.get(code, 0.0))
        if abs(cp_t) > 1e-9:
            cp_delta = cp_t
            cp_unspecified = cp_t - cp_s
        else:
            cp_delta = cp_s
            cp_unspecified = 0.0
        by_mass_cofog.append(
            {
                "massId": code,
                "targetDeltaEur": t,
                "specifiedDeltaEur": s,
                "cpTargetDeltaEur": cp_t,
                "cpSpecifiedDeltaEur": cp_s,
                "cpDeltaEur": cp_delta,
                "unspecifiedCpDeltaEur": cp_unspecified,
            }
        )
        cofog_target_abs += abs(t)
        cofog_spec_abs += abs(s)
    overall_cofog = (cofog_spec_abs / cofog_target_abs) if cofog_target_abs > 0 else 0.0
    resolution_cofog = {"overallPct": overall_cofog, "byMass": by_mass_cofog}

    resolution_by_lens = {
        "MISSION": resolution_mission,
        "COFOG": resolution_cofog,
    }
    selected_resolution = resolution_by_lens.get(selected_lens, resolution_mission)
    resolution = {
        "overallPct": selected_resolution["overallPct"],
        "byMass": selected_resolution["byMass"],
        "lens": selected_lens,
    }

    return sid, acc, comp, macro, resolution, warnings
def _procurement_path(year: int) -> str:
    """Prefer normalized DECP cache if present for the given year, else sample CSV.
    """
    cached = os.path.join(CACHE_DIR, f"procurement_contracts_{year}.csv")
    return cached if os.path.exists(cached) else PROCUREMENT_CSV
