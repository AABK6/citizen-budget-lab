#!/usr/bin/env python3
"""Forensic SQL assertions for live vote pipeline runs."""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from typing import Any

try:
    import psycopg  # type: ignore
except Exception:  # pragma: no cover - environment-dependent
    psycopg = None


ALLOWED_CHANNELS = {"qualtrics", "direct", "unknown"}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
B64URLISH_RE = re.compile(r"^[A-Za-z0-9\-_]+=*$")


@dataclass
class ValidationIssue:
    vote_id: str
    field: str
    detail: str


def _connect(dsn: str):
    if psycopg is None:
        raise RuntimeError(
            "psycopg is not installed in this interpreter. "
            "Use the project venv or install psycopg[binary]."
        )
    return psycopg.connect(dsn)


def _fetch_votes_for_prefix(
    dsn: str,
    respondent_prefix: str,
    since_epoch: float | None = None,
) -> list[dict[str, Any]]:
    sql = """
    SELECT id, scenario_id, timestamp, user_email, meta_json::jsonb
    FROM votes
    WHERE (meta_json::jsonb ->> 'respondentId') LIKE %s
    """
    params: list[Any] = [f"{respondent_prefix}%"]
    if since_epoch is not None:
        sql += " AND timestamp >= %s"
        params.append(float(since_epoch))
    sql += " ORDER BY timestamp ASC"

    with _connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    out: list[dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "id": str(row[0]),
                "scenario_id": str(row[1]),
                "timestamp": float(row[2]) if row[2] is not None else None,
                "user_email": row[3],
                "meta": row[4] if isinstance(row[4], dict) else {},
            }
        )
    return out


def _validate_vote_meta(votes: list[dict[str, Any]], respondent_prefix: str) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    for vote in votes:
        vid = str(vote["id"])
        meta = vote.get("meta") or {}
        respondent_id = str(meta.get("respondentId") or "")
        if not respondent_id.startswith(respondent_prefix):
            issues.append(ValidationIssue(vid, "respondentId", "does not start with run prefix"))
        if len(respondent_id) > 128:
            issues.append(ValidationIssue(vid, "respondentId", "length > 128"))

        session = meta.get("sessionDurationSec")
        if session is not None:
            try:
                session_val = float(session)
                if session_val < 0 or session_val > 21600:
                    issues.append(ValidationIssue(vid, "sessionDurationSec", "outside [0,21600]"))
            except (TypeError, ValueError):
                issues.append(ValidationIssue(vid, "sessionDurationSec", "not numeric"))

        channel = meta.get("channel")
        if channel is not None and str(channel) not in ALLOWED_CHANNELS:
            issues.append(ValidationIssue(vid, "channel", f"invalid value '{channel}'"))

        entry_path = meta.get("entryPath")
        if entry_path is not None and len(str(entry_path)) > 1024:
            issues.append(ValidationIssue(vid, "entryPath", "length > 1024"))

        version = meta.get("finalVoteSnapshotVersion")
        if version is not None:
            try:
                ival = int(version)
                if ival < 1 or ival > 100:
                    issues.append(ValidationIssue(vid, "finalVoteSnapshotVersion", "outside [1,100]"))
            except (TypeError, ValueError):
                issues.append(ValidationIssue(vid, "finalVoteSnapshotVersion", "not integer"))

        sha = meta.get("finalVoteSnapshotSha256")
        if sha is not None:
            sval = str(sha).strip().lower()
            if not SHA256_RE.match(sval):
                issues.append(ValidationIssue(vid, "finalVoteSnapshotSha256", "invalid hex-64"))

        snap_b64 = meta.get("finalVoteSnapshotB64")
        if snap_b64 is not None:
            b64v = str(snap_b64).strip()
            if len(b64v) > 30000:
                issues.append(ValidationIssue(vid, "finalVoteSnapshotB64", "length > 30000"))
            elif not B64URLISH_RE.match(b64v):
                issues.append(ValidationIssue(vid, "finalVoteSnapshotB64", "invalid base64url-ish format"))

        truncated = meta.get("finalVoteSnapshotTruncated")
        if truncated is not None and not isinstance(truncated, bool):
            issues.append(ValidationIssue(vid, "finalVoteSnapshotTruncated", "not a boolean"))

        if "timestamp" not in meta:
            issues.append(ValidationIssue(vid, "timestamp", "missing in meta_json"))
    return issues


