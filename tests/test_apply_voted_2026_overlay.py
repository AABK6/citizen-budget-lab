from __future__ import annotations

import pytest

from tools.apply_voted_2026_to_lego_baseline import _apply_revenue_overlay, _build_double_count_checks


def _baseline_template() -> dict:
    return {
        "year": 2026,
        "pieces": [
            {"id": "soc_pensions", "type": "expenditure", "amount_eur": 200_000_000_000.0},
            {"id": "rev_transfers_in", "type": "revenue", "amount_eur": 1_000_000_000.0},
            {"id": "rev_vat_standard", "type": "revenue", "amount_eur": 1_000_000_000.0},
            {"id": "rev_csg_crds", "type": "revenue", "amount_eur": 1_000_000_000.0},
        ],
    }


def test_revenue_overlay_strict_does_not_apply_macro_closure() -> None:
    baseline = _baseline_template()
    aggregates = {"state": {"etat_a_line_items_eur": {}}}
    targets = {"state_non_fiscal": 10_000_000_000.0}

    _, applied, adjustments = _apply_revenue_overlay(
        baseline=baseline,
        aggregates=aggregates,
        group_target_values=targets,
        mode="true_level",
        year=2026,
        strict_official=True,
    )

    assert "apu_macro_closure_state_non_fiscal_delta_eur" not in applied
    assert all(str(adj.get("kind")) != "macro_deficit_closure" for adj in adjustments)


def test_revenue_overlay_non_strict_keeps_macro_closure_metadata() -> None:
    baseline = _baseline_template()
    aggregates = {"state": {"etat_a_line_items_eur": {}}}
    targets = {"state_non_fiscal": 10_000_000_000.0}

    _, applied, adjustments = _apply_revenue_overlay(
        baseline=baseline,
        aggregates=aggregates,
        group_target_values=targets,
        mode="true_level",
        year=2026,
        strict_official=False,
    )

    assert "apu_macro_closure_state_non_fiscal_delta_eur" in applied
    assert any(str(adj.get("kind")) == "macro_deficit_closure" for adj in adjustments)


def test_double_count_guard_is_warning_signal_only() -> None:
    baseline = {
        "pieces": [
            {"id": "grants_to_locals", "type": "expenditure", "amount_eur": 1_000_000_000.0},
        ]
    }
    after_masses = {
        "M_TRANSPORT": 100_000_000.0,
        "M_EDU": 200_000_000.0,
    }

    checks = _build_double_count_checks(baseline, after_masses)
    assert checks and checks[0]["status"] == "warn"
    assert "state->local transfers" in str(checks[0]["note"])
