from __future__ import annotations

import datetime as dt
import json
import os
import shutil
from functools import lru_cache
from typing import Dict, List, Optional
import unicodedata

import yaml
from jsonschema import Draft202012Validator


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(ROOT, "data")
SCHEMA_PATH = os.path.join(ROOT, "schemas", "policy_levers.schema.json")
DEFAULT_CATALOG_PATH = os.path.join(DATA_DIR, "policy_levers.yaml")


def _catalog_path(path: str | None = None) -> str:
    raw = path or os.getenv("POLICY_CATALOG_PATH") or DEFAULT_CATALOG_PATH
    if not os.path.isabs(raw):
        return os.path.abspath(os.path.join(ROOT, raw))
    return raw


def read_policy_catalog_text(path: str | None = None) -> str:
    catalog_path = _catalog_path(path)
    with open(catalog_path, "r", encoding="utf-8") as f:
        return f.read()


@lru_cache
def _load_schema() -> dict:
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_catalog(text: str) -> list[dict]:
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:  # pragma: no cover - surface full error
        raise ValueError(f"Invalid YAML: {exc}") from exc
    if data is None:
        return []
    if not isinstance(data, list):
        raise ValueError("Policy catalog must be a list of levers")
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"Lever at index {idx} must be a mapping")
    return data


def _format_error(err) -> str:
    path = ".".join(str(p) for p in err.absolute_path) or "<root>"
    return f"{path}: {err.message}"


def validate_policy_catalog_data(data: list[dict]) -> list[str]:
    errors: list[str] = []
    schema = _load_schema()
    validator = Draft202012Validator(schema)
    for err in sorted(validator.iter_errors(data), key=lambda e: e.path):
        errors.append(_format_error(err))

    ids: list[str] = []
    for item in data:
        lever_id = item.get("id")
        if isinstance(lever_id, str):
            ids.append(lever_id)

    duplicates = sorted({lever_id for lever_id in ids if ids.count(lever_id) > 1})
    for lever_id in duplicates:
        errors.append(f"id: duplicate '{lever_id}'")

    known = set(ids)
    for item in data:
        lever_id = item.get("id")
        conflicts = item.get("conflicts_with") or []
        if not isinstance(conflicts, list):
            continue
        for conflict in conflicts:
            if conflict not in known:
                errors.append(f"{lever_id}.conflicts_with: unknown id '{conflict}'")

    return errors


def load_policy_catalog_from_text(text: str) -> list[dict]:
    data = _parse_catalog(text)
    errors = validate_policy_catalog_data(data)
    if errors:
        details = "\n".join(f"- {e}" for e in errors)
        raise ValueError(f"Policy catalog validation failed:\n{details}")
    return data


def validate_policy_catalog_text(text: str) -> list[str]:
    try:
        data = _parse_catalog(text)
    except ValueError as exc:
        return [str(exc)]
    return validate_policy_catalog_data(data)


def write_policy_catalog_text(text: str, path: str | None = None) -> dict:
    catalog_path = _catalog_path(path)
    os.makedirs(os.path.dirname(catalog_path), exist_ok=True)
    backup_path = None
    if os.path.exists(catalog_path):
        ts = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d%H%M%S")
        backup_path = f"{catalog_path}.{ts}.bak"
        shutil.copyfile(catalog_path, backup_path)
    with open(catalog_path, "w", encoding="utf-8") as f:
        f.write(text)
        if not text.endswith("\n"):
            f.write("\n")
    _load_catalog_cached.cache_clear()
    return {"path": catalog_path, "backup_path": backup_path}


@lru_cache
def _load_catalog_cached(path: str) -> list[dict]:
    text = read_policy_catalog_text(path)
    return load_policy_catalog_from_text(text)


def load_policy_catalog(refresh: bool = False, path: str | None = None) -> list[dict]:
    catalog_path = _catalog_path(path)
    if refresh:
        _load_catalog_cached.cache_clear()
    return _load_catalog_cached(catalog_path)


# --- Helper Functions ---


def _normalize_budget_side(lever: dict) -> str:
    side = str(lever.get("budget_side") or "").upper()
    if side in {"SPENDING", "REVENUE", "BOTH"}:
        return side

    family = str(lever.get("family") or "").upper()
    if family in {"TAXES", "TAX_EXPENDITURES"}:
        return "REVENUE"
    if lever.get("mass_mapping") or lever.get("mission_mapping"):
        return "SPENDING"
    if family in {"PENSIONS", "HEALTH", "DEFENSE", "STAFFING", "SUBSIDIES", "PROCUREMENT", "OPERATIONS"}:
        return "SPENDING"

    return "SPENDING"


def _normalized_lever(lever: dict) -> dict:
    normalized = dict(lever)
    normalized["active"] = lever.get("active", True) is not False
    normalized["budget_side"] = _normalize_budget_side(lever)
    normalized["major_amendment"] = bool(lever.get("major_amendment", False))
    return normalized


def _normalize_search(value: str) -> str:
    base = value.strip().lower()
    return unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii")


def _is_active(lever: dict) -> bool:
    return lever.get("active", True) is not False


def levers_by_id() -> Dict[str, dict]:
    return {
        str(lever.get("id")): _normalized_lever(lever)
        for lever in load_policy_catalog()
        if _is_active(lever)
    }


def list_policy_levers(family: Optional[str] = None, search: Optional[str] = None) -> List[dict]:
    """
    Return a filtered list of policy levers.
    """
    results = []

    # Normalize inputs
    search_q = _normalize_search(search) if search else None

    for lever in load_policy_catalog():
        if not _is_active(lever):
            continue
        normalized = _normalized_lever(lever)
        # Filter by family
        if family and normalized.get("family") != family:
            continue

        # Filter by search query
        if search_q:
            label = _normalize_search(str(normalized.get("label", "")))
            desc = _normalize_search(str(normalized.get("description", "")))
            if search_q not in label and search_q not in desc:
                continue

        results.append(normalized)

    return results


def suggest_levers_for_mass(mass_id: str, limit: int = 5) -> List[dict]:
    """
    Return a list of policy levers relevant to a specific budget mass/mission.
    Heuristic: check mass_mapping keys or family relevance.
    """
    results = []
    mass_id_clean = mass_id.replace("M_", "")  # Strip prefix if present for COFOG

    for lever in load_policy_catalog():
        if not _is_active(lever):
            continue
        normalized = _normalized_lever(lever)
        if normalized.get("budget_side") == "REVENUE":
            continue
        mapping = lever.get("mass_mapping") or {}

        # 1. Direct match in mapping
        # COFOG keys are usually 01, 02...
        # Mission keys might be mapped later.
        # For now, simplistic check if any key roughly matches
        match = False
        for k in mapping.keys():
            if k in mass_id_clean or mass_id_clean in k:
                match = True
                break

        # 2. Family match heuristics (optional)
        # e.g. M_HEALTH -> HEALTH family
        family = normalized.get("family", "")
        if "HEALTH" in mass_id_clean and family == "HEALTH":
            match = True
        elif "DEFENSE" in mass_id_clean and family == "DEFENSE":
            match = True
        elif "EDU" in mass_id_clean and family == "STAFFING":
            match = True

        if match:
            results.append(normalized)

    # Sort by popularity if available, otherwise fixed_impact
    results.sort(key=lambda x: (x.get("popularity") or 0.0), reverse=True)

    return results[:limit]
