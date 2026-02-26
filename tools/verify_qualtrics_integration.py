#!/usr/bin/env python3
"""Verify Qualtrics integration wiring across frontend, API, and ETL.

This is a non-mutating verification utility to catch drift quickly.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any


REQUIRED_SUBMIT_VOTE_ARGS = [
    "scenarioId",
    "respondentId",
    "sessionDurationSec",
    "channel",
    "entryPath",
    "finalVoteSnapshotB64",
    "finalVoteSnapshotSha256",
    "finalVoteSnapshotVersion",
    "finalVoteSnapshotTruncated",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _contains_all(text: str, needles: list[str]) -> tuple[bool, list[str]]:
    missing = [needle for needle in needles if needle not in text]
    return len(missing) == 0, missing


def _parse_runtime_submit_vote_args(graphql_url: str) -> list[str]:
    query = {
        "query": """
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
    }
    payload = json.dumps(query).encode("utf-8")
    req = urllib.request.Request(
        graphql_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    fields = data["data"]["__schema"]["mutationType"]["fields"]
    for field in fields:
        if field["name"] == "submitVote":
            return [arg["name"] for arg in field.get("args", [])]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify Qualtrics integration consistency.")
    parser.add_argument(
        "--graphql-url",
        default=None,
        help="Optional runtime GraphQL endpoint to introspect (e.g. https://.../graphql).",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Repository root path (default: current directory).",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    checks: dict[str, Any] = {}
    errors: list[str] = []

    sdl_path = root / "graphql" / "schema.sdl.graphql"
    frontend_query_path = root / "frontend" / "lib" / "queries.ts"
    backend_schema_path = root / "services" / "api" / "schema.py"
    parser_path = root / "tools" / "etl" / "scenario_parser.py"

    sdl_text = _read(sdl_path)
    ok, missing = _contains_all(sdl_text, REQUIRED_SUBMIT_VOTE_ARGS)
    checks["sdl_submit_vote_args"] = {
        "ok": ok,
        "missing": missing,
    }
    if not ok:
        errors.append(f"SDL missing submitVote args: {missing}")

    frontend_text = _read(frontend_query_path)
    ok, missing = _contains_all(frontend_text, REQUIRED_SUBMIT_VOTE_ARGS)
    checks["frontend_submit_vote_query_args"] = {
        "ok": ok,
        "missing": missing,
    }
    if not ok:
        errors.append(f"frontend submitVote mutation missing args: {missing}")

    backend_text = _read(backend_schema_path)
    signature_ok = bool(
        re.search(
            r"def\s+submitVote\s*\([\s\S]*finalVoteSnapshotTruncated:\s*Optional\[bool\]\s*=\s*None",
            backend_text,
        )
    )
    checks["backend_submit_vote_signature"] = {"ok": signature_ok}
    if not signature_ok:
        errors.append("backend submitVote signature does not include snapshot args")

    parser_ok, parser_missing = _contains_all(
        _read(parser_path),
        [
            "finalVoteSnapshotSha256",
            "finalVoteSnapshotVersion",
            "finalVoteSnapshotTruncated",
        ],
    )
    checks["etl_parser_fields"] = {
        "ok": parser_ok,
        "missing": parser_missing,
    }
    if not parser_ok:
        errors.append(f"ETL parser missing fields: {parser_missing}")

    if args.graphql_url:
        try:
            runtime_args = _parse_runtime_submit_vote_args(args.graphql_url)
            missing_runtime = [
                arg for arg in REQUIRED_SUBMIT_VOTE_ARGS if arg not in runtime_args
            ]
            runtime_ok = len(missing_runtime) == 0
            checks["runtime_submit_vote_args"] = {
                "ok": runtime_ok,
                "graphql_url": args.graphql_url,
                "runtime_args": runtime_args,
                "missing": missing_runtime,
            }
            if not runtime_ok:
                errors.append(
                    "runtime GraphQL submitVote missing args: "
                    + ", ".join(missing_runtime)
                )
        except Exception as exc:
            checks["runtime_submit_vote_args"] = {
                "ok": False,
                "graphql_url": args.graphql_url,
                "error": str(exc),
            }
            errors.append(f"runtime GraphQL introspection failed: {exc}")

    result = {
        "ok": len(errors) == 0,
        "checks": checks,
        "errors": errors,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
