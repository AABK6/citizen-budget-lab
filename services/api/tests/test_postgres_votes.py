import json
import pytest

def test_postgres_vote_summary(postgres_store):
    if not postgres_store:
        pytest.skip("Postgres store not available")
        
    sid = "pg_vote_1"
    postgres_store.add_vote(sid, "u1@test.com", {"timestamp": 100})
    postgres_store.add_vote(sid, "u2@test.com", {"timestamp": 200})
    
    summary = postgres_store.summary(limit=10)
    stats = next((s for s in summary if s.scenario_id == sid), None)
    
    assert stats is not None
    assert stats.votes == 2
    assert stats.last_vote_ts == 200.0

def test_postgres_vote_persistence(postgres_store):
    if not postgres_store:
        pytest.skip("Postgres store not available")
    
    # We verify that data inserted via add_vote is retrievable via SQL manually
    # to ensure the table structure is correct.
    sid = "pg_manual_verify"
    meta = {"foo": "bar"}
    postgres_store.add_vote(sid, None, meta)
    
    with postgres_store._pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT meta_json FROM votes WHERE scenario_id = %s", (sid,))
            row = cur.fetchone()
            assert row is not None
            assert json.loads(row[0])["foo"] == "bar"
