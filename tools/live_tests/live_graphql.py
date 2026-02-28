#!/usr/bin/env python3
"""Live GraphQL helpers for production vote-pipeline verification."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


REQUIRED_SUBMIT_VOTE_ARGS = [
    "scenarioId",
    "userEmail",
    "respondentId",
    "sessionDurationSec",
    "channel",
    "entryPath",
    "finalVoteSnapshotB64",
    "finalVoteSnapshotSha256",
    "finalVoteSnapshotVersion",
    "finalVoteSnapshotTruncated",
]


RUN_SCENARIO_MUTATION = """
mutation RunScenario($dsl: String!, $lens: LensEnum!) {
  runScenario(input: { dsl: $dsl, lens: $lens }) {
    id
    scenarioId
  }
}
"""


SUBMIT_VOTE_MUTATION = """
mutation SubmitVote(
  $scenarioId: ID!,
  $userEmail: String,
  $respondentId: String,
  $sessionDurationSec: Float,
  $channel: String,
  $entryPath: String,
  $finalVoteSnapshotB64: String,
  $finalVoteSnapshotSha256: String,
  $finalVoteSnapshotVersion: Int,
  $finalVoteSnapshotTruncated: Boolean
) {
  submitVote(
    scenarioId: $scenarioId,
    userEmail: $userEmail,
    respondentId: $respondentId,
    sessionDurationSec: $sessionDurationSec,
    channel: $channel,
    entryPath: $entryPath,
    finalVoteSnapshotB64: $finalVoteSnapshotB64,
    finalVoteSnapshotSha256: $finalVoteSnapshotSha256,
    finalVoteSnapshotVersion: $finalVoteSnapshotVersion,
    finalVoteSnapshotTruncated: $finalVoteSnapshotTruncated
  )
}
"""


VOTE_SUMMARY_QUERY = """
query VoteSummary($limit: Int!) {
  voteSummary(limit: $limit) {
    scenarioId
    votes
    lastVoteTs
  }
}
"""


SCENARIO_QUERY = """
query Scenario($id: ID!) {
  scenario(id: $id) {
    dsl
  }
}
"""


@dataclass
class GraphQLResult:
    ok: bool
    data: dict[str, Any] | None
    errors: list[Any]
    status_code: int
    raw: dict[str, Any]


def _post_json(url: str, payload: dict[str, Any], timeout_sec: float = 30.0) -> tuple[int, dict[str, Any]]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as response:
        status = int(getattr(response, "status", 200))
        text = response.read().decode("utf-8")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"_invalid_json": text}
    return status, parsed


def gql_request(
    graphql_url: str,
    query: str,
    variables: dict[str, Any] | None = None,
    timeout_sec: float = 30.0,
) -> GraphQLResult:
    payload = {"query": query, "variables": variables or {}}
    try:
        status, raw = _post_json(graphql_url, payload, timeout_sec=timeout_sec)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return GraphQLResult(
            ok=False,
            data=None,
            errors=[{"message": f"HTTPError {exc.code}", "body": body}],
            status_code=int(exc.code),
            raw={"_http_error_body": body},
        )
    except Exception as exc:
        return GraphQLResult(
            ok=False,
            data=None,
            errors=[{"message": str(exc)}],
            status_code=0,
            raw={},
        )

    errors = raw.get("errors") if isinstance(raw, dict) else None
    data = raw.get("data") if isinstance(raw, dict) else None
    return GraphQLResult(
        ok=(status == 200 and not errors and isinstance(data, dict)),
        data=data if isinstance(data, dict) else None,
        errors=errors if isinstance(errors, list) else ([] if errors is None else [errors]),
        status_code=status,
        raw=raw if isinstance(raw, dict) else {"_raw": raw},
    )


def check_submit_vote_contract(graphql_url: str) -> dict[str, Any]:
    query = """
    query {
      __schema {
        mutationType {
          fields {
            name
            args { name }
          }
        }
      }
    }
    """
    result = gql_request(graphql_url, query)
    runtime_args: list[str] = []
    if result.ok and result.data:
        fields = (
            result.data.get("__schema", {})
            .get("mutationType", {})
            .get("fields", [])
        )
        if isinstance(fields, list):
            for field in fields:
                if not isinstance(field, dict):
                    continue
                if field.get("name") != "submitVote":
                    continue
                runtime_args = [
                    str(arg.get("name"))
                    for arg in field.get("args", [])
                    if isinstance(arg, dict) and arg.get("name")
                ]
                break
    missing = [name for name in REQUIRED_SUBMIT_VOTE_ARGS if name not in runtime_args]
    return {
        "ok": result.ok and len(missing) == 0,
        "status_code": result.status_code,
        "errors": result.errors,
        "runtime_args": runtime_args,
        "missing_args": missing,
    }


def _encode_dsl_yaml_for_run(year: int) -> str:
    # Keep a deterministic tiny scenario to avoid accidental huge impacts.
    yaml_text = f"""version: 0.1
baseline_year: {year}
assumptions:
  horizon_years: 3
actions:
  - id: live_test_raise_transport
    target: mission.M_TRANS
    dimension: cp
    op: increase
    amount_eur: 100000000
