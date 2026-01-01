import json
import os
from typing import List

import pytest

from services.api.cache_warm import warm_eurostat_cofog, warm_lego_baseline, warm_plf_state_budget


def _network_ready() -> bool:
    flag = os.getenv("RUN_NETWORK_TESTS")
    if flag is None:
        return False
    return flag in ("1", "true", "True")


@pytest.mark.network
def test_eurostat_cofog_shares_multiple_years(tmp_path):
    if not _network_ready():
        pytest.skip("RUN_NETWORK_TESTS not set")
    years_env = os.getenv("EU_TEST_YEARS")
    years: List[int] = [int(y) for y in years_env.split(",")] if years_env else [2026]
    for y in years:
        path = warm_eurostat_cofog(y, ["FR"])  # writes data/cache/eu_cofog_shares_{y}.json
        assert os.path.exists(path)
        with open(path, "r", encoding="utf-8") as f:
            js = json.load(f)
        arr = js.get("FR") or []
        assert arr, f"Expected shares for FR in {y}"
        s = sum(float(e.get("share") or 0.0) for e in arr)
        assert 0.95 <= s <= 1.05, f"Shares should sum ~1.0, got {s} for {y}"


@pytest.mark.network
def test_lego_baseline_realdata(tmp_path):
    if not _network_ready():
        pytest.skip("RUN_NETWORK_TESTS not set")
    # Use a recent year; adjust if upstream publishes different ranges
    year = int(os.getenv("TEST_LEGO_YEAR", "2026"))
    path = warm_lego_baseline(year, country="FR", scope="S13")
    assert os.path.exists(path)
    with open(path, "r", encoding="utf-8") as f:
        js = json.load(f)
    assert js.get("year") == year
    dep = float(js.get("depenses_total_eur") or 0.0)
    # Expect at least a non-zero expenditures total
    assert dep > 0.0
    pieces = js.get("pieces") or []
    assert pieces, "Expected non-empty LEGO pieces in baseline"
    non_zero = sum(1 for p in pieces if isinstance(p.get("amount_eur"), (int, float)) and float(p.get("amount_eur") or 0.0) > 0.0)
    assert non_zero >= 5, f"Expected at least 5 pieces with amounts, got {non_zero}"


@pytest.mark.network
def test_plf_mission_snapshot_optional(monkeypatch, tmp_path):
    if not _network_ready():
        pytest.skip("RUN_NETWORK_TESTS not set")
    # Allow configuring dataset/year via env to avoid hardcoding brittle ids
    base = os.getenv("ODS_BASE", "https://data.economie.gouv.fr")
    dataset = os.getenv("ODS_TEST_DATASET")
    year = os.getenv("ODS_TEST_YEAR")
    if not dataset or not year:
        from services.api.cache_warm import warm_plf_2026_plafonds

        path = warm_plf_2026_plafonds(output_csv=os.path.join(tmp_path, "plf_2026_plafonds.csv"))
        assert os.path.exists(path)
        with open(path, "r", encoding="utf-8") as f:
            head = f.readline().strip().split(",")
        assert head[:3] == ["year", "mission_code", "mission_label"]
    else:
        path = warm_plf_state_budget(base, dataset, int(year))
        assert os.path.exists(path)
        # Basic CSV shape check
        with open(path, "r", encoding="utf-8") as f:
            head = f.readline().strip().split(",")
        assert head[:3] == ["year", "mission_code", "mission_label"]
