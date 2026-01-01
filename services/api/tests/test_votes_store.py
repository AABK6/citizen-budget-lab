import os
import sqlite3

import pytest

from services.api.db.migrations import apply_migrations, votes_migrations_dir
from services.api.votes_store import FileVoteStore, PostgresVoteStore, SqliteVoteStore


def test_file_vote_store_summary(tmp_path):
    store = FileVoteStore(str(tmp_path / "votes.json"))
    store.add_vote("scenario-a", None, {"timestamp": 100.0})
    store.add_vote("scenario-a", "user@example.com", {})
    store.add_vote("scenario-b", None, {})

    summary = store.summary()
    assert summary[0].scenario_id == "scenario-a"
    assert summary[0].votes == 2


def test_sqlite_vote_store_summary(tmp_path):
    store = SqliteVoteStore(str(tmp_path / "votes.sqlite3"))
    store.add_vote("scenario-a", None, {"timestamp": 100.0})
    store.add_vote("scenario-a", None, {})
    store.add_vote("scenario-b", "user@example.com", {})

    summary = store.summary()
    assert summary[0].scenario_id == "scenario-a"
    assert summary[0].votes == 2

    with sqlite3.connect(str(tmp_path / "votes.sqlite3")) as conn:
        rows = conn.execute("SELECT name FROM vote_migrations").fetchall()
        assert rows


def test_vote_migrations_apply_idempotent(tmp_path):
    path = tmp_path / "votes.db"
    with sqlite3.connect(str(path)) as conn:
        apply_migrations(conn, votes_migrations_dir())
        apply_migrations(conn, votes_migrations_dir())
        rows = conn.execute("SELECT name FROM vote_migrations").fetchall()
        assert len(rows) >= 1


@pytest.mark.skipif(not os.getenv("VOTES_DB_DSN"), reason="VOTES_DB_DSN not set")
def test_postgres_vote_store_roundtrip():
    store = PostgresVoteStore(
        os.environ["VOTES_DB_DSN"],
        pool_min_size=1,
        pool_max_size=2,
        pool_timeout=5,
        pool_max_idle=5,
        pool_max_lifetime=60,
    )
    store.add_vote("scenario-a", None, {})
    summary = store.summary()
    store.close()

    assert any(item.scenario_id == "scenario-a" for item in summary)
