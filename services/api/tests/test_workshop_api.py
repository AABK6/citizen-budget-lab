from fastapi.testclient import TestClient

from services.api.app import create_app


def _gql(client: TestClient, q: str, variables: dict | None = None) -> dict:
    res = client.post("/graphql", json={"query": q, "variables": variables or {}})
    assert res.status_code == 200
    js = res.json()
    assert "errors" not in js, js.get("errors")
    return js["data"]


def test_popular_intents_and_mass_labels():
    app = create_app()
    client = TestClient(app)
    data = _gql(client, "query{ popularIntents(limit:4){ id label massId popularity } massLabels { id displayLabel } }")
    assert len(data["popularIntents"]) <= 4
    assert any(m["id"] == "09" for m in data["massLabels"])  # Education present


def test_suggest_levers_defense_has_relevant_items():
    app = create_app()
    client = TestClient(app)
    data = _gql(client, "query{ suggestLevers(massId:\"02\"){ id family label } }")
    arr = data["suggestLevers"]
    # At least one DEFENSE lever suggested
    assert any(it["family"] == "DEFENSE" for it in arr)


def test_specify_mass_validation_and_apply():
    app = create_app()
    client = TestClient(app)

    # Start from empty DSL (baseline) and set a target for Education (09)
    dsl = "version: 0.1\nbaseline_year: 2026\nassumptions: { horizon_years: 3 }\nactions: []\n"
    import base64

    dsl_b64 = base64.b64encode(dsl.encode("utf-8")).decode("utf-8")

    # 1) Over-allocate: target 1bn, plan 1.2bn → expect error
    q = """
      mutation M($input: SpecifyMassInput!){
        specifyMass(input:$input){ ok errors{ code message pieceId } dsl resolution{ overallPct byMass{ massId targetDeltaEur specifiedDeltaEur } } }
      }
    """
    vars = {
        "input": {
            "dsl": dsl_b64,
            "massId": "09",
            "targetDeltaEur": 1000000000.0,
            "splits": [
                {"pieceId": "ed_schools_staff_ops", "amountEur": 800000000.0},
                {"pieceId": "ed_secondary", "amountEur": 400000000.0},
            ],
        }
    }
    data = _gql(client, q, vars)
    res = data["specifyMass"]
    assert res["ok"] is False
    assert any(e["code"] == "over_allocate" for e in res["errors"])

    # 2) Valid plan: adjust to exactly pending (1.0bn)
    vars["input"]["splits"][1]["amountEur"] = 200000000.0
    data2 = _gql(client, q, vars)
    res2 = data2["specifyMass"]
    assert res2["ok"] is True
    # Education mass specified should now be close to target (pending near 0)
    bm = {e["massId"]: (e["targetDeltaEur"], e["specifiedDeltaEur"]) for e in res2["resolution"]["byMass"]}
    t, s = bm.get("09", (0.0, 0.0))
    assert t >= 1_000_000_000.0 - 1e-6
    assert s >= 1_000_000_000.0 - 1e-6

