import base64
import json
import os
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from services.api.app import create_app
from services.api.cache_warm import warm_lego_baseline
from services.api.data_loader import (
    lego_pieces_with_baseline,
    load_lego_baseline,
)


def _patch_warehouse_baseline(monkeypatch, baseline):
    from services.api import warehouse_client as wh

    monkeypatch.setattr(wh, "warehouse_available", lambda: True)
    monkeypatch.setattr(wh, "lego_baseline", lambda year: baseline)


def test_warm_lego_baseline_expenditures_monkeypatched(monkeypatch, tmp_path):
    """Warmer should aggregate some expenditure pieces and write snapshot JSON.

    We monkeypatch eurostat client to avoid network and force deterministic values.
    """

    # Monkeypatch Eurostat fetch to return a dummy JSON (unused by our value_at stub)
    from services.api.clients import eurostat as eu

    monkeypatch.setattr(
        eu,
        "fetch",
        lambda dataset, params: {"dimension": {"id": ["unit", "geo", "sector", "na_item", "cofog99", "time"]}},
    )

    # Monkeypatch value_at to return amounts (MIO_EUR) for known COFOG codes
    def fake_value_at(js: Dict[str, Any], coords: Dict[str, str]) -> float:  # noqa: ANN001
        cof = coords.get("cofog99") or ""
        nai = coords.get("na_item") or ""
        # Return non-zero for a couple of expected mappings: GF091 (education 09.1), GF073 (health 07.3)
        if cof == "GF091" and nai == "D.1":
            return 100.0  # 100 MIO_EUR
        if cof == "GF073" and nai in ("D.1", "P.2"):
            return 50.0
        return 0.0

    monkeypatch.setattr(eu, "value_at", fake_value_at)

    # Run warmer for a synthetic year
    year = 2097
    out_path = warm_lego_baseline(year, country="FR", scope="S13")
    assert os.path.exists(out_path)
    with open(out_path, "r", encoding="utf-8") as f:
        js = json.load(f)
    assert js["year"] == year
    assert js["depenses_total_eur"] >= 0.0
    # Expect at least one piece to have non-zero amount (education schools or hospitals)
    has_non_zero = any(
        (p.get("type") == "expenditure" and isinstance(p.get("amount_eur"), (int, float)) and p.get("amount_eur", 0.0) > 0)
        for p in js.get("pieces", [])
    )
    assert has_non_zero


def test_warm_lego_baseline_strict_official_blocks_proxy_and_fallback(monkeypatch):
    from services.api.clients import eurostat as eu

    monkeypatch.setenv("STRICT_OFFICIAL", "1")
    monkeypatch.setattr(eu, "fetch", lambda dataset, params: {})
    monkeypatch.setattr(eu, "sdmx_value", lambda flow, key, time=None: None)

    with pytest.raises(RuntimeError, match="STRICT_OFFICIAL=1"):
        warm_lego_baseline(2093, country="FR", scope="S13")


def test_warm_lego_baseline_non_strict_allows_temporal_fallback(monkeypatch):
    from services.api.clients import eurostat as eu

    monkeypatch.setenv("STRICT_OFFICIAL", "0")
    monkeypatch.setattr(eu, "fetch", lambda dataset, params: {})
    monkeypatch.setattr(eu, "sdmx_value", lambda flow, key, time=None: None)

    year = 2092
    out_path = warm_lego_baseline(year, country="FR", scope="S13")
    assert os.path.exists(out_path)
    meta_path = out_path.replace(".json", ".meta.json")
    if os.path.exists(out_path):
        os.remove(out_path)
    if os.path.exists(meta_path):
        os.remove(meta_path)


