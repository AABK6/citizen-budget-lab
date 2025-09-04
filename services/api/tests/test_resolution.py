import base64
import json
from typing import Any, Dict

from services.api import schema as gql_schema
from services.api import data_loader


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def test_resolution_targets_do_not_change_deficit_and_compute_ratio(monkeypatch, tmp_path):
    # Create a small baseline with one expenditure piece amount
    snap = {
        "year": 2026,
        "scope": "S13",
        "country": "FR",
        "pib_eur": 3_000_000_000_000,
        "depenses_total_eur": 0.0,
        "pieces": [
            {"id": "ed_schools_staff_ops", "type": "expenditure", "amount_eur": 10_000_000_000.0, "share": 0.0}
        ],
        "meta": {"source": "test"},
    }
    path = tmp_path / "lego_baseline_2026.json"
    path.write_text(json.dumps(snap), encoding="utf-8")
    monkeypatch.setattr(data_loader, "_lego_baseline_path", lambda year: str(path))

    # DSL: one target-only +10% on the piece (role: target), and an actual change +5%
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 1 }
actions:
  - id: t1
    target: piece.ed_schools_staff_ops
    op: increase
    delta_pct: 10
    role: target
  - id: c1
    target: piece.ed_schools_staff_ops
    op: increase
    delta_pct: 5
"""
    q = """
      mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ accounting{ deficitPath } resolution{ overallPct byMass{ massId targetDeltaEur specifiedDeltaEur } } } }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"dsl": _b64(sdl)})
    assert not res.errors, res.errors
    deficit = res.data["runScenario"]["accounting"]["deficitPath"][0]
    # 5% of 10B = 0.5B
    assert abs(deficit - 500_000_000.0) < 1e-2
    overall = res.data["runScenario"]["resolution"]["overallPct"]
    # specified 5% vs target 10% -> ratio ~0.5
    assert 0.45 <= overall <= 0.55


def test_mass_targets_with_cofog_major(monkeypatch, tmp_path):
    # Build a scenario that sets a mass target via cofog.09 and a smaller specified change.
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 1 }
actions:
  - id: t_mass_09
    target: cofog.09
    op: increase
    amount_eur: 1000000000
    role: target
  - id: c_mass_09
    target: cofog.09
    op: increase
    amount_eur: 200000000
"""
    q = """
      mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ accounting{ deficitPath } resolution{ overallPct byMass{ massId targetDeltaEur specifiedDeltaEur } } } }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"dsl": _b64(sdl)})
    assert not res.errors, res.errors
    # Target 1.0B, specified 0.2B -> overall ~0.2
    overall = res.data["runScenario"]["resolution"]["overallPct"]
    assert 0.15 <= overall <= 0.25
    # Deficit reflects only the specified change (0.2B)
    deficit = res.data["runScenario"]["accounting"]["deficitPath"][0]
    assert abs(deficit - 200_000_000.0) < 1e-2
