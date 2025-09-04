from services.api.app import create_app
from fastapi.testclient import TestClient


def test_policy_levers_query_stub():
    app = create_app()
    client = TestClient(app)

    q = """
      query Q($fam: PolicyFamilyEnum){
        policyLevers(family: $fam, search: "age"){
          id family label description paramsSchema feasibility conflictsWith sources
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

