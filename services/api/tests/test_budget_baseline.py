from fastapi.testclient import TestClient

from services.api.app import create_app


def test_budget_baseline_2026_query():
    app = create_app()
    client = TestClient(app)

    query = """
      query {
        budgetBaseline2026 {
          missionCode
          missionLabel
          cp2025Eur
          plf2026CeilingEur
          netFiscalSpaceEur
        }
      }
    """

    res = client.post("/graphql", json={"query": query})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js, js.get("errors")
    missions = js["data"]["budgetBaseline2026"]
    assert isinstance(missions, list)
    assert missions, "Expected at least one mission baseline row"
    sample = missions[0]
    assert "missionCode" in sample and sample["missionCode"]
    assert "plf2026CeilingEur" in sample
