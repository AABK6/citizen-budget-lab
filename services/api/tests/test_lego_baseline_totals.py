from fastapi.testclient import TestClient

from services.api.app import create_app


def test_lego_baseline_totals_equal_sum_of_pieces():
    app = create_app()
    client = TestClient(app)

    q = """
      query Q($y:Int!){ legoBaseline(year:$y){ depensesTotal recettesTotal pieces{ type amountEur } } }
    """
    res = client.post("/graphql", json={"query": q, "variables": {"y": 2026}})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js, js.get("errors")
    data = js["data"]["legoBaseline"]
    dep = float(data.get("depensesTotal") or 0.0)
    rev = float(data.get("recettesTotal") or 0.0)
    pieces = data.get("pieces") or []
    dep_sum = sum(float(p.get("amountEur") or 0.0) for p in pieces if p.get("type") == "expenditure")
    rev_sum = sum(float(p.get("amountEur") or 0.0) for p in pieces if p.get("type") == "revenue")
    # Totals should match sums within a small tolerance (allow minimal FP error)
    assert abs(dep - dep_sum) < 1e-3
    assert abs(rev - rev_sum) < 1e-3
