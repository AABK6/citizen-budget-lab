import base64
import json
from typing import Any, Dict, List

from fastapi.testclient import TestClient

from services.api.app import create_app
from services.api import schema as gql_schema
from services.api.data_loader import (
    allocation_by_mission,
    allocation_by_cofog,
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
    # Using 2026 sample dataset bundled in data/
    alloc = allocation_by_mission(2026, Basis.CP)
    assert alloc.mission, "Expected non-empty mission allocations"
    # Education (code 150) should be top in sample
    top = alloc.mission[0]
    assert top.code == "150"
    assert top.label.lower().startswith("education")
    assert top.amount_eur > 1e10

    cofog = allocation_by_cofog(2026, Basis.CP)
    assert cofog, "Expected non-empty COFOG allocations"
    # Education maps to COFOG 09 with the largest share in sample
    assert cofog[0].code == "09"
    # Sum should be close to mission total (basic sanity)
    total_mission = sum(m.amount_eur for m in alloc.mission)
    total_cofog = sum(c.amount_eur for c in cofog)
    assert abs(total_mission - total_cofog) / total_mission < 1e-6


def test_procurement_top_suppliers_filters():
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
          compliance { eu3pct eu60pct }
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
    assert len(data["macro"]["deltaGDP"]) == 5
    assert len(data["macro"]["deltaEmployment"]) == 5
    assert len(data["macro"]["deltaDeficit"]) == 5
    assert isinstance(data["macro"]["assumptions"], dict)


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
          amountEur cpv procedureType
        }
      }
    """,
        {"y": 2024, "r": "75", "cpv": "30", "min": 100000},
    )
    assert data["procurement"], "Expected filtered procurement results"

    # sources
    data = gql("""
      query { sources { id datasetName url license refreshCadence vintage } }
    """)
    assert len(data["sources"]) >= 5

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

