import base64
from typing import Any, Dict

import pytest

from services.api import schema as gql_schema
from services.api import data_loader as dl


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def _exec_gql(query: str, variables: Dict[str, Any]) -> Any:
    return gql_schema.schema.execute_sync(query, variable_values=variables)


def test_runscenario_unknown_piece_rejected():
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 3 }
actions:
  - id: bad1
    target: piece.not_a_piece
    op: increase
    amount_eur: 1000
"""
    q = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { id }
      }
    """
    res = _exec_gql(q, {"dsl": _b64(sdl)})
    assert res.errors, "Expected error for unknown piece id"
    assert any("Unknown LEGO piece id" in str(e) for e in res.errors)


def test_runscenario_locked_piece_rejected():
    # debt_interest is locked_default: true in lego_pieces.json
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 2 }
actions:
  - id: lock1
    target: piece.debt_interest
    op: decrease
    amount_eur: 1000000
"""
    q = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { id }
      }
    """
    res = _exec_gql(q, {"dsl": _b64(sdl)})
    assert res.errors, "Expected error for locked piece"
    assert any("locked" in str(e).lower() for e in res.errors)


def test_runscenario_bounds_pct_enforced(monkeypatch):
    # Inject bounds on a known piece via monkeypatch on load_lego_config
    base_cfg = dl.load_lego_config()
    # Ensure the piece exists in config
    assert any(p.get("id") == "ed_schools_staff_ops" for p in base_cfg.get("pieces", []))

    def fake_load_cfg():  # noqa: ANN202
        cfg = {k: v for k, v in base_cfg.items()}
        pcs = []
        for p in base_cfg.get("pieces", []):
            if p.get("id") == "ed_schools_staff_ops":
                # ±5% bounds
                pol = dict(p.get("policy") or {})
                pol["bounds_pct"] = {"min": -5, "max": 5}
                p = {**p, "policy": pol}
            pcs.append(p)
        cfg["pieces"] = pcs
        return cfg

    monkeypatch.setattr(dl, "load_lego_config", fake_load_cfg)

    # Exceed bounds with +10%
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 1 }
actions:
  - id: t1
    target: piece.ed_schools_staff_ops
    op: increase
    delta_pct: 10
"""
    q = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { id }
      }
    """
    res = _exec_gql(q, {"dsl": _b64(sdl)})
    assert res.errors, "Expected error for bounds violation"
    assert any("percent" in str(e).lower() or "bound" in str(e).lower() for e in res.errors)