def test_lego_pieces_with_baseline_reads_snapshot(monkeypatch):
    year = 2096
    baseline = {
        "year": year,
        "pieces": [
            {"id": "ed_schools_staff_ops", "type": "expenditure", "amount_eur": 60.0, "share": 0.6},
            {"id": "debt_interest", "type": "expenditure", "amount_eur": 40.0, "share": 0.4},
        ],
    }
    _patch_warehouse_baseline(monkeypatch, baseline)

    items = lego_pieces_with_baseline(year)
    # Should include config piece ids and merge amounts/shares for those present
    found = {i["id"]: i for i in items}
    assert "ed_schools_staff_ops" in found
    assert isinstance(found["ed_schools_staff_ops"].get("amount_eur"), (int, float))


def test_graphql_lego_queries_smoke(monkeypatch):
    app = create_app()
    client = TestClient(app)

    year = 2095
    baseline = {
        "year": year,
        "pieces": [
            {"id": "ed_schools_staff_ops", "type": "expenditure", "label": "Schools", "amount_eur": 60.0, "share": 0.6},
            {"id": "income_tax", "type": "revenue", "label": "IR", "amount_eur": 123.0, "share": 0.4},
        ],
    }
    _patch_warehouse_baseline(monkeypatch, baseline)

    def gql(q: str, variables: Dict[str, Any] | None = None) -> Dict[str, Any]:
        r = client.post("/graphql", json={"query": q, "variables": variables or {}})
        assert r.status_code == 200
        js = r.json()
        assert "errors" not in js, js.get("errors")
        return js["data"]

    data = gql("""
      query($y:Int!){ legoPieces(year:$y){ id label type amountEur share missions{ code weight } beneficiaries examples sources } }
    """, {"y": year})
    assert data["legoPieces"] and isinstance(data["legoPieces"], list)

    data = gql("""
      query($y:Int!){ legoBaseline(year:$y){ year scope pib depensesTotal recettesTotal pieces{ id type amountEur share } } }
    """, {"y": year})
    assert data["legoBaseline"]["year"] == year
    assert data["legoBaseline"]["recettesTotal"] == 123.0

    # Distance with a simple piece delta (will be 0 with empty baseline)
    dsl = base64.b64encode("""
version: 0.1
baseline_year: 2095
assumptions: { horizon_years: 1 }
actions:
  - id: t1
    target: piece.ed_schools_staff_ops
    op: increase
    amount_eur: 1000
""".encode("utf-8")).decode("utf-8")
    data = gql("""
      query($y:Int!,$dsl:String!){ legoDistance(year:$y, dsl:$dsl){ score byPiece{ id shareDelta } } }
    """, {"y": year, "dsl": dsl})
    assert "score" in data["legoDistance"]


def test_lego_queries_absent_snapshot(monkeypatch):
    """When the snapshot is absent, legoBaseline should fallback gracefully and legoPieces should still return config ids.
    """
    from services.api import warehouse_client as wh
    from services.api.app import create_app
    from fastapi.testclient import TestClient

    monkeypatch.setattr(wh, "warehouse_available", lambda: False)
    monkeypatch.setattr(wh, "lego_baseline", lambda year: None)

    app = create_app()
    client = TestClient(app)

    year = 2094

    def gql(q: str, variables: Dict[str, Any] | None = None) -> Dict[str, Any]:
        r = client.post("/graphql", json={"query": q, "variables": variables or {}})
        assert r.status_code == 200
        js = r.json()
        assert "errors" not in js, js.get("errors")
        return js["data"]

    data = gql("""
      query($y:Int!){ legoBaseline(year:$y){ year scope pib depensesTotal recettesTotal pieces{ id } } }
    """, {"y": year})
    assert data["legoBaseline"]["year"] == year
    assert data["legoBaseline"]["depensesTotal"] >= 0.0
    assert isinstance(data["legoBaseline"]["pieces"], list)

    data2 = gql("""
      query($y:Int!){ legoPieces(year:$y){ id type amountEur share missions{ code weight } } }
    """, {"y": year})
    assert isinstance(data2["legoPieces"], list)
    assert any(isinstance(ent.get("id"), str) for ent in data2["legoPieces"])
