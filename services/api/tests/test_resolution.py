import base64
from services.api.data_loader import run_scenario

def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")

def test_resolution_piece_only():
    """Test that a simple piece change correctly updates specifiedDeltaEur and the deficit."""
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 5 }
actions:
  - id: p1
    target: piece.ed_schools_staff_ops # COFOG 09.1
    op: increase
    amount_eur: 1000
    recurring: true
"""
    sid, acc, comp, macro, reso, warnings = run_scenario(_b64(sdl))
    
    assert acc.deficit_delta_path is not None
    assert acc.debt_delta_path is not None
    assert acc.deficit_delta_path[0] == 1000
    assert acc.debt_delta_path[0] == 1000
    assert acc.debt_delta_path[4] == 5000

    assert reso["overallPct"] == 0.0 # No target, so resolution is 0%
    mass_09 = next((m for m in reso["byMass"] if m["massId"] == "09"), None)
    assert mass_09 is not None
    assert mass_09["targetDeltaEur"] == 0.0
    assert mass_09["specifiedDeltaEur"] == 1000.0

def test_resolution_mission_only():
    """Test that a simple mission change correctly updates targetDeltaEur and the deficit."""
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 5 }
actions:
  - id: m1
    target: mission.education # COFOG 09
    op: increase
    amount_eur: 5000
    recurring: true
"""
    sid, acc, comp, macro, reso, warnings = run_scenario(_b64(sdl))
    
    assert acc.deficit_delta_path is not None
    assert acc.debt_delta_path is not None
    assert acc.deficit_delta_path[0] == 5000
    assert acc.debt_delta_path[4] == 25000

    assert reso["overallPct"] == 0.0 # Unspecified change doesn't count as specified
    mass_09 = next((m for m in reso["byMass"] if m["massId"] == "09"), None)
    assert mass_09 is not None
    assert mass_09["targetDeltaEur"] == 5000.0
    assert mass_09["specifiedDeltaEur"] == 0.0

def test_resolution_hierarchical_no_double_count():
    """Test that a hierarchical change does not double-count."""
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 5 }
actions:
  - id: m1
    target: mission.education # COFOG 09
    op: increase
    amount_eur: 5000
    recurring: true
  - id: p1
    target: piece.ed_schools_staff_ops # COFOG 09.1
    op: increase
    amount_eur: 1000
    recurring: true
"""
    sid, acc, comp, macro, reso, warnings = run_scenario(_b64(sdl))
    
    # The total change should be the mission target, not mission + piece
    assert acc.deficit_delta_path is not None
    assert acc.debt_delta_path is not None
    assert acc.deficit_delta_path[0] == 5000
    assert acc.debt_delta_path[4] == 25000

    assert abs(reso["overallPct"] - (1000 / 5000)) < 1e-9
    mass_09 = next((m for m in reso["byMass"] if m["massId"] == "09"), None)
    assert mass_09 is not None
    assert mass_09["targetDeltaEur"] == 5000.0
    assert mass_09["specifiedDeltaEur"] == 1000.0

def test_resolution_missing_cofog_warning():
    """Test that a piece with a missing COFOG mapping generates a warning."""
    sdl = """
version: 0.1
baseline_year: 2026
assumptions: { horizon_years: 5 }
actions:
  - id: p1
    target: piece.test_piece_no_cofog
    op: increase
    amount_eur: 1000
    recurring: true
"""
    sid, acc, comp, macro, reso, warnings = run_scenario(_b64(sdl))
    
    assert len(warnings) == 1
    assert "test_piece_no_cofog" in warnings[0]
    assert "missing a COFOG mapping" in warnings[0]
