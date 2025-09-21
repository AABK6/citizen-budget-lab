import csv
import os

import httpx

from services.api.cache_warm import warm_plf_2026_plafonds


def test_warm_plf_2026_plafonds_uses_sample_when_download_missing(tmp_path, monkeypatch):
    out_csv = tmp_path / "plf_2026_plafonds.csv"

    class _FailingClient:
        def __init__(self, *args, **kwargs):  # noqa: ANN001
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):  # noqa: ANN001
            return False

        def get(self, url):  # noqa: ANN001
            raise httpx.HTTPError("forced failure")

    monkeypatch.setattr("services.api.cache_warm.httpx.Client", _FailingClient)

    path = warm_plf_2026_plafonds(source="https://invalid.local/plf2026.xlsx", output_csv=str(out_csv))
    assert os.path.exists(path)

    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)

    assert rows and set(rows[0].keys()) == {"year", "mission_code", "mission_label", "plf_ceiling_eur", "source"}
    edu = next(r for r in rows if r["mission_code"] == "150")
    assert abs(float(edu["plf_ceiling_eur"]) - 78_500_000_000.0) < 1e-3
