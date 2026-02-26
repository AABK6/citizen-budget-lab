from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional

from .db.migrations import apply_migrations, votes_migrations_dir
from .settings import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class VoteSummary:
    scenario_id: str
    votes: int
    last_vote_ts: float | None


@dataclass(frozen=True)
class VoteStoreConfigStatus:
    ok: bool
    configured_backend: str
    selected_backend: str
    dsn_present: bool
    require_postgres: bool
    cloud_run: bool
    errors: tuple[str, ...]


class VoteStore:
    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        raise NotImplementedError

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        raise NotImplementedError

    def save_scenario(self, sid: str, dsl_json: str, meta_json: str | None = None) -> None:
        pass

    def get_scenario(self, sid: str) -> Optional[str]:
        return None

    def close(self) -> None:
        pass


def _normalize_meta(meta: Optional[Dict[str, Any]], user_email: Optional[str]) -> Dict[str, Any]:
    normalized = dict(meta or {})
    if user_email and not normalized.get("userEmail"):
        normalized["userEmail"] = user_email
    return normalized


def _normalize_backend(raw_backend: Optional[str]) -> str:
    return str(raw_backend or "file").strip().lower()


def _resolve_vote_store_status() -> VoteStoreConfigStatus:
    settings = get_settings()
    configured = _normalize_backend(settings.votes_store)
    dsn = (settings.votes_db_dsn or "").strip()
    dsn_present = bool(dsn)
    require_postgres = bool(settings.votes_require_postgres)
    cloud_run = bool(os.getenv("K_SERVICE"))
    errors: list[str] = []

    if dsn_present:
        selected = "postgres"
    elif configured in ("file", "sqlite"):
        selected = configured
    elif configured == "postgres":
        selected = "postgres"
        errors.append("VOTES_STORE=postgres requires VOTES_DB_DSN to be set.")
    else:
        selected = "file"
        errors.append(
            f"Unsupported VOTES_STORE='{configured}'. Allowed values: file, sqlite, postgres."
        )

    if require_postgres and selected != "postgres":
        errors.append(
            "Postgres vote storage is required but not configured. "
            "Set VOTES_DB_DSN (and attach Cloud SQL on Cloud Run)."
        )

    return VoteStoreConfigStatus(
        ok=len(errors) == 0,
        configured_backend=configured,
        selected_backend=selected,
        dsn_present=dsn_present,
        require_postgres=require_postgres,
        cloud_run=cloud_run,
        errors=tuple(errors),
    )


def get_vote_store_status() -> Dict[str, Any]:
    status = _resolve_vote_store_status()
    return {
        "ok": status.ok,
        "configured_backend": status.configured_backend,
        "selected_backend": status.selected_backend,
        "dsn_present": status.dsn_present,
        "require_postgres": status.require_postgres,
        "cloud_run": status.cloud_run,
        "errors": list(status.errors),
    }


def validate_vote_store_configuration() -> None:
    status = _resolve_vote_store_status()
    if status.ok:
        return
    raise RuntimeError("Invalid vote store configuration: " + " ".join(status.errors))


