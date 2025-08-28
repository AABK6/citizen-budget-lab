from __future__ import annotations

from typing import Any, Dict, Optional

from ..http_client import get


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
    resp = get(url, params=params)
    return resp.json()

