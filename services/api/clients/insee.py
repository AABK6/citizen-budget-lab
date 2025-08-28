from __future__ import annotations

import time
from typing import Any, Dict, List

from ..http_client import get, post
from ..settings import get_settings

SIRENE_VERSION = "V3.11"
SIRENE_BASE = f"https://api.insee.fr/entreprises/sirene/{SIRENE_VERSION}"


_TOK_CACHE: dict[str, tuple[str, float]] = {}


def _get_token(scope: str) -> str:
    settings = get_settings()
    cid = settings.insee_client_id
    csec = settings.insee_client_secret
    if not cid or not csec:
        raise RuntimeError("INSEE_CLIENT_ID/INSEE_CLIENT_SECRET not set")
    key = scope
    now = time.time()
    if key in _TOK_CACHE and _TOK_CACHE[key][1] > now + 30:
        return _TOK_CACHE[key][0]
    resp = post(
        "https://api.insee.fr/token",
        data={"grant_type": "client_credentials", "scope": scope},
        auth=(cid, csec),
    )
    js = resp.json()
    token = js["access_token"]
    ttl = int(js.get("expires_in", 3600))
    _TOK_CACHE[key] = (token, now + ttl)
    return token


def bdm_series(dataset: str, series_ids: List[str], since_period: str | None = None) -> Dict[str, Any]:
    """
    Fetch INSEE BDM series from dataset and list of series ids.
    period format: e.g. 2000 or 2000-01 for monthly, per BDM.
    """
    token = _get_token("seriesbdm.read")
    headers = {"Authorization": f"Bearer {token}"}
    ids = ",".join(series_ids)
    url = f"https://api.insee.fr/series/BDM/V1/data/{dataset}/{ids}"
    params = {"firstNObservations": 0}
    if since_period:
        params["firstPeriod"] = since_period
    resp = get(url, headers=headers, params=params)
    return resp.json()


def sirene_by_siren(siren: str) -> Dict[str, Any]:
    token = _get_token("sireneV3")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = f"{SIRENE_BASE}/siren/{siren}"
    resp = get(url, headers=headers)
    return resp.json()


def sirene_by_siret(siret: str) -> Dict[str, Any]:
    token = _get_token("sireneV3")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = f"{SIRENE_BASE}/siret/{siret}"
    resp = get(url, headers=headers)
    return resp.json()
