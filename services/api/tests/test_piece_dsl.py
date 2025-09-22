import base64

import pytest

from services.api import schema as gql_schema


def _stub_baseline(monkeypatch, pieces):
    from services.api import data_loader
    from services.api import warehouse_client as wh

    baseline = {"year": 2026, "pieces": pieces}
    monkeypatch.setattr(wh, "warehouse_available", lambda: True)
    monkeypatch.setattr(wh, "lego_baseline", lambda year: baseline)


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def test_piece_amount_increase_affects_deficit_path(monkeypatch, tmp_path):
    pieces = [
        {"id": "ed_schools_staff_ops", "type": "expenditure", "amount_eur": 10_000_000_000.0, "share": 0.1},
        {"id": "income_tax", "type": "revenue", "amount_eur": 5_000_000_000.0, "share": 0.05},
    ]
    _stub_baseline(monkeypatch, pieces)
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 3 }
actions:
  - id: p1
    target: piece.ed_schools_staff_ops
    op: increase
    amount_eur: 1000000000
    recurring: true
"""
    q = """
      mutation Run($dsl:String!){
        runScenario(input:{ dsl:$dsl }){
          accounting{ deficitPath deficitDeltaPath baselineDeficitPath }
        }
      }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"dsl": _b64(sdl)})
    assert not res.errors
    accounting = res.data["runScenario"]["accounting"]
    delta = accounting["deficitDeltaPath"]
    assert len(delta) == 3
    assert all(v >= 1e9 - 1 for v in delta)


def test_piece_delta_pct_uses_baseline_amount(monkeypatch, tmp_path):
    pieces = [
        {"id": "ed_schools_staff_ops", "type": "expenditure", "amount_eur": 10_000_000_000.0, "share": 0.1}
    ]
    _stub_baseline(monkeypatch, pieces)
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 1 }
actions:
  - id: p1
    target: piece.ed_schools_staff_ops
    op: increase
    delta_pct: 10
"""
    q = """
      mutation Run($dsl:String!){
        runScenario(input:{ dsl:$dsl }){
          accounting{ deficitPath deficitDeltaPath baselineDeficitPath }
        }
      }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"dsl": _b64(sdl)})
    assert not res.errors
    accounting = res.data["runScenario"]["accounting"]
    delta = accounting["deficitDeltaPath"]
    assert abs(delta[0] - 1_000_000_000.0) < 1e-3


def test_run_scenario_without_warehouse_raises(monkeypatch):
    from services.api import data_loader
    from services.api import warehouse_client as wh
    import pytest

    monkeypatch.setattr(wh, "warehouse_available", lambda: False)

    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 1 }
actions: []
"""

    with pytest.raises(RuntimeError):
        data_loader.run_scenario(_b64(sdl))