"""
    return base64.b64encode(yaml_text.encode("utf-8")).decode("ascii")


def run_scenario(graphql_url: str, year: int = 2026, lens: str = "ADMIN") -> dict[str, Any]:
    dsl_b64 = _encode_dsl_yaml_for_run(year)
    res = gql_request(
        graphql_url,
        RUN_SCENARIO_MUTATION,
        {"dsl": dsl_b64, "lens": lens},
    )
    run_payload = (res.data or {}).get("runScenario") if res.data else None
    scenario_id = None
    if isinstance(run_payload, dict):
        scenario_id = run_payload.get("id") or run_payload.get("scenarioId")
    return {
        "ok": bool(res.ok and scenario_id),
        "scenario_id": str(scenario_id) if scenario_id else None,
        "result": run_payload,
        "errors": res.errors,
        "status_code": res.status_code,
    }


def get_scenario_dsl(graphql_url: str, scenario_id: str) -> dict[str, Any]:
    res = gql_request(graphql_url, SCENARIO_QUERY, {"id": scenario_id})
    node = (res.data or {}).get("scenario") if res.data else None
    dsl = node.get("dsl") if isinstance(node, dict) else None
    return {
        "ok": bool(res.ok and isinstance(dsl, str) and dsl.strip()),
        "dsl_present": bool(isinstance(dsl, str) and dsl.strip()),
        "errors": res.errors,
        "status_code": res.status_code,
    }


def _make_snapshot_payload(
    scenario_id: str,
    respondent_id: str,
    channel: str,
    entry_path: str,
    session_duration_sec: float,
    truncated: bool,
) -> tuple[str, str]:
    payload = {
        "v": 1,
        "scenarioId": scenario_id,
        "respondentId": respondent_id,
        "channel": channel,
        "entryPath": entry_path,
        "sessionDurationSec": session_duration_sec,
        "submittedAt": int(time.time()),
        "outcome": {"resolutionPct": 50.0},
    }
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    sha = hashlib.sha256(raw).hexdigest()
    if truncated:
        # Keep payload valid while explicitly marking "truncated" at mutation level.
        b64 = b64[: min(len(b64), 500)]
    return b64, sha


def submit_vote(
    graphql_url: str,
    scenario_id: str,
    respondent_id: str,
    channel: str,
    entry_path: str,
    session_duration_sec: float,
    truncated: bool = False,
    user_email: str | None = None,
    override_fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
    snap_b64, snap_sha = _make_snapshot_payload(
        scenario_id=scenario_id,
        respondent_id=respondent_id,
        channel=channel,
        entry_path=entry_path,
        session_duration_sec=session_duration_sec,
        truncated=truncated,
    )
    variables: dict[str, Any] = {
        "scenarioId": scenario_id,
        "userEmail": user_email,
        "respondentId": respondent_id,
        "sessionDurationSec": session_duration_sec,
        "channel": channel,
        "entryPath": entry_path,
        "finalVoteSnapshotB64": snap_b64,
        "finalVoteSnapshotSha256": snap_sha,
        "finalVoteSnapshotVersion": 1,
        "finalVoteSnapshotTruncated": truncated,
    }
    if override_fields:
        variables.update(override_fields)

    res = gql_request(graphql_url, SUBMIT_VOTE_MUTATION, variables)
    vote_ok = bool((res.data or {}).get("submitVote")) if res.data else False
    return {
        "ok": bool(res.ok and vote_ok),
        "vote_ok": vote_ok,
        "status_code": res.status_code,
        "errors": res.errors,
        "request_variables": variables,
        "raw": res.raw,
    }


def vote_summary(graphql_url: str, limit: int = 1000) -> dict[str, Any]:
    res = gql_request(graphql_url, VOTE_SUMMARY_QUERY, {"limit": int(limit)})
    rows = (res.data or {}).get("voteSummary") if res.data else None
    mapped: dict[str, dict[str, Any]] = {}
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            sid = row.get("scenarioId")
            if not sid:
                continue
            mapped[str(sid)] = {
                "votes": int(row.get("votes") or 0),
                "lastVoteTs": row.get("lastVoteTs"),
            }
    return {
        "ok": res.ok,
        "status_code": res.status_code,
        "errors": res.errors,
        "rows": rows if isinstance(rows, list) else [],
        "map": mapped,
    }


def wait_for_vote_increment(
    graphql_url: str,
    scenario_id: str,
    before_votes: int,
    expected_delta: int = 1,
    timeout_sec: float = 45.0,
    poll_sec: float = 2.0,
) -> dict[str, Any]:
    target = before_votes + expected_delta
    deadline = time.time() + timeout_sec
    last_seen = before_votes
    polls: list[dict[str, Any]] = []
    while time.time() < deadline:
        summary = vote_summary(graphql_url, limit=1000)
        current_votes = int(summary["map"].get(scenario_id, {}).get("votes", 0))
        polls.append(
            {
                "ts": time.time(),
                "current_votes": current_votes,
                "ok": summary["ok"],
                "errors": summary["errors"],
            }
        )
        last_seen = max(last_seen, current_votes)
        if current_votes >= target:
            return {
                "ok": True,
                "scenario_id": scenario_id,
                "before_votes": before_votes,
                "after_votes": current_votes,
                "target_votes": target,
                "polls": polls,
            }
        time.sleep(poll_sec)
    return {
        "ok": False,
        "scenario_id": scenario_id,
        "before_votes": before_votes,
        "after_votes": last_seen,
        "target_votes": target,
        "polls": polls,
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Live GraphQL smoke utilities for vote pipeline.")
    parser.add_argument("--graphql-url", required=True)
    parser.add_argument("--year", type=int, default=2026)
    args = parser.parse_args()

    contract = check_submit_vote_contract(args.graphql_url)
    run = run_scenario(args.graphql_url, year=args.year)
    out = {
        "contract": contract,
        "run_scenario": run,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0 if contract["ok"] and run["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(_main())
