"""Scenario DSL flattening helpers for ETL."""

from __future__ import annotations

import json
from typing import Any, Dict, Iterable, Optional

from tools.etl.strings import slugify

_NUMERIC_ACTION_KEYS = ("amount_eur", "delta_pct", "delta_bps")
_DECREASE_OPS = {"decrease", "reduce", "lower"}
_INCREASE_OPS = {"increase", "raise"}
_DISABLE_OPS = {"deactivate", "disable", "off"}


def flatten_scenario(dsl_json: Any, meta: Any) -> Dict[str, Any]:
    """Flatten a scenario DSL payload and vote metadata into wide columns.

    Args:
        dsl_json: Scenario DSL as a dict or JSON string.
        meta: Vote metadata as a dict or JSON string.

    Returns:
        A flattened dictionary suitable for wide-table loading.
    """
    dsl = _coerce_dict(dsl_json)
    meta_obj = _coerce_dict(meta)
    flat: Dict[str, Any] = {}

    baseline_year = _coerce_int(dsl.get("baseline_year"))
    if baseline_year is not None:
        flat["baseline_year"] = baseline_year

    actions = dsl.get("actions") or []
    if isinstance(actions, list):
        _flatten_actions(actions, flat)

    _flatten_meta(meta_obj, flat)

    return flat


def _coerce_dict(payload: Any) -> Dict[str, Any]:
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        try:
            obj = json.loads(payload)
        except json.JSONDecodeError:
            return {}
        if isinstance(obj, dict):
            return obj
    return {}


def _coerce_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _coerce_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _flatten_actions(actions: Iterable[dict], flat: Dict[str, Any]) -> None:
    for action in actions:
        if not isinstance(action, dict):
            continue
        target = str(action.get("target") or "")
        op = str(action.get("op") or "").lower()

        if target.startswith("lever."):
            lever_id = target.split(".", 1)[1]
            key = f"reform_{slugify(lever_id)}"
            value = _action_value(action, op)
            if value is not None:
                flat[key] = value
            continue

        if target.startswith(("mission.", "cofog.")):
            slug = slugify(target)
            _flatten_mass_action(action, op, slug, flat)
            continue

        if target.startswith("tax."):
            slug = slugify(target)
            value = _signed_number(action.get("delta_bps"), op)
            if value is not None:
                flat[f"tax_{slug}_delta_bps"] = value


def _action_value(action: Dict[str, Any], op: str) -> Optional[float]:
    for key in _NUMERIC_ACTION_KEYS:
        if key in action:
            return _signed_number(action.get(key), op)
    if op in _DISABLE_OPS:
        return 0.0
    return 1.0


def _flatten_mass_action(
    action: Dict[str, Any],
    op: str,
    slug: str,
    flat: Dict[str, Any],
) -> None:
    delta_pct = _signed_number(action.get("delta_pct"), op)
    if delta_pct is not None:
        flat[f"mass_{slug}_delta_pct"] = delta_pct

    amount_eur = _signed_number(action.get("amount_eur"), op)
    if amount_eur is not None:
        flat[f"mass_{slug}_amount_eur"] = amount_eur


def _signed_number(value: Any, op: str) -> Optional[float]:
    number = _coerce_float(value)
    if number is None:
        return None
    if op in _DECREASE_OPS:
        return -abs(number)
    if op in _INCREASE_OPS:
        return abs(number)
    return number


def _flatten_meta(meta: Dict[str, Any], flat: Dict[str, Any]) -> None:
    timestamp = _first_number(meta, ("timestamp", "ts", "created_at"))
    if timestamp is not None:
        flat["vote_timestamp"] = timestamp

    respondent_id = _first_text(
        meta,
        ("respondentId", "respondent_id", "participantId", "participant_id"),
    )
    if respondent_id:
        flat["respondent_id"] = respondent_id

    session_duration_sec = _first_number(
        meta,
        (
            "sessionDurationSec",
            "session_duration_sec",
            "durationSec",
            "duration_sec",
            "timeOnPageSec",
            "time_on_page_sec",
        ),
    )
    if session_duration_sec is not None:
        flat["session_duration_sec"] = session_duration_sec

    channel = _first_text(meta, ("channel", "entry_channel", "source"))
    if channel:
        flat["entry_channel"] = channel

    entry_path = _first_text(meta, ("entryPath", "entry_path"))
    if entry_path:
        flat["entry_path"] = entry_path

    snapshot_sha256 = _first_text(
        meta,
        ("finalVoteSnapshotSha256", "final_vote_snapshot_sha256"),
    )
    if snapshot_sha256:
        flat["final_vote_snapshot_sha256"] = snapshot_sha256

    snapshot_version = _first_number(
        meta,
        ("finalVoteSnapshotVersion", "final_vote_snapshot_version"),
    )
    if snapshot_version is not None:
        flat["final_vote_snapshot_version"] = snapshot_version

    snapshot_truncated = _first_bool(
        meta,
        ("finalVoteSnapshotTruncated", "final_vote_snapshot_truncated"),
    )
    if snapshot_truncated is not None:
        flat["final_vote_snapshot_truncated"] = snapshot_truncated

    deficit_path = _extract_path(meta, ("deficit_path", "deficitPath"))
    if deficit_path:
        flat["macro_deficit_final_eur"] = deficit_path[-1]

    debt_path = _extract_path(meta, ("debt_path", "debtPath"))
    if debt_path:
        flat["macro_debt_final_eur"] = debt_path[-1]

    if "macro_deficit_final_eur" not in flat:
        deficit_eur = _first_number(meta, ("deficit_eur", "deficitEur"))
        if deficit_eur is not None:
            flat["macro_deficit_final_eur"] = deficit_eur

    if "macro_debt_final_eur" not in flat:
        debt_eur = _first_number(meta, ("debt_eur", "debtEur"))
        if debt_eur is not None:
            flat["macro_debt_final_eur"] = debt_eur


def _extract_path(meta: Dict[str, Any], keys: Iterable[str]) -> Optional[list]:
    containers = [meta]
    if isinstance(meta.get("accounting"), dict):
        containers.append(meta["accounting"])
    if isinstance(meta.get("macro"), dict):
        containers.append(meta["macro"])

    for container in containers:
        for key in keys:
            value = container.get(key)
            if isinstance(value, list) and value:
                return value
    return None


def _first_number(data: Dict[str, Any], keys: Iterable[str]) -> Optional[float]:
    for key in keys:
        if key in data:
            value = _coerce_float(data.get(key))
            if value is not None:
                return value
    return None


def _first_text(data: Dict[str, Any], keys: Iterable[str]) -> Optional[str]:
    for key in keys:
        if key not in data:
            continue
        value = data.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _first_bool(data: Dict[str, Any], keys: Iterable[str]) -> Optional[bool]:
    for key in keys:
        if key not in data:
            continue
        value = data.get(key)
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            if value == 1:
                return True
            if value == 0:
                return False
        if isinstance(value, str):
            text = value.strip().lower()
            if text in {"true", "1", "yes"}:
                return True
            if text in {"false", "0", "no"}:
                return False
    return None
