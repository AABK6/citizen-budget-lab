from __future__ import annotations

from typing import Any, Dict, List, Optional

from .. import http_client as hc
from ..settings import get_settings


def _base_url(dataset: str) -> str:
    s = get_settings()
    base = s.eurostat_base.rstrip("/")
    lang = s.eurostat_lang
    return f"{base}/{lang}/{dataset}"


def fetch(dataset: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch SDMX-JSON from Eurostat REST API v2.1.

    Example dataset: gov_10a_exp, gov_10dd_edpt1
    Example params: {"time": "2020", "unit": "MIO_EUR", "geo": "FR"}
    """
    url = _base_url(dataset)
    headers = {"Accept": "application/json"}
    cookie = get_settings().eurostat_cookie
    if cookie:
        headers["Cookie"] = cookie
    resp = hc.get(url, headers=headers, params=params)
    return resp.json()


def _dim_maps(js: Dict[str, Any]) -> tuple[List[str], List[int], Dict[str, Dict[str, int]], Dict[str, Dict[str, str]]]:
    dims: List[str] = js["dimension"]["id"]
    sizes: List[int] = js["size"]
    idx_maps: Dict[str, Dict[str, int]] = {}
    labels: Dict[str, Dict[str, str]] = {}
    for d in dims:
        cat = js["dimension"][d]["category"]
        idx_maps[d] = cat.get("index", {})
        labels[d] = cat.get("label", {})
    return dims, sizes, idx_maps, labels


def _lin_index(dims: List[str], sizes: List[int], idx_maps: Dict[str, Dict[str, int]], coords: Dict[str, str]) -> Optional[int]:
    # Compute linearized index for given coords
    mul = 1
    idx = 0
    for pos, d in enumerate(dims[::-1]):
        d_real = dims[len(dims) - 1 - pos]
        size = sizes[len(dims) - 1 - pos]
        if d_real not in coords:
            return None
        code = coords[d_real]
        d_map = idx_maps.get(d_real, {})
        if code not in d_map:
            return None
        ival = d_map[code]
        idx += ival * mul
        mul *= size
    return idx


def value_at(js: Dict[str, Any], coords: Dict[str, str]) -> Optional[float]:
    dims, sizes, idx_maps, _ = _dim_maps(js)
    li = _lin_index(dims, sizes, idx_maps, coords)
    if li is None:
        return None
    val = js.get("value", {}).get(str(li))
    return float(val) if val is not None else None


def cofog_shares(js: Dict[str, Any], year: int, geo: str, unit: str = "MIO_EUR", cofog_dim: str = "cofog99") -> List[tuple[str, str, float]]:
    """Compute shares across COFOG categories for a country/year from MIO_EUR.

    Returns list of (code, label, share) sorted desc.
    """
    dims, _, idx_maps, labels = _dim_maps(js)
    if cofog_dim not in idx_maps:
        return []
    totals = 0.0
    vals: List[tuple[str, str, float]] = []
    for code in idx_maps[cofog_dim].keys():
        v = value_at(js, {"unit": unit, cofog_dim: code, "geo": geo, "time": str(year)})
        if v is None:
            continue
        totals += v
        vals.append((code, labels.get(cofog_dim, {}).get(code, code), v))
    if totals <= 0.0:
        return []
    shares = [(code, label, v / totals) for code, label, v in vals]
    shares.sort(key=lambda x: x[2], reverse=True)
    return shares
