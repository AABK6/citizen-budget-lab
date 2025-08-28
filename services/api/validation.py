from __future__ import annotations

import json
import os
from typing import Any, Dict

from jsonschema import Draft202012Validator


SCHEMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "schemas", "scenario.schema.json"))


def _load_schema() -> Dict[str, Any]:
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


_SCHEMA = _load_schema()
_VALIDATOR = Draft202012Validator(_SCHEMA)


def validate_scenario(obj: Dict[str, Any]) -> None:
    errors = sorted(_VALIDATOR.iter_errors(obj), key=lambda e: e.path)
    if errors:
        msgs = [f"{list(e.path)}: {e.message}" for e in errors]
        raise ValueError("Scenario validation failed: " + "; ".join(msgs))

