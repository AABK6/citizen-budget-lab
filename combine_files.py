#!/usr/bin/env python3
"""
Combine code files into one text file, strictly respecting .gitignore.

Requirements:
- Run inside a Git repository (or pass --root pointing to one)
- Git must be installed and on PATH

Rationale:
We ask Git for the set of files that are *not* ignored:
  git -C <root> ls-files --cached --others --exclude-standard -z
Then we filter by extension and concatenate.
"""

import argparse
import subprocess
from pathlib import Path

DEFAULT_EXTS = {
    ".py", ".json", ".js", ".java", ".ts", ".tsx", ".jsx",
    ".html", ".css", ".yaml", ".yml", ".md", ".graphql",
    ".txt", ".xml",
}

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Combine code files into one text file (respects .gitignore)."
    )
    p.add_argument("--root", default=".", help="Repo root directory (default: .)")
    p.add_argument("--output", default="all_code.txt", help="Output file path")
    p.add_argument(
        "--ext",
        default=",".join(sorted(DEFAULT_EXTS)),
        help="Comma-separated file extensions to include (e.g. .py,.js)",
    )
    p.add_argument(
        "--nodir",
        action="store_true",
        help="Only include files directly under --root (no subdirectories)",
    )
    return p.parse_args()

def normalize_exts(csv: str) -> set[str]:
    out = set()
    for s in csv.split(","):
        s = s.strip().lower()
        if not s:
            continue
        if not s.startswith("."):
            s = "." + s
        out.add(s)
    return out

def assert_git_repo(root: Path) -> None:
    try:
        res = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--is-inside-work-tree"],
            check=True,
            capture_output=True,
            text=True,
        )
        if res.stdout.strip().lower() != "true":
            raise RuntimeError
    except Exception:
        raise SystemExit(
            f"Error: '{root}' is not a Git work tree (or git not available). "
            "This script relies on Git to honor .gitignore."
        )

def git_list_unignored_files(root: Path) -> list[Path]:
    """Return Paths of all tracked + untracked files not ignored by Git."""
    res = subprocess.run(
        ["git", "-C", str(root), "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        check=True,
        capture_output=True,
    )
    # Split by NUL for robustness
    parts = [p for p in res.stdout.split(b"\x00") if p]
    return [root / p.decode("utf-8", errors="replace") for p in parts]

def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()
    out_path = (root / args.output).resolve()
    include_exts = normalize_exts(args.ext)

    assert_git_repo(root)

    files = git_list_unignored_files(root)

    # Filter by extension, nodir, and skip the output file itself
    selected: list[Path] = []
    for f in files:
        if f.resolve() == out_path:
            continue
        try:
            rel = f.relative_to(root)
        except ValueError:
            # Shouldn't happen with -C root, but be defensive.
            continue
        if args.nodir and len(rel.parts) > 1:
            continue
        if rel.suffix.lower() in include_exts:
            selected.append(f)

    # Deterministic order by relative path
    selected.sort(key=lambda p: p.relative_to(root).as_posix())

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as out:
        for f in selected:
            rel = f.relative_to(root).as_posix()
            out.write(f"\n##### START FILE: {rel} #####\n\n")
            try:
                with f.open("r", encoding="utf-8", errors="replace") as inp:
                    out.write(inp.read())
            except Exception as e:
                out.write(f"[ERROR READING FILE: {e}]\n")
            out.write(f"\n##### END FILE: {rel} #####\n\n")

    print(f"Wrote {len(selected)} files to {out_path}")

if __name__ == "__main__":
    main()
