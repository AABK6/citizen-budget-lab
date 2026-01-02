import pytest
from services.api.policy_catalog import validate_policy_catalog_data

def test_schema_rejects_missing_mission_mapping():
    """
    Test that the schema now requires 'mission_mapping'.
    """
    lever = {
        "id": "test_lever_missing_mission",
        "family": "TAXES",
        "label": "Test Lever",
        "description": "Desc",
        "fixed_impact_eur": 100.0,
        "cofog_mapping": {"01.1": 1.0},
        # mission_mapping is missing
        "feasibility": {"law": True, "adminLagMonths": 0},
        "conflicts_with": [],
        "sources": [],
        "params_schema": {}
    }
    
    errors = validate_policy_catalog_data([lever])
    # Should fail because mission_mapping is required
    # Note: Using snake_case 'mission_mapping' as per existing schema convention, 
    # even though plan said 'missionMapping' (likely a typo/js-ism).
    assert any("mission_mapping" in e for e in errors), f"Expected mission_mapping error, got: {errors}"

def test_schema_accepts_new_fields():
    """
    Test that the schema accepts the new rich metadata fields.
    """
    lever = {
        "id": "test_lever_full",
        "family": "TAXES",
        "label": "Test Lever Full",
        "description": "Desc",
        "fixed_impact_eur": 100.0,
        "cofog_mapping": {"01.1": 1.0},
        "mission_mapping": {"M_TEST": 1.0},
        "multi_year_impact": {"2026": 100.0, "2027": 200.0},
        "pushbacks": [
            {"type": "political", "description": "Risky", "source": "http://example.com"}
        ],
        "distributional_flags": {"openfisca": True},
        "feasibility": {"law": True, "adminLagMonths": 0},
        "conflicts_with": [],
        "sources": [],
        "params_schema": {}
    }
    
    errors = validate_policy_catalog_data([lever])
    assert not errors, f"Expected no errors, got: {errors}"

from fastapi.testclient import TestClient
from services.api.app import create_app
from services.api import policy_catalog as pol
import unittest.mock as mock

def test_graphql_returns_new_fields():
    """
    Test that the GraphQL API returns the new rich metadata fields.
    """
    mock_lever = {
        "id": "test_lever_gql",
        "family": "TAXES",
        "label": "Test GQL",
        "description": "Desc",
        "fixed_impact_eur": 100.0,
        "cofog_mapping": {"01.1": 1.0},
        "mission_mapping": {"M_TEST": 1.0},
        "multi_year_impact": {"2026": 100.0},
        "pushbacks": [{"type": "political", "description": "Risky", "source": "http://src"}],
        "distributional_flags": {"openfisca": True},
        "feasibility": {"law": True, "adminLagMonths": 0},
        "conflicts_with": [],
        "sources": [],
        "params_schema": {}
    }
    
    app = create_app()
    client = TestClient(app)
    
    # Mock load_policy_catalog to return our test lever
    with mock.patch("services.api.policy_catalog.load_policy_catalog", return_value=[mock_lever]):
        pol._load_catalog_cached.cache_clear()
        
        q = """
          query {
            policyLevers(search: "GQL") {
              id
              multiYearImpact
              pushbacks {
                type
                description
                source
              }
              distributionalFlags
            }
          }
        """
        res = client.post("/graphql", json={"query": q})
        assert res.status_code == 200
        js = res.json()
        assert "errors" not in js, js.get("errors")
        
        levers = js["data"]["policyLevers"]
        assert len(levers) == 1
        it = levers[0]
        assert it["id"] == "test_lever_gql"
        assert it["multiYearImpact"] == {"2026": 100.0}
        assert it["pushbacks"] == [{"type": "political", "description": "Risky", "source": "http://src"}]
        assert it["distributionalFlags"] == {"openfisca": True}
