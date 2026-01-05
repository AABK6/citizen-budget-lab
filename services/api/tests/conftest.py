import os
import time
import pytest
import subprocess
from services.api.votes_store import PostgresVoteStore, SqliteVoteStore

@pytest.fixture(scope="session")
def test_db_service():
    """Starts the postgres test container for the session."""
    # Check if we are in CI or if we should skip
    if os.getenv("SKIP_INTEGRATION"):
        yield None
        return

    # Start docker compose
    compose_file = "docker-compose.test.yml"
    if not os.path.exists(compose_file):
        # Fallback to look relative to root if running from elsewhere? 
        # Assuming run from root.
        yield None
        return

    print("Starting Test DB container...")
    subprocess.run(["docker", "compose", "-f", compose_file, "up", "-d", "--wait"], check=True)
    
    yield "postgresql://test_user:test_password@localhost:5433/test_votes"

    # Teardown
    print("Stopping Test DB container...")
    subprocess.run(["docker", "compose", "-f", compose_file, "down"], check=True)

@pytest.fixture
def postgres_store(test_db_service):
    if not test_db_service:
        pytest.skip("Test DB not available")
    
    # Create store with low pool settings for tests
    store = PostgresVoteStore(
        dsn=test_db_service,
        pool_min_size=1,
        pool_max_size=5,
        pool_timeout=5.0,
        pool_max_idle=10.0,
        pool_max_lifetime=30.0
    )
    
    # Clean tables before test
    with store._pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE votes, scenarios, vote_stats RESTART IDENTITY;")
        conn.commit()

    yield store
    store.close()

@pytest.fixture
def sqlite_store(tmp_path):
    db_path = tmp_path / "test_votes.sqlite3"
    store = SqliteVoteStore(str(db_path))
    yield store
    store.close()
