import base64

import pytest
from fastapi.testclient import TestClient

from services.api.app import create_app
from services.api import policy_catalog as pol
from services.api import warehouse_client as wh
from services.api.data_loader import run_scenario


def _encode(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def test_policy_levers_query_stub():
    app = create_app()
    client = TestClient(app)

    q = """
      query Q($fam: PolicyFamilyEnum){
        policyLevers(family: $fam, search: "age"){
          id
          family
          label
          description
          paramsSchema
          feasibility
          conflictsWith
          sources
          massMapping
          missionMapping
        }
      }
    """
    # Filter PENSIONS by search 'age'
    res = client.post("/graphql", json={"query": q, "variables": {"fam": "PENSIONS"}})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js, js.get("errors")
    items = js["data"]["policyLevers"]
    # Our stub includes a pensions lever with label mentioning age
    assert isinstance(items, list)
    assert any(it.get("id") == "pen_age_plus3m_per_year" for it in items)
    pensions = next(it for it in items if it.get("id") == "pen_age_plus3m_per_year")
    mass_map = pensions.get("massMapping") or {}
    assert mass_map
    assert mass_map.get("10", 0) > 0


def test_policy_levers_search_filter():
    app = create_app()
    client = TestClient(app)

    q = """
      query Q($q:String){
        policyLevers(search: $q){ id family label }
      }
    """
    res = client.post("/graphql", json={"query": q, "variables": {"q": "age"}})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js
    arr = js["data"]["policyLevers"]
    assert any(x["id"] == "pen_age_plus3m_per_year" for x in arr)

    res2 = client.post("/graphql", json={"query": q, "variables": {"q": "blanche"}})
    assert res2.status_code == 200
    js2 = res2.json()
    assert "errors" not in js2
    arr2 = js2["data"]["policyLevers"]
    assert any(x["id"] == "annee_blanche_indexation" for x in arr2)


def test_plf2026_lever_reduces_deficit():
    if not wh.warehouse_available():
        pytest.skip("warehouse not available")

    lever_id = "plf2026_mission_justice_efficiency"
    lever = pol.levers_by_id()[lever_id]
    sdl = f"""
version: 0.1
baseline_year: 2026
assumptions: {{ horizon_years: 3 }}
actions:
  - id: {lever_id}
    target: lever.{lever_id}
    op: activate
"""
    _, acc, *_ = run_scenario(_encode(sdl))
    assert acc.deficit_delta_path is not None
    assert acc.deficit_delta_path[0] == pytest.approx(-lever["fixed_impact_eur"], abs=1e-6)
    assert acc.commitments_path is not None
    assert acc.commitments_path[0] == pytest.approx(0.0, abs=1e-6)


def test_revenue_reform_metadata():
    app = create_app()
    client = TestClient(app)

    q = """
      query {
        policyLevers(search: "ISF") {
          id
          vigilancePoints
          authoritativeSources
          targetRevenueCategoryId
        }
      }
    """
    res = client.post("/graphql", json={"query": q})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js
    levers = js["data"]["policyLevers"]
    # We enriched wealth_tax in Phase 1
    wt = next((l for l in levers if l["id"] == "wealth_tax"), None)
    assert wt is not None
    assert wt["targetRevenueCategoryId"] == "rev_property_taxes"
    assert isinstance(wt["vigilancePoints"], list)
    assert len(wt["vigilancePoints"]) > 0


def test_suggest_levers_for_revenue_category():
    app = create_app()
    client = TestClient(app)

    q = """
      query Q($mid: String!){
        suggestLevers(massId: $mid) {
          id
          label
        }
      }
    """
    # rev_vat_standard was mapped to vat_normal_plus1
    res = client.post("/graphql", json={"query": q, "variables": {"mid": "rev_vat_standard"}})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js
    suggestions = js["data"]["suggestLevers"]
    # Currently this will FAIL because suggest_levers_for_mass skips REVENUE
    assert any(s["id"] == "vat_normal_plus1" for s in suggestions)
