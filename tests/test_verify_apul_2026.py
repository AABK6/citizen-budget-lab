from __future__ import annotations

from tools.verify_apul_2026 import build_apul_rows


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
