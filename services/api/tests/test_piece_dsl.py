import base64

from services.api import schema as gql_schema


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def test_piece_amount_increase_affects_deficit_path(tmp_path):
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
      mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ accounting{ deficitPath } } }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"dsl": _b64(sdl)})
    assert not res.errors
    path = res.data["runScenario"]["accounting"]["deficitPath"]
    assert len(path) == 3
    assert all(v >= 1e9 - 1 for v in path)


def test_piece_delta_pct_uses_baseline_amount(monkeypatch, tmp_path):
    import json
    from services.api import data_loader

    # Redirect baseline path to a temp file so we don't clobber real warmed data
    path = tmp_path / "lego_baseline_2026.json"
    monkeypatch.setattr(data_loader, "_lego_baseline_path", lambda year: str(path))

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
    path.write_text(json.dumps(snap), encoding="utf-8")

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
      mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ accounting{ deficitPath } } }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"dsl": _b64(sdl)})
    assert not res.errors
    path = res.data["runScenario"]["accounting"]["deficitPath"]
    assert abs(path[0] - 1_000_000_000.0) < 1e-3
