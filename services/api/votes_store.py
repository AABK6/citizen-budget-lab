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


class VoteStore:
    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        raise NotImplementedError

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        raise NotImplementedError

    def close(self) -> None:
        pass


def _normalize_meta(meta: Optional[Dict[str, Any]], user_email: Optional[str]) -> Dict[str, Any]:
    normalized = dict(meta or {})
    if user_email and not normalized.get("userEmail"):
        normalized["userEmail"] = user_email
    return normalized


class FileVoteStore(VoteStore):
    def __init__(self, path: str) -> None:
        self.path = path
        self._votes: List[Dict[str, Any]] = []
        self._load()

    def _ensure_dir(self) -> None:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)

    def _load(self) -> None:
        self._ensure_dir()
        if not os.path.exists(self.path):
            self._votes = []
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                obj = json.load(f)
                if isinstance(obj, list):
                    self._votes = obj
                else:
                    self._votes = []
        except Exception:
            self._votes = []

    def _save(self) -> None:
        self._ensure_dir()
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(self._votes, f, ensure_ascii=False, indent=2)
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
                # 2. Upsert materialization (if vote_stats table exists)
                # We assume migration 004 applied.
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
                # Read from materialized view for performance
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
                    # Fallback if table missing or error (e.g. migration not applied yet)
                    conn.rollback()
                    return self._summary_fallback(limit)
                    
        return [
            VoteSummary(scenario_id=row[0], votes=int(row[1]), last_vote_ts=row[2])
            for row in rows
        ]

    def _summary_fallback(self, limit: int) -> List[VoteSummary]:
        # Old slow method
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT scenario_id, COUNT(*) as votes, MAX(timestamp) as last_ts
                    FROM votes
                    GROUP BY scenario_id
                    ORDER BY votes DESC
                    LIMIT %s
                    """,
                    (max(limit, 0),),
                )
                rows = cur.fetchall()
        return [
            VoteSummary(scenario_id=row[0], votes=int(row[1]), last_vote_ts=row[2])
            for row in rows
        ]

    def close(self) -> None:
        self._pool.close()


class FirestoreVoteStore(VoteStore):
    def __init__(self, project: Optional[str] = None):
        try:
            from google.cloud import firestore
        except ImportError:
            raise ImportError("google-cloud-firestore is required for FirestoreVoteStore")
        
        self.db = firestore.Client(project=project)
        self.collection_votes = self.db.collection("votes")
        self.collection_stats = self.db.collection("vote_stats")

    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        from google.cloud import firestore
        
        normalized = _normalize_meta(meta, user_email)
        ts = float(normalized.get("timestamp") or time.time())
        record = {
            "scenarioId": scenario_id,
            "timestamp": ts,
            "userEmail": normalized.get("userEmail"),
            "meta": normalized,
        }
        # Add raw vote
        self.collection_votes.add(record)
        
        # Update materialization
        doc_ref = self.collection_stats.document(scenario_id)
        doc_ref.set({
            "vote_count": firestore.Increment(1),
            "last_ts": ts 
        }, merge=True)

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        docs = self.collection_stats.order_by("vote_count", direction="DESCENDING").limit(limit).stream()
        return [
            VoteSummary(scenario_id=d.id, votes=d.get("vote_count") or 0, last_vote_ts=d.get("last_ts"))
            for d in docs
        ]

    def close(self) -> None:
        self.db.close()


class HybridVoteStore(VoteStore):
    """
    Writes to both Primary and Secondary.
    Reads from Primary.
    """
    def __init__(self, primary: VoteStore, secondary: VoteStore):
        self.primary = primary
        self.secondary = secondary

    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        # Write to primary first (critical path)
        self.primary.add_vote(scenario_id, user_email, meta)
        
        # Write to secondary (best effort)
        try:
            self.secondary.add_vote(scenario_id, user_email, meta)
        except Exception as e:
            logger.warning("HybridVoteStore: Failed to write to secondary store: %s", e)

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        return self.primary.summary(limit)

    def close(self) -> None:
        self.primary.close()
        self.secondary.close()


@lru_cache(maxsize=1)
def get_vote_store() -> VoteStore:
    settings = get_settings()
    store = str(settings.votes_store or "file").lower()
    
    # Helper to create Postgres Store
    def create_postgres() -> PostgresVoteStore:
        if not settings.votes_db_dsn:
            raise RuntimeError("VOTES_DB_DSN is required for postgres vote storage")
        return PostgresVoteStore(
            settings.votes_db_dsn,
            settings.votes_db_pool_min,
            settings.votes_db_pool_max,
            settings.votes_db_pool_timeout,
            settings.votes_db_pool_max_idle,
            settings.votes_db_pool_max_lifetime,
        )

    # Helper to create Firestore Store
    def create_firestore() -> FirestoreVoteStore:
        return FirestoreVoteStore() # Uses GOOGLE_APPLICATION_CREDENTIALS

    if store == "postgres":
        return create_postgres()
    
    if store == "firestore":
        return create_firestore()

    if store == "hybrid":
        # Default hybrid: Postgres Primary, Firestore Secondary
        # In a real app, this might be configurable.
        pg = create_postgres()
        fs = create_firestore()
        return HybridVoteStore(primary=pg, secondary=fs)

    if store == "sqlite":
        return SqliteVoteStore(settings.votes_sqlite_path)
        
    return FileVoteStore(settings.votes_file_path)


def close_vote_store() -> None:
    if get_vote_store.cache_info().currsize == 0:
        return
    try:
        get_vote_store().close()
    except Exception:
        pass
