from services.api.data_loader import allocation_by_cofog, Basis


def test_programme_mapping_precedence_and_year(monkeypatch):
    # Disable warehouse to exercise fallback mapping on sample CSV
    import services.api.warehouse_client as wh
    monkeypatch.setattr(wh, "warehouse_available", lambda: False)
    # Provide a synthetic mapping where mission 150 would be misclassified to 03 (Public order),
    # but programme-level mapping corrects to 09 (Education). Also override programme 2041 to COFOG 04 for 2026.
    def fake_load_json(path: str):  # noqa: ANN001
        return {
            "mission_to_cofog": {
                "150": [{"code": "03", "weight": 1.0}],
                "124": [{"code": "07", "weight": 1.0}],
                "178": [{"code": "02", "weight": 1.0}],
                "204": [{"code": "05", "weight": 1.0}],
                "304": [{"code": "03", "weight": 1.0}],
            },
            "programme_to_cofog": {
                "1501": [{"code": "09.1", "weight": 1.0}],
                "1502": [{"code": "09.2", "weight": 1.0}],
                "1503": [{"code": "09.5", "weight": 1.0}],
            },
            "programme_to_cofog_years": {
                "2041": {"by_year": {"2026": [{"code": "04", "weight": 1.0}]}, "default": [{"code": "05", "weight": 1.0}]}
            },
        }

    # Monkeypatch internal loader
    import services.api.data_loader as dl

    monkeypatch.setattr(dl, "_load_json", fake_load_json)

    items = allocation_by_cofog(2026, Basis.CP)
    # Turn into a map code -> amount
    m = {i.code: i.amount_eur for i in items}

    # Education should aggregate under 09 from programme mappings: 70+60+30 = 160e9
    assert m.get("09", 0.0) > 150_000_000_000.0

    # Public order (03) should contain only mission 304 (~10e9), not education totals
    assert 9_000_000_000.0 <= m.get("03", 0.0) <= 11_000_000_000.0

    # Year-aware override: 2041 CP is 12e9 and maps to 04 instead of 05 for 2026
    assert 11_000_000_000.0 <= m.get("04", 0.0) <= 13_000_000_000.0
