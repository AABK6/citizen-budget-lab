from pathlib import Path

from tools.validate_apu_closure import build_validation_report


def test_validate_apu_closure_report_ok():
    report = build_validation_report(
        targets_path=Path("data/reference/apu_2026_targets.json"),
        aggregates_path=Path("data/reference/voted_2026_aggregates.json"),
        bridge_path=Path("data/reference/cofog_bridge_apu_2026.csv"),
        year=2026,
        excluded_state_codes={"RD", "PC"},
        abs_tol_eur=1e-6,
        rel_tol=1e-9,
    )
    assert report["status"] == "ok", report.get("errors")
