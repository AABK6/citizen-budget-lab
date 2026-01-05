import json
import pytest

def test_on_conflict_save_scenario(sqlite_store):
    sid = "conflict_sid"
    sqlite_store.save_scenario(sid, '{"v": 1}', '{"title": "v1"}')
    sqlite_store.save_scenario(sid, '{"v": 2}', None) # meta_json is None, should COALESCE
    
    with sqlite_store._connect() as conn:
        row = conn.execute("SELECT dsl_json, meta_json FROM scenarios WHERE id = ?", (sid,)).fetchone()
        assert json.loads(row[0]) == {"v": 2}
        assert json.loads(row[1]) == {"title": "v1"}

def test_sqlite_foreign_key_logic_mock(sqlite_store):
    # This test document that currently FKs are NOT enforced in the schema
    # (or rather, verify current state)
    sid = "non_existent_scenario"
    sqlite_store.add_vote(sid, "user@test.com", {})
    
    with sqlite_store._connect() as conn:
        row = conn.execute("SELECT COUNT(*) FROM votes WHERE scenario_id = ?", (sid,)).fetchone()
        assert row[0] == 1