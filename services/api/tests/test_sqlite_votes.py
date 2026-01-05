import json
import pytest

def test_sqlite_add_vote_and_summary(sqlite_store):
    sid = "scenario_vote_1"
    
    # Add 3 votes
    sqlite_store.add_vote(sid, "user1@example.com", {"timestamp": 1000})
    sqlite_store.add_vote(sid, "user2@example.com", {"timestamp": 2000})
    sqlite_store.add_vote(sid, "user3@example.com", {"timestamp": 1500})
    
    # Add vote for another scenario
    sqlite_store.add_vote("other_scenario", "user4@example.com", {})
    
    summary = sqlite_store.summary(limit=10)
    
    # Find our scenario
    stats = next((s for s in summary if s.scenario_id == sid), None)
    
    assert stats is not None
    assert stats.votes == 3
    assert stats.last_vote_ts == 2000.0

def test_sqlite_vote_metadata_persistence(sqlite_store):
    sid = "scenario_meta"
    meta = {"browser": "firefox", "foo": "bar"}
    sqlite_store.add_vote(sid, None, meta)
    
    # We need to query the DB directly to check metadata since summary() doesn't return it
    with sqlite_store._connect() as conn:
        row = conn.execute("SELECT meta_json FROM votes WHERE scenario_id = ?", (sid,)).fetchone()
        saved_meta = json.loads(row[0])
        assert saved_meta["browser"] == "firefox"
        assert saved_meta["foo"] == "bar"
