import csv
import os

from services.api.cache_warm import warm_decp_procurement
from services.api.data_loader import procurement_top_suppliers


def test_decp_warmer_rollup_and_dedup(tmp_path):
    # Create a small per-lot CSV with duplicate contract rows and zero amount to trigger quality flag
    in_csv = tmp_path / "decp_input.csv"
    rows = [
        [
            "contract_id",
            "buyer_org_id",
            "supplier_siren",
            "supplier_name",
            "signed_date",
            "amount_eur",
            "cpv_code",
            "procedure_type",
            "lot_count",
            "location_code",
        ],
        ["PC-2024-XYZ", "MIN-TEST", "999999999", "TestCo", "2093-01-10", "100000", "12300000", "Open", "1", "75001"],
        ["PC-2024-XYZ", "MIN-TEST", "999999999", "TestCo", "2093-01-10", "200000", "12300000", "Open", "1", "75001"],
        # zero-amount row should not break and should set quality flag to MISSING
        ["PC-2024-ABC", "MIN-TEST", "888888888", "ZeroCorp", "2093-03-05", "0", "30192000", "Open", "1", "75015"],
    ]
    with open(in_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerows(rows)

    year = 2093
    out = warm_decp_procurement(year, csv_path=str(in_csv))
    assert os.path.exists(out)
    # Aggregated file should contain one row for XYZ with amount 300000 and one for ABC with 0
    with open(out, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        data = list(r)
    # There can be other rows from environment, but ensure our two contracts exist
    m = {d["contract_id"]: d for d in data}
    assert float(m["PC-2024-XYZ"]["amount_eur"]) == 300000.0
    assert int(m["PC-2024-XYZ"]["lot_count"]) >= 2
    assert m["PC-2024-ABC"]["amount_quality"].upper() == "MISSING"

    # Verify API uses cached procurement for supplier aggregation
    items = procurement_top_suppliers(year, region="75")
    # Top supplier should include TestCo with 300000 in region 75
    assert any(i.supplier.siren == "999999999" and abs(i.amount_eur - 300000.0) < 1e-6 for i in items)
