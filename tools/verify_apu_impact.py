import base64
import json
from services.api import data_loader as dl
from services.api import policy_catalog as pol

def test_simulation_impact_pensions():
    """Verify that activating a pension lever impacts the M_PENSIONS aggregate."""
    year = 2026
    
    # 1. Get initial total for M_PENSIONS
    masses = dl.builder_mass_allocation(year)
    pension_mass = next((m for m in masses if m.get("massId") == "M_PENSIONS"), None)
    initial_amount = pension_mass["amountEur"] if pension_mass else 0
    print(f"Initial M_PENSIONS: {initial_amount}")
    
    # 2. Run scenario with 'amend_suspend_retirement_reform'
    scenario_input = {
        "version": "1.0",
        "baseline_year": year,
        "actions": [
            {
                "id": "amend_suspend_retirement_reform",
                "target": "amend_suspend_retirement_reform",
                "op": "apply_lever"
            }
        ]
    }
    
    dsl_json = json.dumps(scenario_input)
    dsl_b64 = base64.b64encode(dsl_json.encode("utf-8")).decode("utf-8")
    
    # Reload catalog to be sure
    catalog = pol.load_policy_catalog(refresh=True)
    lever = next(l for l in catalog if l["id"] == "amend_suspend_retirement_reform")
    impact_eur = lever["fixed_impact_eur"]
    print(f"Lever impact: {impact_eur}")
    
    sid, acc, comp, macro, final_masses_dict, warnings = dl.run_scenario(dsl_b64)
    print(f"DEBUG: byMass[0]: {final_masses_dict['byMass'][0] if final_masses_dict['byMass'] else 'Empty'}")
    
    # The final_masses_dict['byMass'] is likely a list of dicts
    final_pension_mass = next((m for m in final_masses_dict["byMass"] if m.get("massId") == "M_PENSIONS"), None)
    final_amount = final_pension_mass["amountEur"] if final_pension_mass else None
    print(f"Final M_PENSIONS: {final_amount}")
    
    assert final_amount is not None
    
    # Verification: Final = Initial - Impact
    # Note: impact is change in balance. savings > 0, cost < 0.
    # Spending increases if impact is negative.
    # final_spending = initial_spending - impact
    expected_amount = initial_amount - impact_eur
    
    # Allow for some floating point tolerance if needed, but here it should be exact
    assert abs(final_amount - expected_amount) < 1.0
    print(f"Success! Final amount {final_amount} reflects the lever impact {impact_eur}")

if __name__ == "__main__":
    test_simulation_impact_pensions()
