from __future__ import annotations

import datetime as dt
import json
import os
import shutil
from functools import lru_cache
from typing import Dict, List, Optional
import unicodedata

import yaml
from yaml.constructor import ConstructorError
from jsonschema import Draft202012Validator


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(ROOT, "data")
SCHEMA_PATH = os.path.join(ROOT, "schemas", "policy_levers.schema.json")
DEFAULT_CATALOG_PATH = os.path.join(DATA_DIR, "policy_levers.yaml")

# Legacy PLF mission ids used by the policy catalog need translation to app-level missions.
# Ecologie split derived from docs/plf_missions_programmes.md (TA totals: 15.77 env, 4.74 transport).
_ECOLOGIE_MISSION_SPLIT = {
    "M_ENVIRONMENT": 15.77 / 20.50,
    "M_TRANSPORT": 4.74 / 20.50,
}

_LEGACY_MISSION_TO_APP: Dict[str, Dict[str, float]] = {
    "M_ACTION_EXTERIEURE_ETAT": {"M_DIPLO": 1.0},
    "M_AIDE_PUBLIQUE_AU_DEVELOPPEMENT": {"M_DIPLO": 1.0},
    "M_COHESION_DES_TERRITOIRES": {"M_HOUSING": 1.0},
    "M_DEFENSE": {"M_DEFENSE": 1.0},
    "M_DIRECTION_DE_L_ACTION_DU_GOUVERNEMENT": {"M_ADMIN": 1.0},
    "M_ECOLOGIE": _ECOLOGIE_MISSION_SPLIT,
    "M_ECONOMIE": {"M_ECONOMIC": 1.0},
    "M_ENSEIGNEMENT_SCOLAIRE": {"M_EDU": 1.0},
    "M_GESTION_FINANCES_PUBLIQUES": {"M_ADMIN": 1.0},
    "M_JUSTICE": {"M_JUSTICE": 1.0},
    "M_RECHERCHE_ENSEIGNEMENT_SUPERIEUR": {"M_HIGHER_EDU": 1.0},
    "M_RELATIONS_AVEC_LES_COLLECTIVITES_TERRITORIALES": {"M_TERRITORIES": 1.0},
    "M_SANTE": {"M_HEALTH": 1.0},
    "M_SOLIDARITE": {"M_SOLIDARITY": 1.0},
    "M_SPORT_JEUNESSE_ET_VIE_ASSOCIATIVE": {"M_CULTURE": 1.0},
    "M_TRAVAIL_EMPLOI": {"M_EMPLOYMENT": 1.0},
}


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


class UniqueKeyLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        mapping = set()
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in mapping:
                raise ConstructorError(
                    None, None,
                    f"duplicate key '{key}' found",
                    key_node.start_mark
                )
            mapping.add(key)
        return super().construct_mapping(node, deep)


def _parse_catalog(text: str) -> list[dict]:
    try:
        data = yaml.load(text, Loader=UniqueKeyLoader)
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

        # Check impact consistency
        fixed_impact = item.get("fixed_impact_eur")
        multi_year = item.get("multi_year_impact")
        if isinstance(fixed_impact, (int, float)) and isinstance(multi_year, dict):
            # Handle key as int or string
            impact_2026 = multi_year.get(2026)
            if impact_2026 is None:
                impact_2026 = multi_year.get("2026")
            
            if isinstance(impact_2026, (int, float)):
                diff = abs(fixed_impact - impact_2026)
                # Thresholds: > 100M€ difference AND > 1% relative difference
                # Note: If fixed_impact is 0, we treat any non-zero 2026 impact as infinite relative difference
                if fixed_impact != 0:
                    rel_diff = diff / abs(fixed_impact)
                else:
                    rel_diff = float('inf') if diff > 0 else 0.0
                
                if diff > 100_000_000 and rel_diff > 0.01:
                    errors.append(f"{lever_id}: Impact mismatch (fixed={fixed_impact}, 2026={impact_2026})")

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
    if lever.get("cofog_mapping") or lever.get("mission_mapping") or lever.get("mass_mapping"):
        return "SPENDING"
    if family in {"PENSIONS", "HEALTH", "DEFENSE", "STAFFING", "SUBSIDIES", "PROCUREMENT", "OPERATIONS"}:
        return "SPENDING"

    return "SPENDING"


def _translate_mission_mapping(raw_mapping: dict) -> dict:
    translated: Dict[str, float] = {}
    for key, value in (raw_mapping or {}).items():
        try:
            weight = float(value)
        except Exception:
            continue
        if weight == 0:
            continue
        mission_id = str(key).upper()
        mapped = _LEGACY_MISSION_TO_APP.get(mission_id)
        if mapped:
            for app_id, app_weight in mapped.items():
                translated[app_id] = translated.get(app_id, 0.0) + weight * float(app_weight)
        else:
            translated[mission_id] = translated.get(mission_id, 0.0) + weight
    return translated


def _normalized_lever(lever: dict) -> dict:
    normalized = dict(lever)
    normalized["active"] = lever.get("active", True) is not False
    normalized["cofog_mapping"] = lever.get("cofog_mapping") or lever.get("mass_mapping") or {}
    normalized["mission_mapping"] = _translate_mission_mapping(lever.get("mission_mapping") or {})
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
    Heuristic: check COFOG/mission mappings or family relevance.
    """
    results = []
    mass_id_clean = mass_id.strip()
    is_mission = mass_id_clean.upper().startswith("M_")

    for lever in load_policy_catalog():
        if not _is_active(lever):
            continue
        normalized = _normalized_lever(lever)
        if normalized.get("budget_side") == "REVENUE":
            continue
        cofog_mapping = normalized.get("cofog_mapping") or {}
        mission_mapping = normalized.get("mission_mapping") or {}
        if not mission_mapping and cofog_mapping:
            try:
                from .data_loader import convert_cofog_mapping_to_missions
                mission_mapping = convert_cofog_mapping_to_missions(cofog_mapping)
            except Exception:
                mission_mapping = {}

        # 1. Direct match in mapping
        match = False
        if is_mission:
            mission_id = mass_id_clean.upper()
            if mission_id in {str(k).upper() for k in mission_mapping.keys()}:
                match = True
            else:
                stripped = mission_id.replace("M_", "")
                for k in mission_mapping.keys():
                    key_norm = str(k).upper().replace("M_", "")
                    if stripped == key_norm:
                        match = True
                        break
        else:
            major = mass_id_clean.split(".")[0][:2]
            for k in cofog_mapping.keys():
                if major and (major == str(k).split(".")[0][:2]):
                    match = True
                    break

        # 2. Family match heuristics (optional)
        # e.g. M_HEALTH -> HEALTH family
        family = normalized.get("family", "")
        clean_upper = mass_id_clean.upper()
        if "HEALTH" in clean_upper and family == "HEALTH":
            match = True
        elif "DEFENSE" in clean_upper and family == "DEFENSE":
            match = True
        elif "EDU" in clean_upper and family == "STAFFING":
            match = True

        if match:
            results.append(normalized)

    # Sort by popularity if available, otherwise fixed_impact
    results.sort(key=lambda x: (x.get("popularity") or 0.0), reverse=True)

    return results[:limit]
