#!/usr/bin/env python3
"""Validate Cloud Run votes persistence configuration.

This script checks that the deployed API service is configured for durable vote
storage (Cloud SQL attachment + VOTES_DB_DSN env var/secret).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any, Dict, Tuple


def _run_gcloud_json(args: list[str]) -> Dict[str, Any]:
    cmd = ["gcloud", *args, "--format=json"]
    proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "gcloud command failed")
    try:
        return json.loads(proc.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse gcloud JSON output: {exc}") from exc


def _extract_template(service: Dict[str, Any]) -> Dict[str, Any]:
    return (
        service.get("spec", {}).get("template")
        or service.get("template")
        or {}
    )


def _extract_container(template: Dict[str, Any]) -> Dict[str, Any]:
    containers = (
        template.get("spec", {}).get("containers")
        or template.get("containers")
        or []
    )
    return containers[0] if containers else {}


def _env_entry(container: Dict[str, Any], name: str) -> Dict[str, Any] | None:
    for entry in container.get("env", []):
        if entry.get("name") == name:
            return entry
    return None


def _env_present(container: Dict[str, Any], name: str) -> Tuple[bool, str]:
    entry = _env_entry(container, name)
    if not entry:
        return False, "missing"
    if str(entry.get("value", "")).strip():
        return True, "value"
    if entry.get("valueSource"):
        return True, "valueSource"
    return False, "empty"


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Cloud Run votes store config.")
    parser.add_argument("--project", required=True, help="GCP project id")
    parser.add_argument("--region", required=True, help="Cloud Run region, e.g. europe-west1")
    parser.add_argument("--service", default="citizen-budget-api", help="Cloud Run service name")
    args = parser.parse_args()

    try:
        service = _run_gcloud_json(
            [
                "run",
                "services",
                "describe",
                args.service,
                "--project",
                args.project,
                "--region",
                args.region,
            ]
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    template = _extract_template(service)
    metadata = template.get("metadata", {}) or {}
    annotations = metadata.get("annotations", {}) or {}
    container = _extract_container(template)

    cloudsql_instances = str(annotations.get("run.googleapis.com/cloudsql-instances", "")).strip()
    has_cloudsql = bool(cloudsql_instances)

    dsn_present, dsn_mode = _env_present(container, "VOTES_DB_DSN")
    store_entry = _env_entry(container, "VOTES_STORE")
    store_value = str(store_entry.get("value", "")).strip().lower() if store_entry else ""
    strict_present, strict_mode = _env_present(container, "VOTES_REQUIRE_POSTGRES")
    strict_value = str((_env_entry(container, "VOTES_REQUIRE_POSTGRES") or {}).get("value", "")).strip()

    errors: list[str] = []
    warnings: list[str] = []

    if not has_cloudsql:
        errors.append("Missing Cloud SQL attachment annotation (run.googleapis.com/cloudsql-instances).")
    if not dsn_present:
        errors.append("Missing VOTES_DB_DSN env var/secret on Cloud Run service template.")
    if store_value and store_value != "postgres":
        warnings.append(f"VOTES_STORE is '{store_value}' (expected 'postgres' or unset).")
    if strict_present and strict_value and strict_value not in ("1", "true", "True"):
        warnings.append(f"VOTES_REQUIRE_POSTGRES='{strict_value}' weakens production guardrails.")
    if not strict_present:
        warnings.append("VOTES_REQUIRE_POSTGRES is not set explicitly (defaults rely on Cloud Run runtime detection).")

    result = {
        "service": args.service,
        "project": args.project,
        "region": args.region,
        "latest_ready_revision": service.get("status", {}).get("latestReadyRevisionName"),
        "checks": {
            "cloudsql_attached": has_cloudsql,
            "votes_db_dsn_present": dsn_present,
            "votes_db_dsn_mode": dsn_mode,
            "votes_store_value": store_value or None,
            "votes_require_postgres_present": strict_present,
            "votes_require_postgres_mode": strict_mode,
        },
        "errors": errors,
        "warnings": warnings,
        "ok": len(errors) == 0,
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
