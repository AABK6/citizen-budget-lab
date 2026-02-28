#!/usr/bin/env python3
"""Exact SQL write dump for human live journeys."""

from __future__ import annotations

import argparse
import base64
import json
import os
from typing import Any

try:
    import psycopg  # type: ignore
except Exception:  # pragma: no cover
    psycopg = None


DECREASE_OPS = {"decrease", "reduce", "lower"}
INCREASE_OPS = {"increase", "raise"}


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
    since_epoch: float | None,
) -> list[dict[str, Any]]:
    sql = """
    SELECT
      id,
      scenario_id,
      timestamp,
      user_email,
      meta_json::text,
      meta_json::jsonb
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
        parsed_meta = row[5] if isinstance(row[5], dict) else {}
        out.append(
            {
                "id": str(row[0]),
                "scenario_id": str(row[1]),
                "timestamp": float(row[2]) if row[2] is not None else None,
                "user_email": row[3],
                "meta_json_raw": str(row[4]) if row[4] is not None else "{}",
                "meta_json": parsed_meta,
            }
        )
    return out


def _fetch_vote_stats(dsn: str, scenario_ids: list[str]) -> list[dict[str, Any]]:
    if not scenario_ids:
        return []
    sql = """
    SELECT scenario_id, vote_count::INT, last_ts
    FROM vote_stats
    WHERE scenario_id = ANY(%s)
    ORDER BY scenario_id ASC
    """
    with _connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (scenario_ids,))
            rows = cur.fetchall()

    return [
        {
            "scenario_id": str(row[0]),
            "vote_count": int(row[1]),
            "last_ts": float(row[2]) if row[2] is not None else None,
        }
        for row in rows
    ]


def _fetch_scenarios(dsn: str, scenario_ids: list[str]) -> list[dict[str, Any]]:
    if not scenario_ids:
        return []
    sql = """
    SELECT
      id,
      created_at,
      dsl_json::text,
      dsl_json::jsonb,
      meta_json::text,
      meta_json::jsonb
    FROM scenarios
    WHERE id = ANY(%s)
    ORDER BY created_at ASC NULLS LAST, id ASC
    """
    with _connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (scenario_ids,))
            rows = cur.fetchall()

    out: list[dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "id": str(row[0]),
                "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
                "dsl_json_raw": str(row[2]) if row[2] is not None else "{}",
                "dsl_json": row[3] if isinstance(row[3], dict) else {},
                "meta_json_raw": str(row[4]) if row[4] is not None else None,
                "meta_json": row[5] if isinstance(row[5], dict) else None,
            }
        )
    return out


def _decode_snapshot(snapshot_b64: str | None) -> dict[str, Any]:
    if not snapshot_b64:
        return {
            "present": False,
            "decoded": None,
            "error": None,
        }

    text = str(snapshot_b64).strip()
    if not text:
        return {
            "present": False,
            "decoded": None,
            "error": None,
        }

    padded = text + ("=" * ((4 - (len(text) % 4)) % 4))
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
    except Exception as exc:
        return {
            "present": True,
            "decoded": None,
            "error": f"base64 decode failed: {exc}",
        }

    try:
        decoded_text = raw.decode("utf-8")
    except Exception as exc:
        return {
            "present": True,
            "decoded": None,
            "error": f"utf8 decode failed: {exc}",
        }

    try:
        decoded_obj = json.loads(decoded_text)
    except json.JSONDecodeError as exc:
        return {
            "present": True,
            "decoded": None,
            "error": f"json parse failed: {exc}",
            "decoded_text": decoded_text,
        }

    return {
        "present": True,
        "decoded": decoded_obj,
        "error": None,
    }


def _direction_from_op(op: str) -> str:
    value = (op or "").strip().lower()
    if value in DECREASE_OPS:
        return "decrease"
    if value in INCREASE_OPS:
        return "increase"
    if not value:
        return "unspecified"
    return value


def _extract_actions(
    scenario_dsl: dict[str, Any],
    snapshot_decoded: dict[str, Any] | None,
) -> tuple[str, int | None, list[dict[str, Any]], list[str] | None]:
    if isinstance(snapshot_decoded, dict):
        dsl = snapshot_decoded.get("dsl")
        if isinstance(dsl, dict):
            baseline = dsl.get("baselineYear")
            actions = dsl.get("actions")
            if isinstance(actions, list):
                valid = [a for a in actions if isinstance(a, dict)]
                return "snapshot.dsl.actions", baseline if isinstance(baseline, int) else None, valid, None
            action_ids = dsl.get("actionIds")
            if isinstance(action_ids, list):
                ids = [str(x) for x in action_ids]
                return "snapshot.dsl.actionIds", baseline if isinstance(baseline, int) else None, [], ids

    actions = scenario_dsl.get("actions") if isinstance(scenario_dsl, dict) else None
    baseline = scenario_dsl.get("baseline_year") if isinstance(scenario_dsl, dict) else None
    if isinstance(actions, list):
        valid = [a for a in actions if isinstance(a, dict)]
        return "scenarios.dsl_json.actions", baseline if isinstance(baseline, int) else None, valid, None

    return "none", None, [], None


def _classify_actions(
    actions: list[dict[str, Any]],
    action_ids_only: list[str] | None,
) -> dict[str, Any]:
    reforms_selected: list[dict[str, Any]] = []
    spending_preferences: list[dict[str, Any]] = []
    tax_preferences: list[dict[str, Any]] = []
    other_actions: list[dict[str, Any]] = []
    summaries: list[str] = []

    for action in actions:
        aid = str(action.get("id") or "")
        target = str(action.get("target") or "")
        op = str(action.get("op") or "")
        direction = _direction_from_op(op)
        amount_eur = action.get("amount_eur")
        delta_pct = action.get("delta_pct")
        delta_bps = action.get("delta_bps")

        common = {
            "id": aid,
            "target": target,
            "op": op,
            "direction": direction,
            "amount_eur": amount_eur,
            "delta_pct": delta_pct,
            "delta_bps": delta_bps,
        }

        if target.startswith(("piece.", "lever.")):
            reforms_selected.append(common)
            summaries.append(
                f"reform {aid or target} direction={direction} amount_eur={amount_eur} delta_pct={delta_pct} delta_bps={delta_bps}"
            )
        elif target.startswith(("mission.", "cofog.")):
            spending_preferences.append(common)
            summaries.append(
                f"spending {target} direction={direction} amount_eur={amount_eur} delta_pct={delta_pct}"
            )
        elif target.startswith("tax."):
            tax_preferences.append(common)
            summaries.append(
                f"tax {target} direction={direction} delta_bps={delta_bps}"
            )
        else:
            other_actions.append(common)
            summaries.append(
                f"other {target or aid or '<unknown>'} direction={direction}"
            )

    if action_ids_only:
        for aid in action_ids_only:
            reforms_selected.append(
                {
                    "id": aid,
                    "target": None,
                    "op": None,
                    "direction": "unspecified",
                    "amount_eur": None,
                    "delta_pct": None,
                    "delta_bps": None,
                    "source": "snapshot.dsl.actionIds",
                }
            )
        summaries.append(
            f"snapshot provided only actionIds (count={len(action_ids_only)})"
        )

    return {
        "reforms_selected": reforms_selected,
        "spending_preferences": spending_preferences,
        "tax_preferences": tax_preferences,
        "other_actions": other_actions,
        "action_summaries": summaries,
    }


def run_sql_write_dump(
    dsn: str,
    respondent_prefix: str,
    since_epoch: float | None,
    expected_scenario_ids: list[str],
    expected_respondents: list[str],
) -> dict[str, Any]:
    votes = _fetch_votes_for_prefix(
        dsn=dsn,
        respondent_prefix=respondent_prefix,
        since_epoch=since_epoch,
    )

    scenario_ids = sorted(
        {
            *[str(sid) for sid in expected_scenario_ids],
            *[str(v.get("scenario_id")) for v in votes if v.get("scenario_id")],
        }
    )

    vote_stats_rows = _fetch_vote_stats(dsn, scenario_ids)
    scenarios_rows = _fetch_scenarios(dsn, scenario_ids)
    scenario_map = {str(row["id"]): row for row in scenarios_rows}

    respondent_ids_found = sorted(
        {
            str((v.get("meta_json") or {}).get("respondentId") or "")
            for v in votes
            if (v.get("meta_json") or {}).get("respondentId")
        }
    )

    missing_expected_respondents = [
        rid for rid in expected_respondents if rid not in respondent_ids_found
    ]

    final_preferences: list[dict[str, Any]] = []
    decoded_snapshots: list[dict[str, Any]] = []

    for vote in votes:
        meta = vote.get("meta_json") or {}
        scenario_id = str(vote.get("scenario_id") or "")
        scenario_row = scenario_map.get(scenario_id) or {}
        scenario_dsl = scenario_row.get("dsl_json") or {}

        snapshot_payload = _decode_snapshot(meta.get("finalVoteSnapshotB64"))
        snapshot_decoded = (
            snapshot_payload.get("decoded")
            if isinstance(snapshot_payload.get("decoded"), dict)
            else None
        )

        action_source, baseline_year, actions, action_ids_only = _extract_actions(
            scenario_dsl=scenario_dsl,
            snapshot_decoded=snapshot_decoded,
        )

        classified = _classify_actions(actions=actions, action_ids_only=action_ids_only)

        final_preferences.append(
            {
                "vote_id": vote.get("id"),
                "scenario_id": scenario_id,
                "respondent_id": meta.get("respondentId"),
                "channel": meta.get("channel"),
                "entry_path": meta.get("entryPath"),
                "session_duration_sec": meta.get("sessionDurationSec"),
                "snapshot_version": meta.get("finalVoteSnapshotVersion"),
                "snapshot_sha256": meta.get("finalVoteSnapshotSha256"),
                "snapshot_truncated": meta.get("finalVoteSnapshotTruncated"),
                "snapshot_mode_detected": action_source,
                "baseline_year": baseline_year,
                "macro_outcome": (snapshot_decoded or {}).get("outcome") if snapshot_decoded else None,
                "action_count": len(actions) if actions else (len(action_ids_only or [])),
                **classified,
            }
        )

        decoded_snapshots.append(
            {
                "vote_id": vote.get("id"),
                "scenario_id": scenario_id,
                "respondent_id": meta.get("respondentId"),
                "snapshot": snapshot_payload,
            }
        )

    vote_stats_map = {str(row["scenario_id"]): int(row["vote_count"]) for row in vote_stats_rows}
    tagged_count_by_scenario: dict[str, int] = {}
    for vote in votes:
        sid = str(vote.get("scenario_id") or "")
        tagged_count_by_scenario[sid] = tagged_count_by_scenario.get(sid, 0) + 1

    vote_stats_before_after = []
    for sid in scenario_ids:
        after_count = int(vote_stats_map.get(sid, 0))
        tagged_count = int(tagged_count_by_scenario.get(sid, 0))
        before_estimate = max(0, after_count - tagged_count)
        vote_stats_before_after.append(
            {
                "scenario_id": sid,
                "before_vote_count_estimate": before_estimate,
                "tagged_votes_count": tagged_count,
                "after_vote_count": after_count,
                "note": "before is derived as after - tagged_votes_count",
            }
        )

    ok = len(votes) > 0 and len(missing_expected_respondents) == 0

    return {
        "ok": ok,
        "respondent_prefix": respondent_prefix,
        "since_epoch": since_epoch,
        "votes_found": len(votes),
        "scenario_ids": scenario_ids,
        "respondent_ids_found": respondent_ids_found,
        "expected_respondents": expected_respondents,
        "missing_expected_respondents": missing_expected_respondents,
        "votes_rows_full": [
            {
                "id": vote["id"],
                "scenario_id": vote["scenario_id"],
                "timestamp": vote["timestamp"],
                "user_email": vote["user_email"],
                "meta_json_raw": vote["meta_json_raw"],
                "meta_json": vote["meta_json"],
            }
            for vote in votes
        ],
        "vote_stats_rows": vote_stats_rows,
        "vote_stats_before_after": vote_stats_before_after,
        "scenarios_rows": [
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "dsl_json_raw": row["dsl_json_raw"],
                "dsl_json": row["dsl_json"],
                "meta_json_raw": row["meta_json_raw"],
                "meta_json": row["meta_json"],
            }
            for row in scenarios_rows
        ],
        "decoded_snapshots": decoded_snapshots,
        "final_preferences": final_preferences,
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Dump exact SQL writes for tagged human live journeys.")
    parser.add_argument("--dsn", default=os.getenv("LIVE_TESTS_VOTES_DSN") or os.getenv("VOTES_DB_DSN"))
    parser.add_argument("--respondent-prefix", required=True)
    parser.add_argument("--since-epoch", type=float, default=None)
    parser.add_argument("--scenario-id", action="append", default=[])
    parser.add_argument("--expected-respondent", action="append", default=[])
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if not args.dsn:
        raise SystemExit("Missing --dsn (or LIVE_TESTS_VOTES_DSN / VOTES_DB_DSN).")

    result = run_sql_write_dump(
        dsn=args.dsn,
        respondent_prefix=args.respondent_prefix,
        since_epoch=args.since_epoch,
        expected_scenario_ids=[str(x) for x in args.scenario_id],
        expected_respondents=[str(x) for x in args.expected_respondent],
    )
    text = json.dumps(result, indent=2, ensure_ascii=False)
    print(text)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(_main())
