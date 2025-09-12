import os

import pytest
from fastapi.testclient import TestClient

from services.api.app import create_app
from services.api import warehouse_client as wh


@pytest.mark.skipif(not wh.warehouse_available(), reason="Warehouse not available")
def test_admin_vs_cofog_totals_match_when_warehouse_enabled():
    app = create_app()
    client = TestClient(app)

    q_admin = """
      query { allocation(year: 2026, basis: CP, lens: ADMIN) { mission { amountEur } } }
    """
    q_cofog = """
      query { allocation(year: 2026, basis: CP, lens: COFOG) { cofog { amountEur } } }
    """

    r1 = client.post("/graphql", json={"query": q_admin})
    assert r1.status_code == 200
    js1 = r1.json()
    assert "errors" not in js1, js1.get("errors")
    total_admin = sum(float(m.get("amountEur", 0.0)) for m in js1["data"]["allocation"]["mission"])  # type: ignore

    r2 = client.post("/graphql", json={"query": q_cofog})
    assert r2.status_code == 200
    js2 = r2.json()
    assert "errors" not in js2, js2.get("errors")
    total_cofog = sum(float(m.get("amountEur", 0.0)) for m in js2["data"]["allocation"]["cofog"])  # type: ignore

    # Totals should match within tight tolerance when warehouse is used for both
    assert abs(total_admin - total_cofog) / max(1.0, total_admin) < 1e-9

