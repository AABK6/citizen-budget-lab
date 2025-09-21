import base64
import json
from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient

from services.api.app import create_app
from services.api import schema as gql_schema
from services.api import warehouse_client as wh
from services.api.data_loader import (
    allocation_by_mission,
    procurement_top_suppliers,
)
from services.api.models import Basis


def test_root_and_health_endpoints():
    app = create_app()
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    js = r.json()
    assert js.get("status") == "ok"
    assert "/graphql" in js.get("message", "")

    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_allocation_by_mission_and_cofog_sample_data():
    if not wh.warehouse_available():
        pytest.skip("warehouse not available")

    loader_alloc = allocation_by_mission(2026, Basis.CP)
    assert loader_alloc.mission, "Expected non-empty mission allocations"
    top = loader_alloc.mission[0]
    assert top.code == "150"
    assert top.label.lower().startswith("education")
    assert top.amount_eur > 1e10

    wh_missions = wh.allocation_by_mission(2026, Basis.CP)
    assert wh_missions, "warehouse mission data missing"
    total_loader = sum(m.amount_eur for m in loader_alloc.mission)
    total_wh = sum(m.amount_eur for m in wh_missions)
    assert abs(total_loader - total_wh) / max(1.0, total_wh) < 1e-6

    wh_cofog = wh.allocation_by_cofog(2026, Basis.CP)
    assert wh_cofog, "warehouse COFOG data missing"
    if wh.cofog_mapping_reliable(2026, Basis.CP):
        total_cofog = sum(c.amount_eur for c in wh_cofog)
        assert abs(total_wh - total_cofog) / max(1.0, total_wh) < 1e-6


def test_procurement_top_suppliers_filters():
    # Ensure test uses sample by removing any warmed 2024 cache
    import os, glob
    from services.api.data_loader import CACHE_DIR as _CACHE_DIR
    for p in glob.glob(os.path.join(_CACHE_DIR, "procurement_contracts_*.csv")):
        try:
            os.remove(p)
        except Exception:
            pass
    # 2024, region starting with 75 matches 4 rows in sample, aggregated by supplier
    items = procurement_top_suppliers(2024, region="75")
    assert items, "Expected some procurement items"
    # Top supplier by amount in sample is NavalGroup (siren 130002785)
    assert items[0].supplier.siren == "130002785"
    assert items[0].amount_eur >= 5_000_000

    # CPV prefix filter (30...) should include La Papeterie (30192000) and exclude others
    items_cpv = procurement_top_suppliers(2024, region="75", cpv_prefix="30")
    assert any(i.supplier.siren == "732829320" for i in items_cpv)
    assert all((i.cpv or "").startswith("30") for i in items_cpv)


def _encode_scenario_yaml(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def test_run_scenario_graphql_smoke():
    # Use Strawberry schema directly without running the server
    sdl = """
version: 0.1
baseline_year: 2026
assumptions:
  horizon_years: 5
actions:
  - id: ed_invest_boost
    target: mission.education
    dimension: cp
    op: increase
    amount_eur: 1000000000
    recurring: true
  - id: ir_cut_T3
    target: tax.ir.bracket_T3
    dimension: tax
    op: rate_change
    delta_bps: -50
"""
    dsl_b64 = _encode_scenario_yaml(sdl)
    query = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) {
          id
          accounting { deficitPath debtPath }
          compliance { eu3pct eu60pct netExpenditure }
          macro { deltaGDP deltaEmployment deltaDeficit assumptions }
        }
      }
    """
    res = gql_schema.schema.execute_sync(query, variable_values={"dsl": dsl_b64})
    assert not res.errors, f"GraphQL runScenario errored: {res.errors}"
    data = res.data["runScenario"]
    assert data["id"]
    # Check shapes/lengths
    assert len(data["accounting"]["deficitPath"]) == 5
    assert len(data["accounting"]["debtPath"]) == 5
    assert len(data["compliance"]["eu3pct"]) == 5
    assert len(data["compliance"]["eu60pct"]) == 5
    assert len(data["compliance"]["netExpenditure"]) == 5
    assert len(data["macro"]["deltaGDP"]) == 5
    assert len(data["macro"]["deltaEmployment"]) == 5
    assert len(data["macro"]["deltaDeficit"]) == 5
    assert isinstance(data["macro"]["assumptions"], dict)


def test_net_expenditure_rule_lights():
    sdl = """
version: 0.1
baseline_year: 2026
assumptions:
  horizon_years: 5
actions:
  - id: ed_invest_boost
    target: mission.education
    dimension: cp
    op: increase
    amount_eur: 1000000000
    recurring: true
"""
    dsl_b64 = _encode_scenario_yaml(sdl)
    query = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { compliance { netExpenditure } }
      }
    """
    res = gql_schema.schema.execute_sync(query, variable_values={"dsl": dsl_b64})
    assert not res.errors
    status = res.data["runScenario"]["compliance"]["netExpenditure"]
    assert len(status) == 5
    assert all(s in ("ok", "breach") for s in status)


