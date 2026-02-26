from __future__ import annotations

from tools.verify_apul_2026 import SourceCheck, build_apul_rows, write_report


def test_build_apul_rows_contains_expected_sensitive_blocks() -> None:
    rows = build_apul_rows(year=2026)
    assert rows
    by_mass = {row.mass_id: row for row in rows}

    assert by_mass["M_TRANSPORT"].amount_eur > 0
    assert by_mass["M_EDU"].amount_eur > 0
    assert by_mass["M_SOLIDARITY"].amount_eur > 0
    assert by_mass["M_HOUSING"].amount_eur > 0
    assert all(row.source_quality == "estimated" for row in rows)
    assert all(row.subsector == "S1313" for row in rows)
    assert all(row.match_ok for row in rows)


def test_write_report_includes_verification_metadata(tmp_path) -> None:
    rows = build_apul_rows(year=2026)
    checks = [SourceCheck(url="https://example.org/dgcl", ok=True, status_code=200, error="")]
    out = tmp_path / "apul_report.md"

    write_report(rows, checks, warnings=[], out_md=out)
    report = out.read_text(encoding="utf-8")

    assert "Verified at (UTC)" in report
    assert "## Source fetch checks" in report
    assert "| https://example.org/dgcl | OK | 200 |  |" in report
