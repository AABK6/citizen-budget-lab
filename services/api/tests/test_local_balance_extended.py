import base64

from services.api import schema as gql_schema


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def _gql(q: str, variables: dict | None = None):
    res = gql_schema.schema.execute_sync(q, variable_values=variables or {})
    assert not res.errors, res.errors
    return res.data


def test_local_balance_apuc_final_year_balance():
    # Increase 500m in year 1, offset -500m in year 3 → cumulative zero; last year OK, prior years info
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 3, apu_subsector: APUC }
actions:
  - id: y1_up
    target: cofog.09
    dimension: cp
    op: increase
    amount_eur: 500000000
    recurring: false
  - id: y3_down
    target: cofog.09
    dimension: cp
    op: decrease
    amount_eur: 500000000
    recurring: false
"""
    q = "mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ compliance{ localBalance } } }"
    js = _gql(q, {"dsl": _b64(sdl)})
    lb = js["runScenario"]["compliance"]["localBalance"]
    assert lb[-1] == "ok"
    assert all(x in ("ok", "info") for x in lb[:-1])


def test_local_balance_asso_yearly_balance():
    # For ASSO, enforce yearly balance similar to APUL
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 2, apu_subsector: ASSO }
actions:
  - id: y1_up
    target: cofog.09
    dimension: cp
    op: increase
    amount_eur: 500000000
    recurring: false
"""
    q = "mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ compliance{ localBalance } } }"
    js = _gql(q, {"dsl": _b64(sdl)})
    lb = js["runScenario"]["compliance"]["localBalance"]
    assert lb[0] == "breach"
