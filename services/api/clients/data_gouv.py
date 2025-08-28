from __future__ import annotations

from typing import Any, Dict

# Import module for easier monkeypatching in tests
from .. import http_client as hc


BASE = "https://www.data.gouv.fr/api/1"


def search_datasets(query: str, page_size: int = 5) -> Dict[str, Any]:
    resp = hc.get(f"{BASE}/datasets/", params={"q": query, "page_size": page_size})
    return resp.json()


def get_dataset(slug_or_id: str) -> Dict[str, Any]:
    resp = hc.get(f"{BASE}/datasets/{slug_or_id}/")
    return resp.json()
