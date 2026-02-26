from __future__ import annotations

import json
from pathlib import Path

import pytest

import tools.build_snapshot as build_snapshot


def _write_report(root: Path, year: int, status: str) -> Path:
    out_dir = root / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"validation_report_{year}.json"
    path.write_text(json.dumps({"status": status}), encoding="utf-8")
    return path


def test_assert_strict_validation_ok_is_noop_when_not_strict(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("STRICT_OFFICIAL", "0")
    monkeypatch.setattr(build_snapshot, "DATA_DIR", str(tmp_path))
    build_snapshot._assert_strict_validation_ok(2026)


def test_assert_strict_validation_ok_raises_when_report_missing(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("STRICT_OFFICIAL", "1")
    monkeypatch.setattr(build_snapshot, "DATA_DIR", str(tmp_path))

    with pytest.raises(RuntimeError, match="requires validation report"):
        build_snapshot._assert_strict_validation_ok(2026)


def test_assert_strict_validation_ok_raises_when_report_not_ok(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("STRICT_OFFICIAL", "1")
    monkeypatch.setattr(build_snapshot, "DATA_DIR", str(tmp_path))
    _write_report(tmp_path, 2026, "failed")

    with pytest.raises(RuntimeError, match="validation is not OK"):
        build_snapshot._assert_strict_validation_ok(2026)


def test_assert_strict_validation_ok_accepts_ok_report(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("STRICT_OFFICIAL", "1")
    monkeypatch.setattr(build_snapshot, "DATA_DIR", str(tmp_path))
    _write_report(tmp_path, 2026, "ok")

    build_snapshot._assert_strict_validation_ok(2026)
