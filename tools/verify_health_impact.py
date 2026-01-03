import base64
import json
from services.api import data_loader as dl
from services.api import policy_catalog as pol

def test_simulation_impact_health():
    """Verify that activating a health lever impacts the M_HEALTH aggregate."""
    year = 2026
    
    # Run scenario with 'amend_ondam_3pct_increase'
    # This lever has a fixed impact of -3,000,000,000€ (cost/spending increase)
    scenario_input = {
        "version": "1.0",
        "baseline_year": year,
        "actions": [
            {
                "id": "amend_ondam_3pct_increase",
                "target": "amend_ondam_3pct_increase",
                "op": "apply_lever"
            }
        ]
    }
    
    dsl_json = json.dumps(scenario_input)
    dsl_b64 = base64.b64encode(dsl_json.encode("utf-8")).decode("utf-8")
    
    catalog = pol.load_policy_catalog(refresh=True)
    lever = next(l for l in catalog if l["id"] == "amend_ondam_3pct_increase")
    impact_eur = lever["fixed_impact_eur"]
    print(f"Lever impact: {impact_eur}")
    
    sid, acc, comp, macro, final_masses_dict, warnings = dl.run_scenario(dsl_b64)
    
    final_masses = final_masses_dict.get("byMass", [])
    health_mass = next((m for m in final_masses if m.get("massId") == "M_HEALTH"), None)
    
    assert health_mass is not None
    # specifiedDeltaEur should be -impact_eur
    delta = health_mass["specifiedDeltaEur"]
    print(f"Final M_HEALTH delta: {delta}")
    
    assert delta == -impact_eur
    print(f"Success! Health delta {delta} reflects the lever impact {impact_eur}")

if __name__ == "__main__":
    test_simulation_impact_health()
