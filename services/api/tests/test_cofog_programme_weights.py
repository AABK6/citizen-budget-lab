import json
import os

from services.api.data_loader import allocation_by_cofog, Basis


def _load_mapping() -> dict:
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    path = os.path.join(here, "data", "cofog_mapping.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_programme_weights_sum_to_one_default_and_years():
    js = _load_mapping()
    prog = js.get("programme_to_cofog", {})
    years = js.get("programme_to_cofog_years", {})

    # programme_to_cofog default map
    for pcode, arr in prog.items():
        s = sum(float(e.get("weight", 0.0)) for e in arr)
        assert abs(s - 1.0) < 1e-9, f"Weights must sum to 1 for programme {pcode}"

    # programme_to_cofog_years default and by_year maps
    for pcode, obj in years.items():
        default = obj.get("default") or []
        if default:
            s_def = sum(float(e.get("weight", 0.0)) for e in default)
            assert abs(s_def - 1.0) < 1e-9, f"Default weights must sum to 1 for programme {pcode}"
        by_year = obj.get("by_year") or obj.get("byYear") or {}
        for y, arr in by_year.items():  # noqa: B007  # value used only for message
            s_y = sum(float(e.get("weight", 0.0)) for e in arr)
            assert abs(s_y - 1.0) < 1e-9, f"Year {y} weights must sum to 1 for programme {pcode}"


def test_year_override_affects_major_shares_with_sample_data():
    # In mapping, programme 2041 has a 2026 override: 70% to 05.x, 30% to 04.x
    # Sample CP for 2041 is 12e9 → expect ~3.6e9 showing up under major '04'.
    items = allocation_by_cofog(2026, Basis.CP)
    m = {i.code: i.amount_eur for i in items}
    # Allow some tolerance; other programmes should not contribute to '04' in sample
    assert 3_500_000_000.0 <= m.get("04", 0.0) <= 3_700_000_000.0

