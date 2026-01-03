from services.api import policy_catalog as pol

def test_pension_levers_mapping():
    """Verify that key pension reforms are mapped to M_PENSIONS (APU scope)."""
    catalog = pol.load_policy_catalog(refresh=True)
    pension_lever_ids = [
        "amend_suspend_retirement_reform",
        "raise_retirement_age_65",
        "lower_retirement_age_62",
        "lower_retirement_age_60",
        "extend_contribution_period",
        "close_special_regimes",
        "annee_blanche_indexation"
    ]
    
    for lever_id in pension_lever_ids:
        lever = next((l for l in catalog if l["id"] == lever_id), None)
        assert lever is not None, f"Lever {lever_id} not found in catalog"
        mapping = lever.get("mission_mapping", {})
        assert "M_PENSIONS" in mapping, f"Lever {lever_id} should map to M_PENSIONS, got {mapping}"
        assert mapping["M_PENSIONS"] == 1.0

def test_health_levers_mapping():
    """Verify that key health reforms are mapped to M_HEALTH (APU scope)."""
    catalog = pol.load_policy_catalog(refresh=True)
    health_lever_ids = [
        "amend_ondam_3pct_increase",
        "amend_no_medical_copay_doubling",
        "amend_limit_sick_leave_duration",
        "amend_ald_sickleave_exempt_ir",
        "amend_surtax_health_insurers"
    ]
    
    for lever_id in health_lever_ids:
        lever = next((l for l in catalog if l["id"] == lever_id), None)
        assert lever is not None, f"Lever {lever_id} not found in catalog"
        mapping = lever.get("mission_mapping", {})
        assert "M_HEALTH" in mapping, f"Lever {lever_id} should map to M_HEALTH, got {mapping}"
        assert mapping["M_HEALTH"] == 1.0
