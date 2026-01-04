import pytest
from services.api import policy_catalog as pol

def test_validate_catalog_rejects_duplicate_keys():
    """
    Ensure that the policy catalog validator rejects YAML with duplicate keys
    within a single object (e.g., two 'label' fields for the same lever).
    """
    yaml_with_duplicates = """
- id: test_duplicate_key
  label: First Label
  label: Second Label
  description: This should fail validation.
  family: TAXES
  fixed_impact_eur: 1000000
  cofog_mapping: {}
  mission_mapping: {}
  feasibility:
    law: true
    adminLagMonths: 0
  conflicts_with: []
  sources: []
  params_schema: {}
    """
    
    errors = pol.validate_policy_catalog_text(yaml_with_duplicates)
    
    # Debug print
    print(f"DEBUG: errors={errors}")
    
    assert any("duplicate key" in e.lower() for e in errors), \
        f"Expected validation error for duplicate keys, but got: {errors}"


def test_validate_catalog_checks_impact_consistency():
    """
    Ensure that the validator checks consistency between 'fixed_impact_eur'
    and 'multi_year_impact.2026'.
    """
    yaml_inconsistent = """
- id: test_inconsistent_impact
  label: Inconsistent Impact
  description: Fixed impact differs from 2026 trajectory.
  family: TAXES
  fixed_impact_eur: 1000000000
  multi_year_impact:
    2026: 2000000000
  cofog_mapping: {}
  mission_mapping: {}
  feasibility:
    law: true
    adminLagMonths: 0
  conflicts_with: []
  sources: []
  params_schema: {}
    """
    
    errors = pol.validate_policy_catalog_text(yaml_inconsistent)
    
    print(f"DEBUG: errors={errors}")
    
    # We expect an error about impact mismatch.
    assert any("impact mismatch" in e.lower() for e in errors), \
        f"Expected error for impact mismatch, but got: {errors}"