from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional

from .settings import get_settings


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
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS votes (
                    id TEXT PRIMARY KEY,
                    scenario_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    user_email TEXT,
                    meta_json TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS votes_scenario_idx ON votes (scenario_id)"
            )

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
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn
        self._init_db()

    def _connect(self):
        import psycopg

        return psycopg.connect(self.dsn)

    def _init_db(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS votes (
                        id TEXT PRIMARY KEY,
                        scenario_id TEXT NOT NULL,
                        timestamp DOUBLE PRECISION NOT NULL,
                        user_email TEXT,
                        meta_json TEXT NOT NULL
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS votes_scenario_idx ON votes (scenario_id)"
                )
            conn.commit()

    def add_vote(self, scenario_id: str, user_email: Optional[str], meta: Dict[str, Any]) -> None:
        normalized = _normalize_meta(meta, user_email)
        ts = float(normalized.get("timestamp") or time.time())
        payload = json.dumps(normalized, ensure_ascii=False)
        vote_id = uuid.uuid4().hex
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO votes (id, scenario_id, timestamp, user_email, meta_json)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (vote_id, scenario_id, ts, normalized.get("userEmail"), payload),
                )
            conn.commit()

    def summary(self, limit: int = 25) -> List[VoteSummary]:
        with self._connect() as conn:
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


@lru_cache(maxsize=1)
def get_vote_store() -> VoteStore:
    settings = get_settings()
    store = str(settings.votes_store or "file").lower()
    if store == "postgres":
        if not settings.votes_db_dsn:
            raise RuntimeError("VOTES_DB_DSN is required for postgres vote storage")
        return PostgresVoteStore(settings.votes_db_dsn)
    if store == "sqlite":
        return SqliteVoteStore(settings.votes_sqlite_path)
    return FileVoteStore(settings.votes_file_path)
