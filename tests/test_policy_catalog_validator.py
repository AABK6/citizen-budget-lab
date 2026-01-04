import pytest
from services.api import policy_catalog as pol

def test_validate_catalog_rejects_duplicate_keys():
    """
    Ensure that the policy catalog validator rejects YAML with duplicate keys
    within a single object (e.g., two 'label' fields for the same lever).
    Standard yaml.safe_load silently overwrites the first value.
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
    
    # We expect an error message specifically mentioning duplicate keys.
    # The current implementation uses yaml.safe_load which swallows duplicates,
    # so 'errors' will likely be empty (or contain unrelated schema errors if I missed something).
    # Thus, this assertion should FAIL if the implementation is not yet fixed.
    assert any("duplicate key" in e.lower() for e in errors), \
        f"Expected validation error for duplicate keys, but got: {errors}"