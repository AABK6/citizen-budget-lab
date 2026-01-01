#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from services.api import policy_catalog as pol  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the policy levers YAML catalog.")
    parser.add_argument("--path", help="Optional path to a policy_levers.yaml file.")
    args = parser.parse_args()

    try:
        text = pol.read_policy_catalog_text(args.path)
    except FileNotFoundError as exc:
        print(f"Policy catalog not found: {exc}", file=sys.stderr)
        return 2

    errors = pol.validate_policy_catalog_text(text)
    if errors:
        print("Policy catalog validation failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    data = pol.load_policy_catalog_from_text(text)
    print(f"Policy catalog OK: {len(data)} levers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