def test_graphql_queries_without_network(monkeypatch):
    # Stand up FastAPI+GraphQL and hit /graphql with TestClient
    app = create_app()
    client = TestClient(app)

    def gql(q: str, variables: Dict[str, Any] | None = None) -> Dict[str, Any]:
        resp = client.post("/graphql", json={"query": q, "variables": variables or {}})
        assert resp.status_code == 200
        js = resp.json()
        assert "errors" not in js, f"GraphQL errors: {js.get('errors')}"
        return js["data"]

    # allocation ADMIN lens
    data = gql("""
      query { allocation(year: 2026, basis: CP, lens: ADMIN) { mission { code label amountEur share } } }
    """)
    assert data["allocation"]["mission"]

    # allocation COFOG lens
    data = gql("""
      query { allocation(year: 2026, basis: CP, lens: COFOG) { cofog { code label amountEur share } } }
    """)
    assert data["allocation"]["cofog"]

    # procurement (filters exercise the path)
    data = gql(
        """
      query($y: Int!, $r: String!, $cpv: String, $min: Float) {
        procurement(year: $y, region: $r, cpvPrefix: $cpv, minAmountEur: $min) {
          supplier { siren name }
          amountEur cpv procedureType locationCode sourceUrl
        }
      }
    """,
        {"y": 2024, "r": "75", "cpv": "30", "min": 100000},
    )
    assert data["procurement"], "Expected filtered procurement results"
    # locationCode exposed for map lookup (5-char INSEE commune where available)
    assert all(isinstance(r.get("locationCode"), (str, type(None))) for r in data["procurement"])  # may be empty

    # sources
    data = gql("""
      query { sources { id datasetName url license refreshCadence vintage } }
    """)
    assert len(data["sources"]) >= 5

    # shareCard after a runScenario to ensure DSL store wiring
    run = gql(
        """
      mutation Run($dsl:String!){ runScenario(input:{ dsl:$dsl }){ scenarioId } }
    """,
        {"dsl": _encode_scenario_yaml("version: 0.1\nbaseline_year: 2026\nassumptions: { horizon_years: 1 }\nactions: []\n")},
    )
    sid = run["runScenario"]["scenarioId"]
    card = gql(
        """
      query($id:ID!){ shareCard(scenarioId:$id){ title deficit debtDeltaPct highlight } }
    """,
        {"id": sid},
    )
    assert card["shareCard"]["title"].startswith("Scenario ") or card["shareCard"]["title"]

    # Stub network clients to avoid external calls
    class _Resp:
        def __init__(self, payload: Any):
            self._payload = payload

        def json(self) -> Any:
            return self._payload

        def raise_for_status(self) -> None:  # no-op for test
            return None

    # Patch http_client.get/post used by client modules
    from services.api import http_client as hc

    def fake_post(url: str, headers=None, data=None, auth=None):  # noqa: ANN001
        # Token endpoint returns an access_token
        return _Resp({"access_token": "TEST", "expires_in": 3600})

    def fake_get(url: str, headers=None, params=None):  # noqa: ANN001
        # Return echo of url/params to verify flow
        return _Resp({"url": url, "params": params or {}, "ok": True})

    monkeypatch.setattr(hc, "post", fake_post)
    monkeypatch.setattr(hc, "get", fake_get)

    # Now the official API resolvers should work without real network
    data = gql("""
      query { sirene(siren: "552100554") }
    """)
    assert data["sirene"]["ok"] is True

    data = gql("""
      query { inseeSeries(dataset: "CNA-2014-PIB", series: ["PIB-VALUE"], sinceYear: 2015) }
    """)
    assert data["inseeSeries"]["ok"] is True

    data = gql("""
      query { dataGouvSearch(query: "budget", pageSize: 2) }
    """)
    assert data["dataGouvSearch"]["ok"] is True

    data = gql("""
      query { communes(department: "75") }
    """)
    assert data["communes"]["ok"] is True

    # Singular commune lookup
    data = gql("""
      query { commune(code: "75001") }
    """)
    assert data["commune"]["ok"] is True


def test_run_scenario_id_is_deterministic():
    sdl = """
version: 0.1
baseline_year: 2026
assumptions:
  horizon_years: 5
actions:
  - id: ed_invest_boost
    target: mission.education
    dimension: cp
    op: increase
    amount_eur: 1000000000
    recurring: true
"""
    dsl_b64 = base64.b64encode(sdl.encode("utf-8")).decode("utf-8")
    query = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { id }
      }
    """
    res1 = gql_schema.schema.execute_sync(query, variable_values={"dsl": dsl_b64})
    assert not res1.errors
    id1 = res1.data["runScenario"]["id"]

    # Second identical run â‡’ same ID
    res2 = gql_schema.schema.execute_sync(query, variable_values={"dsl": dsl_b64})
    assert not res2.errors
    id2 = res2.data["runScenario"]["id"]
    assert id1 == id2

    # Modify DSL (amount) â‡’ different ID
    sdl2 = sdl.replace("1000000000", "1000000001")
    dsl_b64_2 = base64.b64encode(sdl2.encode("utf-8")).decode("utf-8")
    res3 = gql_schema.schema.execute_sync(query, variable_values={"dsl": dsl_b64_2})
    assert not res3.errors
    id3 = res3.data["runScenario"]["id"]
    assert id3 != id1
