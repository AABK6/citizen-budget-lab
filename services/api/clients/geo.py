from __future__ import annotations

from typing import Any, Dict, List

from ..http_client import get


BASE = "https://geo.api.gouv.fr"


def communes_by_departement(code_dept: str) -> List[Dict[str, Any]]:
    resp = get(f"{BASE}/communes", params={"codeDepartement": code_dept})
    return resp.json()


def commune_by_code(code_insee: str) -> Dict[str, Any]:
    resp = get(f"{BASE}/communes/{code_insee}")
    return resp.json()

