import json
import os

from services.api.cache_warm import warm_macro_insee


def test_macro_insee_warmer_monkeypatched(monkeypatch, tmp_path):
    # Fake BDM response
    from services.api.clients import insee as insee_client

    def fake_bdm(dataset, series_ids, since_period=None):  # noqa: ANN001
        return {"dataset": dataset, "series": series_ids, "ok": True}

    monkeypatch.setattr(insee_client, "bdm_series", fake_bdm)

    # Write a small config
    cfg = tmp_path / "cfg.json"
    cfg.write_text(json.dumps({
        "country": "FR",
        "items": [
            {"id": "deflator_gdp", "dataset": "CNA-2014-PIB", "series": ["PIB-VALUE"]},
            {"id": "employment_total", "dataset": "EST-EMP", "series": ["EMP-TOTAL"]},
        ]
    }), encoding="utf-8")

    out = warm_macro_insee(str(cfg))
    assert os.path.exists(out)
    js = json.loads(open(out, "r", encoding="utf-8").read())
    assert js["country"] == "FR"
    assert any(item.get("id") == "deflator_gdp" and item.get("data", {}).get("ok") is True for item in js.get("items", []))

