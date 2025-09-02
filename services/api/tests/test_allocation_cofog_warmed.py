import json
import os

from services.api import schema as gql_schema


def test_graphql_allocation_cofog_uses_warmed(monkeypatch):
    # Write warmed COFOG shares and LEGO baseline
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    cache_dir = os.path.join(here, "data", "cache")
    os.makedirs(cache_dir, exist_ok=True)
    year = 2094
    shares = {
        "FR": [
            {"code": "09", "label": "Education", "share": 0.2},
            {"code": "07", "label": "Health", "share": 0.25},
            {"code": "10", "label": "Social", "share": 0.35},
            {"code": "02", "label": "Defense", "share": 0.05},
            {"code": "04", "label": "Economic", "share": 0.15},
        ]
    }
    with open(os.path.join(cache_dir, f"eu_cofog_shares_{year}.json"), "w", encoding="utf-8") as f:
        json.dump(shares, f)
    baseline = {
        "year": year,
        "scope": "S13",
        "depenses_total_eur": 1000.0,
        "pieces": [],
    }
    with open(os.path.join(cache_dir, f"lego_baseline_{year}.json"), "w", encoding="utf-8") as f:
        json.dump(baseline, f)

    # Query via GraphQL
    q = """
      query($y:Int!){ allocation(year:$y, basis: CP, lens: COFOG){ cofog{ code label amountEur share } } }
    """
    res = gql_schema.schema.execute_sync(q, variable_values={"y": year})
    assert not res.errors
    items = res.data["allocation"]["cofog"]
    # Check that amounts reflect shares * total (1000)
    m = {i["code"]: (i["amountEur"], i["share"]) for i in items}
    assert abs(m["10"][0] - 350.0) < 1e-6
    assert abs(m["02"][1] - 0.05) < 1e-9

