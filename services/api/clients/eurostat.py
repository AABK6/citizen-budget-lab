from __future__ import annotations

from typing import Any, Dict, List, Optional

from .. import http_client as hc
import httpx
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


def sdmx_value(flow: str, key: str, *, time: str | None = None) -> Optional[float]:
    """Fetch a single SDMX 2.1 series and return the value for a given time (or last).

    Uses the dissemination SDMX 2.1 base and requests XML for reliability.
    flow: dataset id (e.g., 'gov_10a_exp')
    key: SDMX key in correct dimension order (e.g., 'A.MIO_EUR.S13.GF09.TE.FR')
    time: optional year string (YYYY). If provided, returns the matching Obs; else last Obs.
    """
    s = get_settings()
    base = s.eurostat_sdmx_base.rstrip("/")
    url = f"{base}/data/{flow}/{key}"
    headers = {"Accept": "application/xml"}
    cookie = s.eurostat_cookie
    if cookie:
        headers["Cookie"] = cookie
    params: Dict[str, Any] = {}
    if time:
        params["time"] = time
    # Use a direct httpx client without retry to avoid long delays on 4xx
    try:
        with httpx.Client(timeout=get_settings().http_timeout) as client:
            resp = client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            text = resp.text
    except Exception:
        return None
    # Parse SDMX-XML GenericData and extract Obs values
    try:
        import xml.etree.ElementTree as ET

        ns = {
            "m": "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message",
            "g": "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic",
        }
        root = ET.fromstring(text)
        # Iterate observations
        vals: list[tuple[str, float]] = []
        for obs in root.findall(".//g:Obs", ns):
            od = obs.find("g:ObsDimension", ns)
            ov = obs.find("g:ObsValue", ns)
            if od is None or ov is None:
                continue
            t = od.get("value") or ""
            try:
                v = float(ov.get("value") or 0.0)
            except Exception:
                continue
            vals.append((t, v))
        if not vals:
            return None
        if time:
            for t, v in vals:
                if t == time:
                    return v
        # fallback: return last by time sort
        vals.sort(key=lambda x: x[0])
        return vals[-1][1]
    except Exception:
        return None


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
    # Best-effort defaults for extra dimensions
    default_coords: Dict[str, str] = {"unit": unit, "geo": geo, "time": str(year)}
    for d in dims:
        if d in ("unit", "geo", "time", cofog_dim):
            continue
        # Prefer known general codes
        m = idx_maps.get(d, {})
        if not m:
            continue
        if d.lower().startswith("sector") and "S13" in m:
            default_coords[d] = "S13"
        elif d.lower().startswith("na_item") and "TE" in m:
            default_coords[d] = "TE"
        else:
            # Fallback to the first available code deterministically
            default_coords[d] = sorted(m.keys(), key=lambda k: m[k])[0]
    totals = 0.0
    vals: List[tuple[str, str, float]] = []
    for code in idx_maps[cofog_dim].keys():
        coords = dict(default_coords)
        coords[cofog_dim] = code
        v = value_at(js, coords)
        if v is None:
            continue
        totals += v
        vals.append((code, labels.get(cofog_dim, {}).get(code, code), v))
    if totals <= 0.0:
        return []
    shares = [(code, label, v / totals) for code, label, v in vals]
    shares.sort(key=lambda x: x[2], reverse=True)
    return shares
