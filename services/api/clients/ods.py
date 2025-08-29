from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from .. import http_client as hc


def records(base: str, dataset: str, select: Optional[str] = None, where: Optional[str] = None,
            group_by: Optional[str] = None, order_by: Optional[str] = None,
            limit: int = 10, offset: int = 0) -> Dict[str, Any]:
    """Query Opendatasoft Explore API v2.1 records endpoint.

    base: e.g., https://data.economie.gouv.fr
    dataset: dataset id
    """
    url = f"{base.rstrip('/')}/api/explore/v2.1/catalog/datasets/{dataset}/records"
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if select:
        params["select"] = select
    if where:
        params["where"] = where
    if group_by:
        params["group_by"] = group_by
    if order_by:
        params["order_by"] = order_by
    resp = hc.get(url, params=params)
    return resp.json()


def dataset_info(base: str, dataset: str) -> Dict[str, Any]:
    """Fetch dataset metadata (fields, types)."""
    url = f"{base.rstrip('/')}/api/explore/v2.1/catalog/datasets/{dataset}"
    resp = hc.get(url)
    return resp.json()


def iterate_records(base: str, dataset: str, *, select: Optional[str] = None, where: Optional[str] = None,
                    order_by: Optional[str] = None, page_size: int = 1000, max_pages: int = 1000) -> Iterable[Dict[str, Any]]:
    """Paginate through records endpoint yielding result rows (dicts)."""
    offset = 0
    seen = 0
    for _ in range(max_pages):
        js = records(base, dataset, select=select, where=where, order_by=order_by, limit=page_size, offset=offset)
        rows: List[Dict[str, Any]] = js.get("results") or js.get("records") or js.get("data") or []
        if not rows:
            break
        for r in rows:
            yield r.get("record") if isinstance(r, dict) and "record" in r else r
        got = len(rows)
        seen += got
        if got < page_size:
            break
        offset += page_size
