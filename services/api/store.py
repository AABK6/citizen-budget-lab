from __future__ import annotations

"""Simple in-memory stores (placeholder until DB).

scenario_store: id -> { title, description }
scenario_dsl_store: id -> canonical YAML (string) used to compute scenario id
"""

scenario_store: dict[str, dict[str, str]] = {}
scenario_dsl_store: dict[str, str] = {}

