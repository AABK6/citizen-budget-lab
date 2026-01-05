import json
import pytest

def test_postgres_scenario_roundtrip(postgres_store):
    if not postgres_store:
        pytest.skip("Postgres store not available")

    sid = "pg_scenario_1"
    dsl = {"reforms": ["pg_reform_A"]}
    dsl_json = json.dumps(dsl)
    
    # 1. Save
    postgres_store.save_scenario(sid, dsl_json)
    
    # 2. Get
    retrieved = postgres_store.get_scenario(sid)
    
    assert retrieved is not None
    # We expect consistency in what we get back (string of JSON)
    assert json.loads(retrieved) == dsl

def test_postgres_scenario_upsert(postgres_store):
    if not postgres_store:
        pytest.skip("Postgres store not available")

    sid = "pg_scenario_upsert"
    
    postgres_store.save_scenario(sid, json.dumps({"v": 1}))
    postgres_store.save_scenario(sid, json.dumps({"v": 2}))
    
    retrieved = postgres_store.get_scenario(sid)
    assert json.loads(retrieved) == {"v": 2}
