import base64
import yaml
import pytest
from unittest.mock import patch
from services.api.data_loader import run_scenario
from services.api import policy_catalog as pol

def _encode(data: dict) -> str:
    return base64.b64encode(yaml.safe_dump(data).encode("utf-8")).decode("ascii")

def test_run_scenario_uses_mission_mapping_for_resolution():
    """
    Verify that runScenario correctly uses 'mission_mapping' for the MISSION lens.
    """
    lever_id = "test_mission_lever"
    mock_lever = {
        "id": lever_id,
        "family": "TAXES",
        "label": "Test Mission Lever",
        "description": "Desc",
        "fixed_impact_eur": 1000.0,
        "cofog_mapping": {"01.1": 1.0},
        "mission_mapping": {"M_EDUCATION": 0.6, "M_DEFENSE": 0.4},
        "feasibility": {"law": True, "adminLagMonths": 0},
        "conflicts_with": [],
        "sources": [],
        "params_schema": {}
    }
    
    # Mocking policy_catalog.levers_by_id to include our mock lever
    with patch("services.api.policy_catalog.levers_by_id", return_value={lever_id: mock_lever}):
        # We need to also mock load_policy_catalog if it's used elsewhere during run_scenario
        with patch("services.api.policy_catalog.load_policy_catalog", return_value=[mock_lever]):
            pol._load_catalog_cached.cache_clear()
            
            dsl = {
                "version": 0.1,
                "baseline_year": 2026,
                "assumptions": {"horizon_years": 1, "lens": "MISSION"},
                "actions": [
                    {"id": lever_id, "target": f"lever.{lever_id}", "op": "activate"}
                ]
            }
            
            _, acc, _, _, resolution, _ = run_scenario(_encode(dsl))
            
            # Impact is 1000. Lever activation usually means savings? 
            # In Citizen Budget Lab, activating a 'TAXES' lever with fixed_impact_eur > 0 usually increases revenue.
            # However, for resolution (expenditure missions), we need to see how it's handled.
            # Wait, TAXES levers might not map to expenditure missions usually.
            # Let's use a SPENDING family lever for clarity.
            
            mock_lever_spending = dict(mock_lever)
            mock_lever_spending["family"] = "DEFENSE" # SPENDING family
            mock_lever_spending["budget_side"] = "SPENDING"
            
            with patch("services.api.policy_catalog.levers_by_id", return_value={lever_id: mock_lever_spending}):
                _, acc, _, _, resolution, _ = run_scenario(_encode(dsl))
                
                # For spending, fixed_impact_eur > 0 usually means a cut (saving).
                # In data_loader.py: resolution_specified_by_mission_total[mission_code] += -impact_schedule[0] * weight_val
                # If impact is 1000 (cut), specifiedDeltaEur should be -1000.
                
                by_mass = {m["massId"]: m["specifiedDeltaEur"] for m in resolution["byMass"]}
                
                assert "M_EDUCATION" in by_mass
                assert "M_DEFENSE" in by_mass
                
                # weight 0.6 * 1000 = 600. In data_loader it's -impact_schedule[0] * weight_val
                assert by_mass["M_EDUCATION"] == pytest.approx(-600.0)
                assert by_mass["M_DEFENSE"] == pytest.approx(-400.0)

def test_run_scenario_falls_back_to_cofog_if_mission_mapping_missing():
    """
    Verify that runScenario falls back to COFOG-to-mission conversion if 'mission_mapping' is empty.
    """
    lever_id = "test_cofog_fallback"
    mock_lever = {
        "id": lever_id,
        "family": "DEFENSE",
        "label": "Test Fallback",
        "description": "Desc",
        "fixed_impact_eur": 1000.0,
        "cofog_mapping": {"02.1": 1.0}, # 02.1 is Defense
        "mission_mapping": {}, # Empty
        "feasibility": {"law": True, "adminLagMonths": 0},
        "conflicts_with": [],
        "sources": [],
        "params_schema": {}
    }
    
    with patch("services.api.policy_catalog.levers_by_id", return_value={lever_id: mock_lever}):
        dsl = {
            "version": 0.1,
            "baseline_year": 2026,
            "assumptions": {"horizon_years": 1, "lens": "MISSION"},
            "actions": [
                {"id": lever_id, "target": f"lever.{lever_id}", "op": "activate"}
            ]
        }
        
        _, _, _, _, resolution, _ = run_scenario(_encode(dsl))
        
        by_mass = {m["massId"]: m["specifiedDeltaEur"] for m in resolution["byMass"]}
        
        # 02.1 should map to M_DEFENSE (or similar depending on cofog_mapping.json)
        # We check that it mapped to SOMETHING.
        assert len(by_mass) > 0
        assert any(m.startswith("M_") for m in by_mass)

def test_run_scenario_uses_multi_year_impact():
    """
    Verify that runScenario correctly uses 'multi_year_impact' for the accounting path.
    """
    lever_id = "test_multi_year"
    mock_lever = {
        "id": lever_id,
        "family": "TAXES",
        "label": "Test Multi Year",
        "description": "Desc",
        "fixed_impact_eur": 1000.0,
        "cofog_mapping": {"01.1": 1.0},
        "mission_mapping": {"M_TEST": 1.0},
        "multi_year_impact": {"2026": 1000.0, "2027": 2000.0, "2028": 3000.0},
        "feasibility": {"law": True, "adminLagMonths": 0},
        "conflicts_with": [],
        "sources": [],
        "params_schema": {}
    }
    
    with patch("services.api.policy_catalog.levers_by_id", return_value={lever_id: mock_lever}):
        dsl = {
            "version": 0.1,
            "baseline_year": 2026,
            "assumptions": {"horizon_years": 3, "lens": "MISSION"},
            "actions": [
                {"id": lever_id, "target": f"lever.{lever_id}", "op": "activate"}
            ]
        }
        
        _, acc, _, _, _, _ = run_scenario(_encode(dsl))
        
        # Acc.deficit_delta_path should be [-1000, -2000, -3000]
        # (Negative because it's a saving/revenue increase in this context)
        assert acc.deficit_delta_path == pytest.approx([-1000.0, -2000.0, -3000.0])
