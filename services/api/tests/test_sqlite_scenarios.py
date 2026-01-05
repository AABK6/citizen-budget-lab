import json
import pytest

def test_sqlite_scenario_roundtrip(sqlite_store):
    sid = "scenario_123"
    dsl = {"reforms": ["reform_A", "reform_B"]}
    dsl_json = json.dumps(dsl)
    
    # 1. Save
    sqlite_store.save_scenario(sid, dsl_json)
    
    # 2. Get
    retrieved_dsl = sqlite_store.get_scenario(sid)
    
    # 3. Verify
    assert retrieved_dsl is not None
    assert json.loads(retrieved_dsl) == dsl

def test_sqlite_scenario_update(sqlite_store):
    sid = "scenario_update"
    dsl_v1 = {"v": 1}
    sqlite_store.save_scenario(sid, json.dumps(dsl_v1))
    
    dsl_v2 = {"v": 2}
    sqlite_store.save_scenario(sid, json.dumps(dsl_v2))
    
    retrieved = sqlite_store.get_scenario(sid)
    assert json.loads(retrieved) == dsl_v2

def test_sqlite_get_nonexistent(sqlite_store):
    assert sqlite_store.get_scenario("fake_id") is None
