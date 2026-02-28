#!/usr/bin/env python3
"""End-to-end live verification suite for the deployed build vote pipeline."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

import live_graphql  # noqa: E402
import live_log_assertions  # noqa: E402
import live_sql_assertions  # noqa: E402
from load_submit_vote import parse_stages, run_load_campaign  # noqa: E402


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _default_run_id() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def _read_json_get(url: str, timeout_sec: float = 20.0) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout_sec) as response:
        status = int(getattr(response, "status", 200))
        payload = response.read().decode("utf-8")
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        data = {"_invalid_json": payload}
    return status, data


def _phase(name: str) -> dict[str, Any]:
    return {"name": name, "ok": False, "details": {}, "started_at": _utc_now_iso(), "finished_at": None}


def _finish(phase_obj: dict[str, Any], ok: bool, details: dict[str, Any]) -> dict[str, Any]:
    phase_obj["ok"] = bool(ok)
    phase_obj["details"] = details
    phase_obj["finished_at"] = _utc_now_iso()
    return phase_obj


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _run_ui_playwright(
    *,
    base_url: str,
    respondent_prefix: str,
    output_path: Path,
    artifact_dir: Path,
    timeout_ms: int,
    headed: bool,
) -> dict[str, Any]:
    cmd = [
        "node",
        str(THIS_DIR / "ui_vote_capture.mjs"),
        "--base-url",
        base_url,
        "--respondent-prefix",
        respondent_prefix,
        "--output",
        str(output_path),
        "--artifact-dir",
        str(artifact_dir),
        "--timeout-ms",
        str(timeout_ms),
    ]
    if headed:
        cmd.append("--headed")
    proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
    output_payload: dict[str, Any] = {}
    if output_path.exists():
        try:
            output_payload = json.loads(output_path.read_text(encoding="utf-8"))
        except Exception:
            output_payload = {"_invalid_output_file": True}
    return {
        "ok": proc.returncode == 0 and bool(output_payload.get("ok")),
        "returncode": proc.returncode,
        "stdout": proc.stdout[-8000:],
        "stderr": proc.stderr[-8000:],
        "result": output_payload,
    }


def _submit_and_assert_increment(
    *,
    graphql_url: str,
    scenario_id: str,
    respondent_id: str,
    channel: str,
    entry_path: str,
    session_duration_sec: float,
    vote_summary_limit: int,
    override_fields: dict[str, Any] | None = None,
    truncated: bool = False,
) -> dict[str, Any]:
    before_summary = live_graphql.vote_summary(graphql_url, limit=vote_summary_limit)
    before_votes = int(before_summary["map"].get(scenario_id, {}).get("votes", 0))
    submit = live_graphql.submit_vote(
        graphql_url=graphql_url,
        scenario_id=scenario_id,
        respondent_id=respondent_id,
        channel=channel,
        entry_path=entry_path,
        session_duration_sec=session_duration_sec,
        truncated=truncated,
        override_fields=override_fields,
    )
    increment = live_graphql.wait_for_vote_increment(
        graphql_url=graphql_url,
        scenario_id=scenario_id,
        before_votes=before_votes,
        expected_delta=1,
        timeout_sec=45.0,
        poll_sec=2.0,
    )
    return {
        "ok": bool(submit["ok"] and increment["ok"]),
        "before_votes": before_votes,
        "submit": submit,
        "increment": increment,
    }


def _run_api_checks(
    *,
    graphql_url: str,
    year: int,
    respondent_prefix: str,
    vote_summary_limit: int,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "ok": False,
        "scenarios": [],
        "tests": {},
    }

    run_result = live_graphql.run_scenario(graphql_url=graphql_url, year=year, lens="ADMIN")
    out["tests"]["run_scenario"] = run_result
    if not run_result["ok"] or not run_result.get("scenario_id"):
        return out
    scenario_id = str(run_result["scenario_id"])
    out["scenarios"].append(scenario_id)

    scenario_check = live_graphql.get_scenario_dsl(graphql_url=graphql_url, scenario_id=scenario_id)
    out["tests"]["scenario_roundtrip"] = scenario_check

    direct_vote = _submit_and_assert_increment(
        graphql_url=graphql_url,
        scenario_id=scenario_id,
        respondent_id=f"{respondent_prefix}API_DIRECT_001",
        channel="direct",
        entry_path="/build?source=live_api&flow=direct",
        session_duration_sec=42.5,
        vote_summary_limit=vote_summary_limit,
    )
    out["tests"]["api_direct_vote"] = direct_vote

    qual_vote = _submit_and_assert_increment(
        graphql_url=graphql_url,
        scenario_id=scenario_id,
        respondent_id=f"{respondent_prefix}API_QUAL_001",
        channel="qualtrics",
        entry_path=f"/build?source=qualtrics&ID={respondent_prefix}API_QUAL_001",
        session_duration_sec=31.0,
        vote_summary_limit=vote_summary_limit,
    )
    out["tests"]["api_qualtrics_vote"] = qual_vote

    boundary_vote = _submit_and_assert_increment(
        graphql_url=graphql_url,
        scenario_id=scenario_id,
        respondent_id=f"{respondent_prefix}API_BOUNDARY_001",
        channel="direct",
        entry_path="/build?source=live_api&flow=boundary",
        session_duration_sec=21600.0,
        vote_summary_limit=vote_summary_limit,
        truncated=True,
    )
    out["tests"]["api_boundary_vote"] = boundary_vote

    invalid_vote = _submit_and_assert_increment(
        graphql_url=graphql_url,
        scenario_id=scenario_id,
        respondent_id=f"{respondent_prefix}API_INVALID_001",
        channel="direct",
        entry_path="/build?source=live_api&flow=invalid",
        session_duration_sec=120.0,
        vote_summary_limit=vote_summary_limit,
        override_fields={
            "channel": "not-a-valid-channel",
            "sessionDurationSec": -5.0,
            "entryPath": "/" + ("x" * 1300),
            "finalVoteSnapshotB64": "%%%NOT_BASE64%%%",
            "finalVoteSnapshotSha256": "invalid-sha",
            "finalVoteSnapshotVersion": 0,
            "finalVoteSnapshotTruncated": True,
        },
    )
    out["tests"]["api_invalid_metadata_vote"] = invalid_vote

    out["ok"] = all(
        bool(out["tests"][key].get("ok"))
        for key in (
            "run_scenario",
            "scenario_roundtrip",
            "api_direct_vote",
            "api_qualtrics_vote",
            "api_boundary_vote",
            "api_invalid_metadata_vote",
        )
    )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the full live vote-pipeline test suite.")
    parser.add_argument("--frontend-url", default="https://budget-citoyen.fr")
    parser.add_argument("--backend-url", default=None)
    parser.add_argument("--graphql-url", default=None)
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--respondent-prefix", default=None)
    parser.add_argument("--output-root", default="output/live-tests")
    parser.add_argument("--vote-summary-limit", type=int, default=10000)

    parser.add_argument("--skip-ui", action="store_true")
    parser.add_argument("--skip-load", action="store_true")
    parser.add_argument("--skip-sql", action="store_true")
    parser.add_argument("--skip-logs", action="store_true")
    parser.add_argument("--ui-timeout-ms", type=int, default=60000)
    parser.add_argument("--ui-headed", action="store_true")

    parser.add_argument("--load-stages", default="5x120,20x180,50x300")
    parser.add_argument("--load-pace-sec", type=float, default=0.75)
    parser.add_argument("--load-timeout-sec", type=float, default=20.0)
    parser.add_argument("--load-success-threshold", type=float, default=0.995)

    parser.add_argument("--votes-dsn", default=os.getenv("LIVE_TESTS_VOTES_DSN") or os.getenv("VOTES_DB_DSN"))
    parser.add_argument("--gcp-project", default="reviewflow-nrciu")
    parser.add_argument("--gcp-region", default="europe-west1")
    parser.add_argument("--gcp-service", default="citizen-budget-api")
    args = parser.parse_args()

    run_id = args.run_id or _default_run_id()
    respondent_prefix = args.respondent_prefix or f"LIVE_E2E_{run_id}_"
    start_epoch = time.time()
    start_iso = _utc_now_iso()

    output_dir = Path(args.output_root) / run_id
    output_dir.mkdir(parents=True, exist_ok=True)
    playwright_artifacts = Path("output") / "playwright" / run_id
    graphql_url = args.graphql_url or f"{args.frontend_url.rstrip('/')}/api/graphql"

    report: dict[str, Any] = {
        "ok": False,
        "run_id": run_id,
        "started_at": start_iso,
        "started_at_epoch": start_epoch,
        "frontend_url": args.frontend_url,
        "backend_url": args.backend_url,
        "graphql_url": graphql_url,
        "respondent_prefix": respondent_prefix,
        "phases": [],
        "scenarios": [],
    }

    preflight = _phase("preflight")
    preflight_ok = False
    try:
        health_status, health_payload = _read_json_get(f"{args.frontend_url.rstrip('/')}/api/health")
        backend_url = args.backend_url or str(health_payload.get("target") or "").rstrip("/")
        backend_status = 0
        backend_payload: dict[str, Any] = {}
        if backend_url:
            backend_status, backend_payload = _read_json_get(f"{backend_url}/health/full")
        contract = live_graphql.check_submit_vote_contract(graphql_url)
        preflight_ok = bool(
            health_status == 200
            and health_payload.get("ok") is True
            and backend_status == 200
            and backend_payload.get("status") == "healthy"
            and contract.get("ok")
        )
        report["backend_url"] = backend_url
        preflight = _finish(
            preflight,
            preflight_ok,
            {
                "frontend_health_status": health_status,
                "frontend_health": health_payload,
                "backend_health_status": backend_status,
                "backend_health": backend_payload,
                "submit_vote_contract": contract,
            },
        )
    except urllib.error.URLError as exc:
        preflight = _finish(preflight, False, {"error": str(exc)})
    except Exception as exc:
        preflight = _finish(preflight, False, {"error": str(exc)})
    report["phases"].append(preflight)

    api_phase = _phase("api_functional")
    api_details = {"ok": False, "error": "preflight failed"}
    if preflight_ok:
        api_details = _run_api_checks(
            graphql_url=graphql_url,
            year=args.year,
            respondent_prefix=respondent_prefix,
            vote_summary_limit=int(args.vote_summary_limit),
        )
        report["scenarios"] = list(api_details.get("scenarios") or [])
    api_phase = _finish(api_phase, bool(api_details.get("ok")), api_details)
    report["phases"].append(api_phase)

    ui_phase = _phase("ui_playwright")
    if args.skip_ui:
        ui_phase = _finish(ui_phase, True, {"skipped": True})
    else:
        ui_output = output_dir / "ui_checks.json"
        ui_details = _run_ui_playwright(
            base_url=args.frontend_url,
            respondent_prefix=respondent_prefix,
            output_path=ui_output,
            artifact_dir=playwright_artifacts,
            timeout_ms=int(args.ui_timeout_ms),
            headed=bool(args.ui_headed),
        )
        ui_phase = _finish(ui_phase, bool(ui_details.get("ok")), ui_details)
    report["phases"].append(ui_phase)

    load_phase = _phase("load_campaign")
    if args.skip_load:
        load_phase = _finish(load_phase, True, {"skipped": True})
    elif not report["scenarios"]:
        load_phase = _finish(load_phase, False, {"error": "no scenario_id available for load stage"})
    else:
        try:
            load_scenario = report["scenarios"][0]
            stages = parse_stages(args.load_stages)
            load_result = asyncio.run(
                run_load_campaign(
                    graphql_url=graphql_url,
                    scenario_id=load_scenario,
                    respondent_prefix=respondent_prefix,
                    stages=stages,
                    pace_sec=float(args.load_pace_sec),
                    timeout_sec=float(args.load_timeout_sec),
                )
            )
            threshold = float(args.load_success_threshold)
            load_ok = bool(load_result["totals"]["success_rate"] >= threshold)
            load_result["threshold"] = threshold
            load_result["ok"] = load_ok
            _write_json(output_dir / "load_checks.json", load_result)
            load_phase = _finish(load_phase, load_ok, load_result)
        except Exception as exc:
            load_phase = _finish(load_phase, False, {"error": str(exc)})
    report["phases"].append(load_phase)

    sql_phase = _phase("sql_forensic")
    if args.skip_sql:
        sql_phase = _finish(sql_phase, True, {"skipped": True})
    elif not args.votes_dsn:
        sql_phase = _finish(sql_phase, False, {"error": "missing --votes-dsn (or LIVE_TESTS_VOTES_DSN / VOTES_DB_DSN)"})
    else:
        try:
            sql_result = live_sql_assertions.run_sql_assertions(
                dsn=args.votes_dsn,
                respondent_prefix=respondent_prefix,
                expected_scenario_ids=[str(sid) for sid in report["scenarios"]],
                since_epoch=start_epoch,
            )
            _write_json(output_dir / "sql_checks.json", sql_result)
            sql_phase = _finish(sql_phase, bool(sql_result.get("ok")), sql_result)
        except Exception as exc:
            sql_phase = _finish(sql_phase, False, {"error": str(exc)})
    report["phases"].append(sql_phase)

    logs_phase = _phase("logs_forensic")
    if args.skip_logs:
        logs_phase = _finish(logs_phase, True, {"skipped": True})
    else:
        try:
            logs_result = live_log_assertions.run_log_assertions(
                project=args.gcp_project,
                service=args.gcp_service,
                region=args.gcp_region,
                start_iso=start_iso,
                end_iso=_utc_now_iso(),
                limit=4000,
            )
            _write_json(output_dir / "logs_checks.json", logs_result)
            logs_phase = _finish(logs_phase, bool(logs_result.get("ok")), logs_result)
        except Exception as exc:
            logs_phase = _finish(logs_phase, False, {"error": str(exc)})
    report["phases"].append(logs_phase)

    required_phases = [
        p for p in report["phases"] if not (p["details"].get("skipped") is True)
    ]
    report["ok"] = all(bool(p.get("ok")) for p in required_phases)
    report["finished_at"] = _utc_now_iso()
    report["finished_at_epoch"] = time.time()

    report_path = output_dir / "report.json"
    _write_json(report_path, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
