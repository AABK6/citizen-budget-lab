from __future__ import annotations

import base64

import pytest
import yaml

from services.api.data_loader import run_scenario


def _encode_dsl(dsl: dict) -> str:
    return base64.b64encode(yaml.safe_dump(dsl).encode("utf-8")).decode("utf-8")


def test_run_scenario_populates_ratio_and_gdp_series():
    dsl = {
        "version": 1,
        "baseline_year": 2026,
        "actions": [],
        "assumptions": {"lens": "MISSION"},
    }
    _, acc, _comp, _macro, _reso, _warnings = run_scenario(_encode_dsl(dsl))

    assert len(acc.gdp_path) >= 1
    assert len(acc.deficit_path) == len(acc.deficit_ratio_path) >= 1
    assert len(acc.baseline_deficit_ratio_path) == len(acc.baseline_deficit_path)

    gdp0 = acc.gdp_path[0]
    assert gdp0 != 0
    assert acc.deficit_ratio_path[0] == pytest.approx(acc.deficit_path[0] / gdp0)
    assert acc.baseline_deficit_ratio_path[0] == pytest.approx(acc.baseline_deficit_path[0] / gdp0)


def test_lever_savings_reduce_deficit_totals():
    dsl = {
        "version": 1,
        "baseline_year": 2026,
        "actions": [
            {
                "id": "annee_blanche_indexation",
                "target": "piece.annee_blanche_indexation",
                "op": "apply",
            }
        ],
        "assumptions": {"lens": "MISSION"},
    }
    _, acc, _comp, macro, _reso, _warnings = run_scenario(_encode_dsl(dsl))

    baseline0 = acc.baseline_deficit_path[0]
    delta0 = acc.deficit_delta_path[0]
    macro0 = macro.delta_deficit[0]
    total0 = acc.deficit_path[0]

    # Sanity-check mechanical sign convention: savings => negative delta
    assert delta0 == pytest.approx(-6_500_000_000.0)
    # Macro kernel is zero for this lever in year 0
    assert macro0 == pytest.approx(0.0, abs=1e-6)
    # Totals follow backend combination logic (baseline - delta - macro)
    assert total0 == pytest.approx(baseline0 - delta0 - macro0)
    # Resulting deficit is smaller in magnitude than baseline
    assert total0 > baseline0
