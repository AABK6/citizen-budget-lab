import pytest

def test_summary_ordering_and_limits(sqlite_store):
    # Setup: 3 scenarios with different vote counts
    # s1: 10 votes
    # s2: 5 votes
    # s3: 15 votes
    
    for _ in range(10): sqlite_store.add_vote("s1", None, {})
    for _ in range(5): sqlite_store.add_vote("s2", None, {})
    for _ in range(15): sqlite_store.add_vote("s3", None, {})
    
    summary = sqlite_store.summary(limit=2)
    
    assert len(summary) == 2
    assert summary[0].scenario_id == "s3"
    assert summary[0].votes == 15
    assert summary[1].scenario_id == "s1"
    assert summary[1].votes == 10

def test_summary_empty(sqlite_store):
    assert sqlite_store.summary() == []

def test_postgres_vote_stats_sync(postgres_store):
    if not postgres_store:
        pytest.skip("Postgres store not available")
        
    sid = "stats_sync_sid"
    for _ in range(3): postgres_store.add_vote(sid, None, {})
    
    with postgres_store._pool.connection() as conn:
        with conn.cursor() as cur:
            # Check raw votes
            cur.execute("SELECT COUNT(*) FROM votes WHERE scenario_id = %s", (sid,))
            raw_count = cur.fetchone()[0]
            
            # Check materialized stats
            cur.execute("SELECT vote_count FROM vote_stats WHERE scenario_id = %s", (sid,))
            stats_count = cur.fetchone()[0]
            
            assert raw_count == 3
            assert stats_count == 3
