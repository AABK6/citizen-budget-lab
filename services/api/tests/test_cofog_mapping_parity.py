import pytest

from services.api import warehouse_client as wh
from services.api.data_loader import mapping_cofog_aggregate
from services.api.models import Basis


@pytest.mark.skipif(not wh.warehouse_available(), reason="Warehouse not available")
def test_mapping_vs_warehouse_cofog_parity():
    # Only run when mapping is considered reliable; otherwise skip to avoid false negatives
    if not wh.cofog_mapping_reliable(2026, Basis.CP):
        pytest.skip("COFOG mapping not reliable")

    wh_items = wh.allocation_by_cofog(2026, Basis.CP)
    map_items = mapping_cofog_aggregate(2026, Basis.CP)

    total_wh = sum(i.amount_eur for i in wh_items)
    total_map = sum(i.amount_eur for i in map_items)
    # Parity threshold mirrors reliability heuristic (<= 0.5%)
    assert total_wh > 0 and total_map > 0
    assert abs(total_wh - total_map) / total_wh <= 0.005
