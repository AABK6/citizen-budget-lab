import os
import pytest
import sqlite3
from services.api.db.migrations import apply_migrations, votes_migrations_dir

def test_migration_idempotency(sqlite_store):
    # 1. Store some data
    sid = "mig_1"
    sqlite_store.save_scenario(sid, '{"v": 1}')
    
    # 2. Run migrations again
    with sqlite_store._connect() as conn:
        applied = apply_migrations(conn, votes_migrations_dir())
        
    # 3. Verify nothing new applied (idempotency)
    assert len(applied) == 0
    
    # 4. Verify data is still there
    assert sqlite_store.get_scenario(sid) == '{"v": 1}'

def test_migration_fresh_start(tmp_path):
    # Test that apply_migrations works on a completely new DB file
    db_path = tmp_path / "fresh.sqlite3"
    conn = sqlite3.connect(str(db_path))
    
    applied = apply_migrations(conn, votes_migrations_dir())
    assert len(applied) > 0
    
    # Verify tables created
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='votes'")
    assert cur.fetchone() is not None
    conn.close()
