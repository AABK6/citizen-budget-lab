import os
import sqlite3
from types import SimpleNamespace

import pytest

from services.api.db.migrations import apply_migrations, votes_migrations_dir
from services.api.votes_store import (
    FileVoteStore,
    PostgresVoteStore,
    SqliteVoteStore,
    close_vote_store,
    get_vote_store,
    get_vote_store_status,
    validate_vote_store_configuration,
)


@pytest.fixture(autouse=True)
def _reset_vote_store_cache():
    close_vote_store()
    get_vote_store.cache_clear()
    yield
    close_vote_store()
    get_vote_store.cache_clear()


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


def test_vote_store_status_default_local_file(monkeypatch):
    monkeypatch.setattr(
        "services.api.votes_store.get_settings",
        lambda: SimpleNamespace(
            votes_store="file",
            votes_require_postgres=False,
            votes_db_dsn="",
            votes_db_pool_min=1,
            votes_db_pool_max=5,
            votes_db_pool_timeout=30.0,
            votes_db_pool_max_idle=300.0,
            votes_db_pool_max_lifetime=1800.0,
            votes_sqlite_path=":memory:",
            votes_file_path="data/cache/votes.json",
        ),
    )
    monkeypatch.delenv("K_SERVICE", raising=False)

    status = get_vote_store_status()
    assert status["ok"] is True
    assert status["selected_backend"] == "file"
    assert status["require_postgres"] is False


def test_vote_store_config_fails_when_postgres_without_dsn(monkeypatch):
    monkeypatch.setattr(
        "services.api.votes_store.get_settings",
        lambda: SimpleNamespace(
            votes_store="postgres",
            votes_require_postgres=False,
            votes_db_dsn="",
            votes_db_pool_min=1,
            votes_db_pool_max=5,
            votes_db_pool_timeout=30.0,
            votes_db_pool_max_idle=300.0,
            votes_db_pool_max_lifetime=1800.0,
            votes_sqlite_path=":memory:",
            votes_file_path="data/cache/votes.json",
        ),
    )
    monkeypatch.delenv("K_SERVICE", raising=False)

    status = get_vote_store_status()
    assert status["ok"] is False
    assert any("requires VOTES_DB_DSN" in msg for msg in status["errors"])
    with pytest.raises(RuntimeError, match="VOTES_STORE=postgres requires VOTES_DB_DSN"):
        validate_vote_store_configuration()


def test_vote_store_config_fails_in_cloud_run_without_postgres(monkeypatch):
    monkeypatch.setattr(
        "services.api.votes_store.get_settings",
        lambda: SimpleNamespace(
            votes_store="file",
            votes_require_postgres=True,
            votes_db_dsn="",
            votes_db_pool_min=1,
            votes_db_pool_max=5,
            votes_db_pool_timeout=30.0,
            votes_db_pool_max_idle=300.0,
            votes_db_pool_max_lifetime=1800.0,
            votes_sqlite_path=":memory:",
            votes_file_path="data/cache/votes.json",
        ),
    )
    monkeypatch.setenv("K_SERVICE", "citizen-budget-api")

    status = get_vote_store_status()
    assert status["ok"] is False
    assert status["require_postgres"] is True
    with pytest.raises(RuntimeError, match="Postgres vote storage is required"):
        validate_vote_store_configuration()


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