def _count_votes_by_scenario(dsn: str, scenario_ids: list[str]) -> dict[str, int]:
    if not scenario_ids:
        return {}
    sql = """
    SELECT scenario_id, COUNT(*)::INT
    FROM votes
    WHERE scenario_id = ANY(%s)
    GROUP BY scenario_id
    """
    with _connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (scenario_ids,))
            rows = cur.fetchall()
    return {str(row[0]): int(row[1]) for row in rows}


def _read_vote_stats(dsn: str, scenario_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not scenario_ids:
        return {}
    sql = """
    SELECT scenario_id, vote_count::INT, last_ts
    FROM vote_stats
    WHERE scenario_id = ANY(%s)
    """
    with _connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (scenario_ids,))
            rows = cur.fetchall()
    out: dict[str, dict[str, Any]] = {}
    for row in rows:
        out[str(row[0])] = {"vote_count": int(row[1]), "last_ts": float(row[2]) if row[2] is not None else None}
    return out


def _read_scenarios_presence(dsn: str, scenario_ids: list[str]) -> dict[str, bool]:
    if not scenario_ids:
        return {}
    sql = """
    SELECT id, (dsl_json IS NOT NULL) AS has_dsl
    FROM scenarios
    WHERE id = ANY(%s)
    """
    with _connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (scenario_ids,))
            rows = cur.fetchall()
    out = {sid: False for sid in scenario_ids}
    for row in rows:
        out[str(row[0])] = bool(row[1])
    return out


def run_sql_assertions(
    dsn: str,
    respondent_prefix: str,
    expected_scenario_ids: list[str],
    since_epoch: float | None = None,
) -> dict[str, Any]:
    votes = _fetch_votes_for_prefix(
        dsn=dsn,
        respondent_prefix=respondent_prefix,
        since_epoch=since_epoch,
    )
    issues = _validate_vote_meta(votes, respondent_prefix=respondent_prefix)
    scenario_ids_from_votes = sorted({str(v["scenario_id"]) for v in votes})
    scenario_ids = sorted(set(expected_scenario_ids + scenario_ids_from_votes))

    vote_counts = _count_votes_by_scenario(dsn, scenario_ids)
    vote_stats = _read_vote_stats(dsn, scenario_ids)
    scenario_presence = _read_scenarios_presence(dsn, scenario_ids)

    count_mismatches: list[dict[str, Any]] = []
    for sid in scenario_ids:
        direct_count = int(vote_counts.get(sid, 0))
        stats_count = int(vote_stats.get(sid, {}).get("vote_count", 0))
        if direct_count != stats_count:
            count_mismatches.append(
                {
                    "scenario_id": sid,
                    "votes_count": direct_count,
                    "vote_stats_count": stats_count,
                }
            )

    missing_scenarios = [sid for sid in expected_scenario_ids if not scenario_presence.get(sid, False)]
    ok = (
        len(votes) > 0
        and len(issues) == 0
        and len(count_mismatches) == 0
        and len(missing_scenarios) == 0
    )

    return {
        "ok": ok,
        "respondent_prefix": respondent_prefix,
        "votes_found": len(votes),
        "scenario_ids": scenario_ids,
        "issues": [issue.__dict__ for issue in issues],
        "count_mismatches": count_mismatches,
        "missing_scenarios": missing_scenarios,
        "vote_counts": vote_counts,
        "vote_stats": vote_stats,
        "scenario_presence": scenario_presence,
        "sample_votes": votes[:20],
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Run forensic SQL assertions for live vote tests.")
    parser.add_argument("--dsn", default=os.getenv("LIVE_TESTS_VOTES_DSN") or os.getenv("VOTES_DB_DSN"))
    parser.add_argument("--respondent-prefix", required=True)
    parser.add_argument("--scenario-id", action="append", default=[])
    parser.add_argument("--since-epoch", type=float, default=None)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if not args.dsn:
        raise SystemExit("Missing --dsn (or LIVE_TESTS_VOTES_DSN / VOTES_DB_DSN).")

    result = run_sql_assertions(
        dsn=args.dsn,
        respondent_prefix=args.respondent_prefix,
        expected_scenario_ids=[str(x) for x in args.scenario_id],
        since_epoch=args.since_epoch,
    )
    text = json.dumps(result, indent=2, ensure_ascii=False)
    print(text)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(_main())
