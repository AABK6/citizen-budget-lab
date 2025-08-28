from __future__ import annotations

from typing import Any, Dict

from .. import http_client as hc


DATASET_SLUG = "donnees-essentielles-de-la-commande-publique"
BASE = "https://www.data.gouv.fr/api/1"


def latest_resource() -> Dict[str, Any]:
    ds = hc.get(f"{BASE}/datasets/{DATASET_SLUG}/").json()
    resources = ds.get("resources", [])
    # pick most recent CSV/JSON resource
    resources = [r for r in resources if r.get("format", "").lower() in {"csv", "json"}]
    resources.sort(key=lambda r: r.get("last_modified") or r.get("created_at") or "", reverse=True)
    return resources[0] if resources else {}
