import os

import pytest

from services.api.data_loader import procurement_top_suppliers


@pytest.mark.parametrize("flag", ["0", "false", "False"])  # exercise multiple off values
def test_procurement_skips_enrichment_when_disabled(monkeypatch, flag):
    # Disable enrichment via env and ensure a failing insee call is never invoked
    monkeypatch.setenv("PROCUREMENT_ENRICH_SIRENE", flag)

    class Boom(Exception):
        pass

    # If enrichment were attempted, this will raise
    def fake_sirene_by_siren(s):  # noqa: ANN001
        raise Boom("should not be called when enrichment disabled")

    # Monkeypatch clients.insee module only if imported
    from services.api import clients as cl  # type: ignore

    try:
        from services.api.clients import insee as insee_client

        monkeypatch.setattr(insee_client, "sirene_by_siren", fake_sirene_by_siren, raising=True)
    except Exception:
        # clients may not import without tokens; that's fine
        pass

    # Should not raise; returns items from sample CSV aggregation path
    items = procurement_top_suppliers(2024, region="75")
    assert items, "Expected some procurement items"