class FileVoteStore(VoteStore):
    def __init__(self, path: str) -> None:
        self.path = path
        self._votes: List[Dict[str, Any]] = []
        self._scenarios: Dict[str, str] = {}
        self._load()

    def _ensure_dir(self) -> None:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)

    def _load(self) -> None:
        self._ensure_dir()
        if not os.path.exists(self.path):
            self._votes = []
            self._scenarios = {}
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                obj = json.load(f)
                if isinstance(obj, list):
                    self._votes = obj
                    self._scenarios = {}
                elif isinstance(obj, dict):
                    votes = obj.get("votes")
                    scenarios = obj.get("scenarios")
                    self._votes = votes if isinstance(votes, list) else []
                    self._scenarios = scenarios if isinstance(scenarios, dict) else {}
                else:
                    self._votes = []
                    self._scenarios = {}
        except Exception:
            self._votes = []
            self._scenarios = {}

    def _save(self) -> None:
        self._ensure_dir()
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(
                    {"votes": self._votes, "scenarios": self._scenarios},
                    f,
                    ensure_ascii=False,
                    indent=2,
                )
        except Exception:
            pass

    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        normalized = _normalize_meta(meta, user_email)
        ts = float(normalized.get("timestamp") or time.time())
        record = {
            "id": uuid.uuid4().hex,
            "scenarioId": scenario_id,
            "timestamp": ts,
            "userEmail": normalized.get("userEmail"),
            "meta": normalized,
        }
        self._votes.append(record)
        self._save()

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        counts: Dict[str, Dict[str, Any]] = {}
        for vote in self._votes:
            sid = str(vote.get("scenarioId") or "")
            if not sid:
                continue
            entry = counts.setdefault(sid, {"votes": 0, "last_ts": None})
            entry["votes"] += 1
            ts = vote.get("timestamp")
            if isinstance(ts, (int, float)):
                entry["last_ts"] = max(entry["last_ts"] or 0.0, float(ts))
        summaries = [
            VoteSummary(scenario_id=sid, votes=val["votes"], last_vote_ts=val["last_ts"])
            for sid, val in counts.items()
        ]
        summaries.sort(key=lambda s: s.votes, reverse=True)
        return summaries[: max(limit, 0)]

    def save_scenario(self, sid: str, dsl_json: str, meta_json: str | None = None) -> None:
        self._scenarios[sid] = dsl_json
        self._save()

    def get_scenario(self, sid: str) -> Optional[str]:
        return self._scenarios.get(sid)


class SqliteVoteStore(VoteStore):
    def __init__(self, path: str) -> None:
        self.path = path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            apply_migrations(conn, votes_migrations_dir())

    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        normalized = _normalize_meta(meta, user_email)
        ts = float(normalized.get("timestamp") or time.time())
        payload = json.dumps(normalized, ensure_ascii=False)
        vote_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO votes (id, scenario_id, timestamp, user_email, meta_json) VALUES (?, ?, ?, ?, ?)",
                (vote_id, scenario_id, ts, normalized.get("userEmail"), payload),
            )

    def save_scenario(self, sid: str, dsl_json: str, meta_json: str | None = None) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO scenarios (id, dsl_json, meta_json) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    dsl_json = excluded.dsl_json,
                    meta_json = COALESCE(excluded.meta_json, scenarios.meta_json)
                """,
                (sid, dsl_json, meta_json),
            )

    def get_scenario(self, sid: str) -> Optional[str]:
        with self._connect() as conn:
            row = conn.execute("SELECT dsl_json FROM scenarios WHERE id = ?", (sid,)).fetchone()
            return row[0] if row else None

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT scenario_id, COUNT(*) as votes, MAX(timestamp) as last_ts
                FROM votes
                GROUP BY scenario_id
                ORDER BY votes DESC
                LIMIT ?
                """,
                (max(limit, 0),),
            ).fetchall()
        return [
            VoteSummary(scenario_id=row[0], votes=int(row[1]), last_vote_ts=row[2])
            for row in rows
        ]


