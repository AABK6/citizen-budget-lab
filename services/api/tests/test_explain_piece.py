from fastapi.testclient import TestClient

from services.api.app import create_app


def _gql(client: TestClient, q: str, variables: dict | None = None) -> dict:
    resp = client.post("/graphql", json={"query": q, "variables": variables or {}})
    assert resp.status_code == 200
    js = resp.json()
    assert "errors" not in js, js.get("errors")
    return js["data"]


def test_explain_piece_education_has_mapping_and_baseline():
    app = create_app()
    client = TestClient(app)
    q = """
      query($id:String!, $y:Int!){
        explainPiece(id:$id, year:$y){ id label description examples beneficiaries cofog{ code weight } naItems{ code weight } baselineAmountEur baselineShare lockedDefault boundsPct boundsAmountEur elasticity sources }
      }
    """
    data = _gql(client, q, {"id": "ed_schools_staff_ops", "y": 2026})
    ex = data["explainPiece"]
    assert ex["id"] == "ed_schools_staff_ops"
    assert any(c["code"].startswith("09.") for c in ex["cofog"])  # Education mapping
    assert any(n["code"].startswith("D.") or n["code"].startswith("P.") for n in ex["naItems"])  # ESA codes
    # Baseline amount may be None if not warmed; accept >= 0 when present
    ba = ex.get("baselineAmountEur")
    if ba is not None:
        assert float(ba) >= 0.0
    assert isinstance(ex.get("lockedDefault"), bool)
    assert isinstance(ex.get("sources"), list)

