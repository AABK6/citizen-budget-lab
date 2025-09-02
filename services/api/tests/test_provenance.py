import json
import os

from services.api.cache_warm import warm_plf_state_budget


def test_plf_warmer_writes_sidecar(monkeypatch):
    # Minimal monkeypatch to avoid network; reuse existing fallback path in tests
    from services.api.tests.test_cache_warm import _meta_fields, _rows_raw  # type: ignore
    from services.api.clients import ods as o

    year = 2097
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    cache_dir = os.path.join(here, "data", "cache")
    os.makedirs(cache_dir, exist_ok=True)
    out_csv = os.path.join(cache_dir, f"state_budget_mission_{year}.csv")
    sidecar = out_csv.replace('.csv', '.meta.json')
    if os.path.exists(out_csv):
        os.remove(out_csv)
    if os.path.exists(sidecar):
        os.remove(sidecar)

    monkeypatch.setattr(o, "dataset_info", lambda base, dataset: _meta_fields())

    def fake_records(base, dataset, select=None, where=None, group_by=None, order_by=None, limit=10, offset=0):  # noqa: ANN001
        if group_by:
            return {"results": []}
        return {"results": [{"record": r} for r in _rows_raw(year)]}

    monkeypatch.setattr(o, "records", fake_records)

    path = warm_plf_state_budget("https://example", "plf25", year)
    assert path == out_csv
    assert os.path.exists(out_csv)
    assert os.path.exists(sidecar), "Expected sidecar metadata JSON"
    with open(sidecar, "r", encoding="utf-8") as f:
        js = json.load(f)
    assert js.get("dataset") == "plf25"
    assert js.get("year") == year
    assert js.get("extraction_ts")
    # Cleanup
    os.remove(out_csv)
    os.remove(sidecar)

