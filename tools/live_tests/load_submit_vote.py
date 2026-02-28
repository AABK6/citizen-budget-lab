#!/usr/bin/env python3
"""Concurrent load generator for submitVote on the deployed GraphQL endpoint."""

from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import json
import random
import time
from dataclasses import dataclass
from statistics import median
from typing import Any

try:
    import httpx  # type: ignore
except Exception:  # pragma: no cover - environment dependent
    httpx = None


SUBMIT_VOTE_MUTATION = """
mutation SubmitVote(
  $scenarioId: ID!,
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


@dataclass
class StageSpec:
    vus: int
    duration_sec: int


def parse_stages(text: str) -> list[StageSpec]:
    out: list[StageSpec] = []
    for raw_chunk in text.split(","):
        chunk = raw_chunk.strip().lower()
        if not chunk:
            continue
        if "x" not in chunk:
            raise ValueError(f"Invalid stage '{raw_chunk}'. Expected format VUxSECONDS, e.g. 20x180.")
        vu_raw, sec_raw = chunk.split("x", 1)
        vus = int(vu_raw)
        secs = int(sec_raw)
        if vus <= 0 or secs <= 0:
            raise ValueError(f"Invalid stage '{raw_chunk}'. Values must be > 0.")
        out.append(StageSpec(vus=vus, duration_sec=secs))
    if not out:
        raise ValueError("No valid stages provided.")
    return out


def _snapshot(scenario_id: str, respondent_id: str) -> tuple[str, str]:
    payload = {
        "v": 1,
        "scenarioId": scenario_id,
        "respondentId": respondent_id,
        "channel": "direct",
        "submittedAt": int(time.time()),
    }
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    sha = hashlib.sha256(raw).hexdigest()
    return b64, sha


async def _worker(
    *,
    client: httpx.AsyncClient,
    graphql_url: str,
    scenario_id: str,
    respondent_prefix: str,
    stage_index: int,
    worker_index: int,
    deadline_mono: float,
    pace_sec: float,
    timeout_sec: float,
    failures_cap: int = 30,
) -> dict[str, Any]:
    sent = 0
    success = 0
    failures: list[dict[str, Any]] = []
    latencies_ms: list[float] = []
    seq = 0

    while time.monotonic() < deadline_mono:
        seq += 1
        respondent_id = f"{respondent_prefix}LOAD_S{stage_index:02d}_W{worker_index:03d}_{seq:06d}"
        snap_b64, snap_sha = _snapshot(scenario_id=scenario_id, respondent_id=respondent_id)
        variables = {
            "scenarioId": scenario_id,
            "respondentId": respondent_id,
            "sessionDurationSec": float(random.randint(20, 240)),
            "channel": "direct",
            "entryPath": f"/build?source=live_load&stage={stage_index}&worker={worker_index}",
            "finalVoteSnapshotB64": snap_b64,
            "finalVoteSnapshotSha256": snap_sha,
            "finalVoteSnapshotVersion": 1,
            "finalVoteSnapshotTruncated": False,
        }
        payload = {"query": SUBMIT_VOTE_MUTATION, "variables": variables}
        sent += 1
        t0 = time.perf_counter()
        try:
            response = await client.post(graphql_url, json=payload, timeout=timeout_sec)
            latency_ms = (time.perf_counter() - t0) * 1000.0
            latencies_ms.append(latency_ms)
            js = response.json()
            gql_errors = js.get("errors") if isinstance(js, dict) else None
            vote_ok = bool((js.get("data") or {}).get("submitVote")) if isinstance(js, dict) else False
            if response.status_code == 200 and not gql_errors and vote_ok:
                success += 1
            elif len(failures) < failures_cap:
                failures.append(
                    {
                        "status": response.status_code,
                        "errors": gql_errors,
                        "vote_ok": vote_ok,
                        "respondent_id": respondent_id,
                    }
                )
        except Exception as exc:
            latency_ms = (time.perf_counter() - t0) * 1000.0
            latencies_ms.append(latency_ms)
            if len(failures) < failures_cap:
                failures.append(
                    {
                        "status": 0,
                        "errors": [str(exc)],
                        "vote_ok": False,
                        "respondent_id": respondent_id,
                    }
                )
        await asyncio.sleep(max(0.0, pace_sec + random.uniform(-0.05, 0.05)))

    return {
        "sent": sent,
        "success": success,
        "failures": failures,
        "latencies_ms": latencies_ms,
    }


def _percentile(values: list[float], pct: float) -> float | None:
    if not values:
        return None
    s = sorted(values)
    if len(s) == 1:
        return float(s[0])
    rank = max(0, min(len(s) - 1, int(round((pct / 100.0) * (len(s) - 1)))))
    return float(s[rank])


async def run_load_campaign(
    *,
    graphql_url: str,
    scenario_id: str,
    respondent_prefix: str,
    stages: list[StageSpec],
    pace_sec: float,
    timeout_sec: float,
) -> dict[str, Any]:
    if httpx is None:
        raise RuntimeError(
            "httpx is not installed in this interpreter. "
            "Use the project venv or install httpx."
        )
    campaign_started = time.time()
    stage_results: list[dict[str, Any]] = []
    totals_sent = 0
    totals_success = 0
    all_latencies: list[float] = []
    all_failures: list[dict[str, Any]] = []

    # HTTP/1.1 by default to avoid requiring optional `h2` dependency.
    async with httpx.AsyncClient(http2=False) as client:
        for idx, stage in enumerate(stages, start=1):
            deadline_mono = time.monotonic() + float(stage.duration_sec)
            workers = [
                _worker(
                    client=client,
                    graphql_url=graphql_url,
                    scenario_id=scenario_id,
                    respondent_prefix=respondent_prefix,
                    stage_index=idx,
                    worker_index=worker_idx,
                    deadline_mono=deadline_mono,
                    pace_sec=pace_sec,
                    timeout_sec=timeout_sec,
                )
                for worker_idx in range(1, stage.vus + 1)
            ]
            worker_results = await asyncio.gather(*workers)
            sent = sum(int(r["sent"]) for r in worker_results)
            success = sum(int(r["success"]) for r in worker_results)
            latencies = [lat for r in worker_results for lat in r["latencies_ms"]]
            failures = [f for r in worker_results for f in r["failures"]]
            stage_result = {
                "stage_index": idx,
                "vus": stage.vus,
                "duration_sec": stage.duration_sec,
                "sent": sent,
                "success": success,
                "failures": len(failures),
                "success_rate": (float(success) / float(sent)) if sent > 0 else 0.0,
                "latency_ms": {
                    "p50": _percentile(latencies, 50),
                    "p95": _percentile(latencies, 95),
                    "max": max(latencies) if latencies else None,
                    "median": median(latencies) if latencies else None,
                },
                "sample_failures": failures[:50],
            }
            stage_results.append(stage_result)
            totals_sent += sent
            totals_success += success
            all_latencies.extend(latencies)
            all_failures.extend(failures)

    return {
        "ok": totals_sent > 0 and totals_success <= totals_sent,
        "graphql_url": graphql_url,
        "scenario_id": scenario_id,
        "respondent_prefix": respondent_prefix,
        "started_at_epoch": campaign_started,
        "finished_at_epoch": time.time(),
        "stages": stage_results,
        "totals": {
            "sent": totals_sent,
            "success": totals_success,
            "failures": totals_sent - totals_success,
            "success_rate": (float(totals_success) / float(totals_sent)) if totals_sent > 0 else 0.0,
            "latency_ms": {
                "p50": _percentile(all_latencies, 50),
                "p95": _percentile(all_latencies, 95),
                "max": max(all_latencies) if all_latencies else None,
                "median": median(all_latencies) if all_latencies else None,
            },
        },
        "sample_failures": all_failures[:100],
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Run staged concurrent submitVote load.")
    parser.add_argument("--graphql-url", required=True)
    parser.add_argument("--scenario-id", required=True)
    parser.add_argument("--respondent-prefix", required=True)
    parser.add_argument("--stages", default="5x120,20x180,50x300")
    parser.add_argument("--pace-sec", type=float, default=0.75)
    parser.add_argument("--timeout-sec", type=float, default=20.0)
    parser.add_argument("--success-threshold", type=float, default=0.995)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    stages = parse_stages(args.stages)
    result = asyncio.run(
        run_load_campaign(
            graphql_url=args.graphql_url,
            scenario_id=args.scenario_id,
            respondent_prefix=args.respondent_prefix,
            stages=stages,
            pace_sec=args.pace_sec,
            timeout_sec=args.timeout_sec,
        )
    )
    threshold = float(args.success_threshold)
    result["threshold"] = threshold
    result["ok"] = bool(result["ok"] and result["totals"]["success_rate"] >= threshold)
    text = json.dumps(result, indent=2, ensure_ascii=False)
    print(text)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(_main())
