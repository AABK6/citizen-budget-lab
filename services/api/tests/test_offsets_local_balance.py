import base64
from typing import Any, Dict

from services.api import schema as gql_schema


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def _exec_gql(query: str, variables: Dict[str, Any]) -> Any:
    return gql_schema.schema.execute_sync(query, variable_values=variables)


def test_offsets_pool_balances_deficit():
    # Increase spending by 1bn recurring, then offset via spending pool by 1bn recurring
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
offsets:
  - id: off1
    pool: spending
    amount_eur: 1000000000
    recurring: true
"""
    q = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { accounting { deficitPath } }
      }
    """
    res = _exec_gql(q, {"dsl": _b64(sdl)})
    assert not res.errors, res.errors
    path = res.data["runScenario"]["accounting"]["deficitPath"]
    # All years should be ~0 after offset
    assert all(abs(v) < 1e-6 for v in path)


def test_local_balance_apul_breach_and_ok():
    # APUL scenario must be balanced per year, else 'breach'; adding matching offset results in 'ok'
    sdl_breach = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 2, apu_subsector: APUL }
actions:
  - id: p1
    target: piece.ed_schools_staff_ops
    op: increase
    amount_eur: 500000000
    recurring: false
"""
    q = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { compliance { localBalance } }
      }
    """
    res = _exec_gql(q, {"dsl": _b64(sdl_breach)})
    assert not res.errors, res.errors
    lb = res.data["runScenario"]["compliance"]["localBalance"]
    assert lb[0] == "breach"

    sdl_ok = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 2, apu_subsector: APUL }
actions:
  - id: p1
    target: piece.ed_schools_staff_ops
    op: increase
    amount_eur: 500000000
    recurring: false
offsets:
  - id: off1
    pool: spending
    amount_eur: 500000000
    recurring: false
"""
    res2 = _exec_gql(q, {"dsl": _b64(sdl_ok)})
    assert not res2.errors, res2.errors
    lb2 = res2.data["runScenario"]["compliance"]["localBalance"]
    assert lb2[0] == "ok"

