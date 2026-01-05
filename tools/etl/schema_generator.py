"""Dynamic schema helpers for scenario ETL."""

from __future__ import annotations

import os
from typing import Any, Dict, List

import yaml

from tools.etl.strings import slugify

DEFAULT_POLICY_CATALOG_PATH = os.path.join("data", "policy_levers.yaml")


def policy_lever_columns(catalog_path: str | None = None) -> List[str]:
    """Return reform column names derived from the policy catalog.

    Args:
        catalog_path: Optional path to the policy levers YAML.

    Returns:
        A list of column names like "reform_<lever_id>".
    """
    path = catalog_path or DEFAULT_POLICY_CATALOG_PATH
    catalog = _load_policy_catalog(path)

    columns: List[str] = []
    seen = set()
    for lever in catalog:
        lever_id = lever.get("id")
        if not isinstance(lever_id, str) or not lever_id.strip():
            continue
        column = f"reform_{slugify(lever_id)}"
        if column in seen:
            continue
        seen.add(column)
        columns.append(column)

    return columns


def _load_policy_catalog(path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Policy catalog not found: {path}")

    with open(path, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    if data is None:
        return []
    if not isinstance(data, list):
        raise ValueError("Policy catalog must be a list of levers")

    return [item for item in data if isinstance(item, dict)]
