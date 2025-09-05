import base64
import json
import os

from services.api import schema as gql_schema


def _gql(q: str, variables: dict | None = None):
    res = gql_schema.schema.execute_sync(q, variable_values=variables or {})
    if res.errors:
        raise AssertionError(res.errors)
    return res.data


def test_allocation_cofog_prefers_warmed_shares(tmp_path, monkeypatch):
    # Prepare warmed COFOG shares file with a distinct top code (e.g., '05' biggest)
    cache_dir = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")), "data", "cache")
    os.makedirs(cache_dir, exist_ok=True)
    shares_path = os.path.join(cache_dir, "eu_cofog_shares_2026.json")
    with open(shares_path, "w", encoding="utf-8") as f:
        json.dump({
            "FR": [
                {"code": "05", "label": "Environment", "share": 0.5},
                {"code": "09", "label": "Education", "share": 0.1},
                {"code": "02", "label": "Defense", "share": 0.1},
                {"code": "03", "label": "Public order", "share": 0.1},
                {"code": "07", "label": "Health", "share": 0.2}
            ]
        }, f)

    q = """
      query { allocation(year: 2026, basis: CP, lens: COFOG) { cofog { code label share } } }
    """
    data = _gql(q)
    cofog = data["allocation"]["cofog"]
    assert cofog[0]["code"] == "05"  # warmed file top share

    # Cleanup: remove warmed file and ensure fallback mapping yields Education ('09') as top
    os.remove(shares_path)
    data2 = _gql(q)
    cofog2 = data2["allocation"]["cofog"]
    assert cofog2[0]["code"] == "09"


def test_macro_series_present_absent(monkeypatch):
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    cache_dir = os.path.join(here, "data", "cache")
    path = os.path.join(cache_dir, "macro_series_FR.json")
    if os.path.exists(path):
        os.remove(path)
    q = "query { macroSeries(country: \"FR\") }"
    data = _gql(q)
    assert data["macroSeries"] == {}
    # Write minimal file and verify it is returned
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"country": "FR", "items": [{"id": "gdp", "dataset": "CNA", "series": ["PIB"], "data": {}}]}, f)
    data2 = _gql(q)
    assert data2["macroSeries"]["country"] == "FR"


def test_procurement_uses_warmed_when_present(monkeypatch):
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    cache_dir = os.path.join(here, "data", "cache")
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, "procurement_contracts_2025.csv")
    # Create a tiny warmed CSV with a dominant supplier in region 75
    with open(path, "w", encoding="utf-8") as f:
        f.write("year,contract_id,buyer_org_id,supplier_siren,supplier_name,signed_date,amount_eur,cpv_code,procedure_type,lot_count,location_code,amount_quality,supplier_naf,supplier_company_size\n")
        f.write("2025,C001,BO1,999999999,TopCo,2025-03-01,123456789,30192000,open,2,75001,OK,,\n")
        f.write("2025,C002,BO2,111111111,Other,2025-04-01,1000,30192000,open,1,75002,OK,,\n")
    q = """
      query { procurement(year: 2025, region: \"75\") { supplier { siren name } amountEur } }
    """
    data = _gql(q)
    assert data["procurement"][0]["supplier"]["siren"] == "999999999"
