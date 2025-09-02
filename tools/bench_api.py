#!/usr/bin/env python3
"""
Simple local benchmark for GraphQL endpoints against warmed caches.

Usage:
  python3 tools/bench_api.py --runs 30 --warmup 5

Prints p95 timings for allocation (COFOG) and procurement queries.
"""
from __future__ import annotations

import argparse
import statistics
import time

from fastapi.testclient import TestClient

from services.api.app import create_app


def _bench_query(client: TestClient, query: str, variables: dict | None = None, runs: int = 30, warmup: int = 5) -> list[float]:
    times: list[float] = []
    variables = variables or {}
    # warmup
    for _ in range(warmup):
        client.post("/graphql", json={"query": query, "variables": variables}).json()
    # measured
    for _ in range(runs):
        t0 = time.perf_counter()
        r = client.post("/graphql", json={"query": query, "variables": variables})
        r.raise_for_status()
        js = r.json()
        if js.get("errors"):
            raise RuntimeError(f"GraphQL error: {js['errors']}")
        dt = (time.perf_counter() - t0) * 1000.0
        times.append(dt)
    return times


def p95(arr: list[float]) -> float:
    if not arr:
        return 0.0
    return statistics.quantiles(arr, n=100)[94]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=30)
    ap.add_argument("--warmup", type=int, default=5)
    ap.add_argument("--year", type=int, default=2026)
    ap.add_argument("--proc-year", type=int, default=2024)
    ap.add_argument("--region", default="75")
    args = ap.parse_args()

    app = create_app()
    client = TestClient(app)

    # 1) allocation COFOG (S13 shares scaled by baseline when warmed)
    q_alloc = """
      query($y:Int!){ allocation(year:$y, basis: CP, lens: COFOG){ cofog{ code label amountEur share } } }
    """
    t_alloc = _bench_query(client, q_alloc, {"y": args.year}, runs=args.runs, warmup=args.warmup)

    # 2) procurement (region filter)
    q_proc = """
      query($y:Int!,$r:String!){ procurement(year:$y, region:$r){ supplier{ siren name } amountEur cpv procedureType } }
    """
    t_proc = _bench_query(client, q_proc, {"y": args.proc_year, "r": args.region}, runs=args.runs, warmup=args.warmup)

    print("allocation COFOG: runs=%d p95=%.1f ms (avg=%.1f)" % (args.runs, p95(t_alloc), sum(t_alloc)/len(t_alloc)))
    print("procurement:      runs=%d p95=%.1f ms (avg=%.1f)" % (args.runs, p95(t_proc), sum(t_proc)/len(t_proc)))


if __name__ == "__main__":
    main()

