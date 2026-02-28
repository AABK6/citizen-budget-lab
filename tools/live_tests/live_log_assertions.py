#!/usr/bin/env python3
"""Cloud Run log assertions for live vote pipeline runs."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import UTC, datetime
from typing import Any


SEVERE_LEVELS = {"ERROR", "CRITICAL", "ALERT", "EMERGENCY"}


def _run_gcloud_logging_read(
    project: str,
    filter_expr: str,
    limit: int = 2000,
) -> list[dict[str, Any]]:
    cmd = [
        "gcloud",
        "logging",
        "read",
        filter_expr,
        "--project",
        project,
        "--format=json",
        "--limit",
        str(limit),
    ]
    proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "gcloud logging read failed")
    try:
        parsed = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse gcloud output: {exc}") from exc
    if not isinstance(parsed, list):
        return []
    return [entry for entry in parsed if isinstance(entry, dict)]


def _entry_message(entry: dict[str, Any]) -> str:
    if isinstance(entry.get("textPayload"), str):
        return entry["textPayload"]
    payload = entry.get("jsonPayload")
    if isinstance(payload, dict):
        for key in ("message", "msg", "error", "event"):
            value = payload.get(key)
            if isinstance(value, str):
                return value
    proto = entry.get("protoPayload")
    if isinstance(proto, dict):
        status = proto.get("status")
        if isinstance(status, dict) and isinstance(status.get("message"), str):
            return status["message"]
    return ""


def run_log_assertions(
    project: str,
    service: str,
    region: str,
    start_iso: str,
    end_iso: str | None = None,
    limit: int = 2000,
) -> dict[str, Any]:
    base_filter = [
        'resource.type="cloud_run_revision"',
        f'resource.labels.service_name="{service}"',
        f'resource.labels.location="{region}"',
        f'timestamp>="{start_iso}"',
    ]
    if end_iso:
        base_filter.append(f'timestamp<="{end_iso}"')
    filter_expr = " AND ".join(base_filter)
    entries = _run_gcloud_logging_read(project=project, filter_expr=filter_expr, limit=limit)

    submit_vote_warnings: list[dict[str, Any]] = []
    severe_submit_vote_entries: list[dict[str, Any]] = []

    for entry in entries:
        severity = str(entry.get("severity") or "DEFAULT").upper()
        message = _entry_message(entry)
        timestamp = entry.get("timestamp")
        if "submitVote metadata validation warnings" in message:
            submit_vote_warnings.append(
                {
                    "timestamp": timestamp,
                    "severity": severity,
                    "message": message,
                }
            )
        if "submitVote" in message and severity in SEVERE_LEVELS:
            severe_submit_vote_entries.append(
                {
                    "timestamp": timestamp,
                    "severity": severity,
                    "message": message,
                }
            )

    return {
        "ok": len(severe_submit_vote_entries) == 0,
        "project": project,
        "service": service,
        "region": region,
        "start_iso": start_iso,
        "end_iso": end_iso,
        "entries_scanned": len(entries),
        "submit_vote_warning_count": len(submit_vote_warnings),
        "submit_vote_error_count": len(severe_submit_vote_entries),
        "submit_vote_warnings": submit_vote_warnings[:50],
        "submit_vote_errors": severe_submit_vote_entries[:50],
        "filter": filter_expr,
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Assert Cloud Run logs for live vote tests.")
    parser.add_argument("--project", default="reviewflow-nrciu")
    parser.add_argument("--service", default="citizen-budget-api")
    parser.add_argument("--region", default="europe-west1")
    parser.add_argument("--start-iso", default=None)
    parser.add_argument("--end-iso", default=None)
    parser.add_argument("--limit", type=int, default=2000)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    start_iso = args.start_iso
    if not start_iso:
        start_iso = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    result = run_log_assertions(
        project=args.project,
        service=args.service,
        region=args.region,
        start_iso=start_iso,
        end_iso=args.end_iso,
        limit=args.limit,
    )
    text = json.dumps(result, indent=2, ensure_ascii=False)
    print(text)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(_main())