class PostgresVoteStore(VoteStore):
    def __init__(
        self,
        dsn: str,
        pool_min_size: int,
        pool_max_size: int,
        pool_timeout: float,
        pool_max_idle: float,
        pool_max_lifetime: float,
    ) -> None:
        from psycopg_pool import ConnectionPool

        self.dsn = dsn
        min_size = max(0, pool_min_size)
        max_size = max(min_size if min_size > 0 else 1, pool_max_size)
        self._pool = ConnectionPool(
            conninfo=self.dsn,
            min_size=min_size,
            max_size=max_size,
            timeout=pool_timeout,
            max_idle=pool_max_idle,
            max_lifetime=pool_max_lifetime,
            open=False,
        )
        self._pool.open()
        self._init_db()

    def _init_db(self) -> None:
        with self._pool.connection() as conn:
            apply_migrations(conn, votes_migrations_dir())

    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        normalized = _normalize_meta(meta, user_email)
        ts = float(normalized.get("timestamp") or time.time())
        payload = json.dumps(normalized, ensure_ascii=False)
        vote_id = uuid.uuid4().hex
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                # 1. Insert raw vote
                cur.execute(
                    """
                    INSERT INTO votes (id, scenario_id, timestamp, user_email, meta_json)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (vote_id, scenario_id, ts, normalized.get("userEmail"), payload),
                )
                # 2. Upsert materialization
                cur.execute(
                    """
                    INSERT INTO vote_stats (scenario_id, vote_count, last_ts)
                    VALUES (%s, 1, %s)
                    ON CONFLICT (scenario_id) DO UPDATE SET
                        vote_count = vote_stats.vote_count + 1,
                        last_ts = GREATEST(vote_stats.last_ts, EXCLUDED.last_ts)
                    """,
                    (scenario_id, ts),
                )
            conn.commit()

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(
                        """
                        SELECT scenario_id, vote_count, last_ts
                        FROM vote_stats
                        ORDER BY vote_count DESC
                        LIMIT %s
                        """,
                        (max(limit, 0),),
                    )
                    rows = cur.fetchall()
                except Exception:
                    conn.rollback()
                    return []
                    
        return [
            VoteSummary(scenario_id=row[0], votes=int(row[1]), last_vote_ts=row[2])
            for row in rows
        ]

    def save_scenario(self, sid: str, dsl_json: str, meta_json: str | None = None) -> None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO scenarios (id, dsl_json, meta_json)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        dsl_json = EXCLUDED.dsl_json,
                        meta_json = COALESCE(EXCLUDED.meta_json, scenarios.meta_json)
                    """,
                    (sid, dsl_json, meta_json),
                )
            conn.commit()

    def get_scenario(self, sid: str) -> Optional[str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT dsl_json FROM scenarios WHERE id = %s", (sid,))
                row = cur.fetchone()
                if row:
                    # Return DSL as string (if stored as JSONB, psycopg returns dict, we might need to stringify or just return dict)
                    # The previous code expects a base64 encoded string usually, or just JSON string?
                    # The store previously returned 'dsl_b64' string.
                    # Wait, 'set_dsl' took 'dsl_b64'.
                    # We should store it as JSONB for analytics, but maybe store the raw b64 too?
                    # Or decode before storing.
                    # Let's assume dsl_json input is valid JSON string or dict.
                    # If the input `dsl_b64` is base64 encoded YAML/JSON, we should decode it to store as JSONB.
                    # I'll handle the conversion in `store.py`.
                    # Here we just return the value.
                    return json.dumps(row[0]) if isinstance(row[0], (dict, list)) else str(row[0])
        return None

    def close(self) -> None:
        self._pool.close()


@lru_cache(maxsize=1)
def get_vote_store() -> VoteStore:
    settings = get_settings()
    status = _resolve_vote_store_status()
    if not status.ok:
        raise RuntimeError("Invalid vote store configuration: " + " ".join(status.errors))

    if status.selected_backend == "postgres":
        return PostgresVoteStore(
            settings.votes_db_dsn or "",
            settings.votes_db_pool_min,
            settings.votes_db_pool_max,
            settings.votes_db_pool_timeout,
            settings.votes_db_pool_max_idle,
            settings.votes_db_pool_max_lifetime,
        )

    if status.selected_backend == "sqlite":
        return SqliteVoteStore(settings.votes_sqlite_path)

    if status.cloud_run:
        logger.warning("Using file vote store on Cloud Run; data is ephemeral and not shared across instances.")

    return FileVoteStore(settings.votes_file_path)


def close_vote_store() -> None:
    if get_vote_store.cache_info().currsize == 0:
        return
    try:
        get_vote_store().close()
    except Exception:
        pass
