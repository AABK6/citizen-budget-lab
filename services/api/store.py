from __future__ import annotations

"""Scenario store with lightweight file persistence.

scenario_store: id -> { title, description }
scenario_dsl_store: id -> canonical YAML (string) used to compute scenario id
"""

import json
import os
from typing import Dict

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "cache"))
META_PATH = os.path.join(DATA_DIR, "scenarios_meta.json")

VOTES_PATH = os.path.join(DATA_DIR, "votes.json")

scenario_store: Dict[str, Dict[str, str]] = {}
scenario_dsl_store: Dict[str, str] = {}
votes_store: list[Dict] = []


def _ensure_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def _load() -> None:
    global scenario_store, scenario_dsl_store, votes_store
    _ensure_dir()
    try:
        if os.path.exists(META_PATH):
            with open(META_PATH, "r", encoding="utf-8") as f:
                obj = json.load(f)
                if isinstance(obj, dict):
                    scenario_store = {
                        str(k): {"title": str(v.get("title") or ""), "description": str(v.get("description") or "")}
                        for k, v in obj.items()
                        if isinstance(v, dict)
                    }
    except Exception:
        scenario_store = {}
    try:
        if os.path.exists(DSL_PATH):
            with open(DSL_PATH, "r", encoding="utf-8") as f:
                obj = json.load(f)
                if isinstance(obj, dict):
                    scenario_dsl_store = {str(k): str(v) for k, v in obj.items() if isinstance(v, str)}
    except Exception:
        scenario_dsl_store = {}
    try:
        if os.path.exists(VOTES_PATH):
            with open(VOTES_PATH, "r", encoding="utf-8") as f:
                obj = json.load(f)
                if isinstance(obj, list):
                    votes_store = obj
                else:
                    votes_store = []
    except Exception:
        votes_store = []


def _save() -> None:
    _ensure_dir()
    try:
        with open(META_PATH, "w", encoding="utf-8") as f:
            json.dump(scenario_store, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    try:
        with open(DSL_PATH, "w", encoding="utf-8") as f:
            json.dump(scenario_dsl_store, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    try:
        with open(VOTES_PATH, "w", encoding="utf-8") as f:
            json.dump(votes_store, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def set_meta(sid: str, title: str | None = None, description: str | None = None) -> None:
    scenario_store[sid] = {"title": title or "", "description": description or ""}
    _save()


def set_dsl(sid: str, dsl_b64: str) -> None:
    scenario_dsl_store[sid] = dsl_b64
    _save()


def add_vote(sid: str, meta: Dict) -> None:
    votes_store.append({
        "scenarioId": sid,
        "timestamp": meta.get("timestamp"),
        "meta": meta
    })
    _save()


def delete(sid: str) -> bool:
    removed = False
    if sid in scenario_store:
        del scenario_store[sid]
        removed = True
    if sid in scenario_dsl_store:
        del scenario_dsl_store[sid]
        removed = True
    if removed:
        _save()
    return removed


# Load on import
_load()
