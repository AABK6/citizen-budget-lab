import base64
import json
import os

from services.api.data_loader import run_scenario
from services.api.settings import get_settings


def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")


def test_macro_irf_override_changes_assumptions(monkeypatch, tmp_path):
    # Create a custom IRF file with different revenue_elasticity
    custom = tmp_path / "irf.json"
    custom.write_text(json.dumps({
        "horizon": 5,
        "okun_elasticity": 0.4,
        "revenue_elasticity": 0.9,
        "categories": {
            "09": {"irf_gdp": [0.3, 0.2, 0.1, 0.0, 0.0]}
        }
    }))
    monkeypatch.setenv("MACRO_IRFS_PATH", str(custom))

    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 5 }
actions:
  - id: p1
    target: piece.ed_schools_staff_ops
    op: increase
    amount_eur: 1000000000
    recurring: true
"""
    sid, acc, comp, macro, reso = run_scenario(_b64(sdl))
    assert abs(float(macro.assumptions["revenue_elasticity"]) - 0.9) < 1e-9
    assert any(abs(float(x)) > 0 for x in macro.delta_deficit)
