import threading
import pytest
import concurrent.futures

def test_sqlite_concurrency(sqlite_store):
    sid = "concurrent_sid"
    num_threads = 20
    
    def submit_vote():
        sqlite_store.add_vote(sid, None, {})

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(submit_vote) for _ in range(num_threads)]
        concurrent.futures.wait(futures)

    summary = sqlite_store.summary()
    stats = next((s for s in summary if s.scenario_id == sid), None)
    assert stats is not None
    assert stats.votes == num_threads

def test_postgres_concurrency(postgres_store):
    if not postgres_store:
        pytest.skip("Postgres store not available")
        
    sid = "pg_concurrent_sid"
    num_threads = 50
    
    def submit_vote():
        postgres_store.add_vote(sid, None, {})

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(submit_vote) for _ in range(num_threads)]
        concurrent.futures.wait(futures)

    summary = postgres_store.summary()
    stats = next((s for s in summary if s.scenario_id == sid), None)
    assert stats is not None
    assert stats.votes == num_threads
