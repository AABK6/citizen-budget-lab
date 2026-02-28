#!/usr/bin/env python3
"""Run visible human-journey live checks and exact SQL write audit."""

from __future__ import annotations

import argparse
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
import live_sql_write_dump  # noqa: E402


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
    return {
        "name": name,
        "ok": False,
        "details": {},
        "started_at": _utc_now_iso(),
        "finished_at": None,
    }


def _finish(phase_obj: dict[str, Any], ok: bool, details: dict[str, Any]) -> dict[str, Any]:
    phase_obj["ok"] = bool(ok)
    phase_obj["details"] = details
    phase_obj["finished_at"] = _utc_now_iso()
    return phase_obj


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _run_ui_human(
    *,
    base_url: str,
    run_id: str,
    respondent_prefix: str,
    journey_count: int,
    output_path: Path,
    artifact_dir: Path,
    video_dir: Path,
    timeout_ms: int,
    headed: bool,
) -> dict[str, Any]:
    cmd = [
        "node",
        str(THIS_DIR / "ui_human_journey_capture.mjs"),
        "--base-url",
        base_url,
        "--run-id",
        run_id,
        "--respondent-prefix",
        respondent_prefix,
        "--journey-count",
        str(journey_count),
        "--output",
        str(output_path),
        "--artifact-dir",
        str(artifact_dir),
        "--video-dir",
        str(video_dir),
        "--timeout-ms",
        str(timeout_ms),
    ]
    cmd.append("--headed" if headed else "--headless")

    proc = subprocess.run(cmd, check=False, capture_output=True, text=True)

    output_payload: dict[str, Any] = {}
    if output_path.exists():
        try:
            output_payload = json.loads(output_path.read_text(encoding="utf-8"))
        except Exception:
            output_payload = {"_invalid_output_file": True}

    journeys = output_payload.get("journeys") if isinstance(output_payload, dict) else None
    journeys = journeys if isinstance(journeys, list) else []
    scenario_ids = sorted(
        {
            str(j.get("scenarioId"))
            for j in journeys
            if isinstance(j, dict) and j.get("scenarioId")
        }
    )
    respondent_ids = [
        str(j.get("respondentId"))
        for j in journeys
        if isinstance(j, dict) and j.get("respondentId")
    ]

    return {
        "ok": proc.returncode == 0 and bool(output_payload.get("ok")),
        "returncode": proc.returncode,
        "stdout": proc.stdout[-10000:],
        "stderr": proc.stderr[-10000:],
        "result": output_payload,
        "scenario_ids": scenario_ids,
        "respondent_ids": respondent_ids,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run visible human journeys and exact production SQL write audit."
    )
    parser.add_argument("--frontend-url", default="https://budget-citoyen.fr")
    parser.add_argument("--backend-url", default=None)
    parser.add_argument("--graphql-url", default=None)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--respondent-prefix", default=None)
    parser.add_argument("--journey-count", type=int, default=5)
    parser.add_argument("--output-root", default="output/live-tests")

    parser.add_argument("--ui-timeout-ms", type=int, default=90000)
    parser.add_argument("--ui-headed", dest="ui_headed", action="store_true", default=True)
    parser.add_argument("--ui-headless", dest="ui_headed", action="store_false")

    parser.add_argument(
        "--votes-dsn",
        default=os.getenv("LIVE_TESTS_VOTES_DSN") or os.getenv("VOTES_DB_DSN"),
    )
    parser.add_argument("--skip-logs", action="store_true")
    parser.add_argument("--gcp-project", default="reviewflow-nrciu")
    parser.add_argument("--gcp-region", default="europe-west1")
    parser.add_argument("--gcp-service", default="citizen-budget-api")
    args = parser.parse_args()

    run_id = args.run_id or _default_run_id()
    respondent_prefix = args.respondent_prefix or f"LIVE_HUMAN_{run_id}_"
    start_epoch = time.time()
    start_iso = _utc_now_iso()

    output_dir = Path(args.output_root) / run_id
    output_dir.mkdir(parents=True, exist_ok=True)

    playwright_root = Path("output") / "playwright" / run_id / "human"
    ui_artifacts = playwright_root / "screens"
    ui_videos = playwright_root / "videos"

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
        "journey_count": int(args.journey_count),
        "phases": [],
        "scenario_ids": [],
        "respondent_ids": [],
    }

    preflight = _phase("preflight")
    preflight_ok = False
    try:
        health_status, health_payload = _read_json_get(
            f"{args.frontend_url.rstrip('/')}/api/health"
        )
        backend_url = str(args.backend_url or health_payload.get("target") or "").rstrip("/")

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

    ui_phase = _phase("ui_human_journeys")
    if not preflight_ok:
        ui_phase = _finish(ui_phase, False, {"error": "preflight failed"})
        ui_details = {"ok": False, "scenario_ids": [], "respondent_ids": []}
    else:
        ui_output = output_dir / "human_ui_checks.json"
        ui_details = _run_ui_human(
            base_url=args.frontend_url,
            run_id=run_id,
            respondent_prefix=respondent_prefix,
            journey_count=int(args.journey_count),
            output_path=ui_output,
            artifact_dir=ui_artifacts,
            video_dir=ui_videos,
            timeout_ms=int(args.ui_timeout_ms),
            headed=bool(args.ui_headed),
        )
        ui_phase = _finish(ui_phase, bool(ui_details.get("ok")), ui_details)

    report["scenario_ids"] = list(ui_details.get("scenario_ids") or [])
    report["respondent_ids"] = list(ui_details.get("respondent_ids") or [])
    report["phases"].append(ui_phase)

    sql_phase = _phase("sql_exact_write_dump")
    if not args.votes_dsn:
        sql_phase = _finish(
            sql_phase,
            False,
            {"error": "missing --votes-dsn (or LIVE_TESTS_VOTES_DSN / VOTES_DB_DSN)"},
        )
    else:
        try:
            sql_result = live_sql_write_dump.run_sql_write_dump(
                dsn=args.votes_dsn,
                respondent_prefix=respondent_prefix,
                since_epoch=start_epoch,
                expected_scenario_ids=[str(x) for x in report["scenario_ids"]],
                expected_respondents=[str(x) for x in report["respondent_ids"]],
            )
            _write_json(output_dir / "sql_write_dump.json", sql_result)
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
        phase
        for phase in report["phases"]
        if not (phase.get("details", {}).get("skipped") is True)
    ]
    report["ok"] = all(bool(phase.get("ok")) for phase in required_phases)
    report["finished_at"] = _utc_now_iso()
    report["finished_at_epoch"] = time.time()

    report_path = output_dir / "report_human_pipeline.json"
    _write_json(report_path, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
