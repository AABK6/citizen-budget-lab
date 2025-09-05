import base64

from services.api import schema as gql_schema


def test_run_scenario_rejects_invalid_schema():
    # Missing required fields per JSON schema; expect GraphQL error
    bad_yaml = """
assumptions:
  horizon_years: 3
actions: []
"""
    dsl_b64 = base64.b64encode(bad_yaml.encode("utf-8")).decode("utf-8")
    query = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { id }
      }
    """
    res = gql_schema.schema.execute_sync(query, variable_values={"dsl": dsl_b64})
    assert res.errors, "Expected validation errors for malformed DSL"
    # Ensure error message points to validation
    assert any("validation" in (str(e) or "").lower() for e in res.errors)


def test_run_scenario_invalid_base64():
    query = """
      mutation Run($dsl: String!) {
        runScenario(input: { dsl: $dsl }) { id }
      }
    """
    res = gql_schema.schema.execute_sync(query, variable_values={"dsl": "@@not-base64@@"})
    assert res.errors, "Expected errors for invalid base64 DSL"
