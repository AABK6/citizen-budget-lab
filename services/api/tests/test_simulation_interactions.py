import base64
import pytest
from unittest.mock import patch
from services.api.data_loader import run_scenario

def _b64(yaml_text: str) -> str:
    return base64.b64encode(yaml_text.encode("utf-8")).decode("utf-8")

# Mock Policy Catalog
MOCK_LEVERS = {
    "reform_A": {
        "id": "reform_A",
        "label": "Reform A",
        "fixed_impact_eur": 2_000_000_000, # Saves 2Md
        "mission_mapping": {"M_TEST": 1.0},
        "dimension": "cp"
    },
    "reform_B": {
        "id": "reform_B",
        "label": "Reform B (Huge)",
        "fixed_impact_eur": 12_000_000_000, # Saves 12Md
        "mission_mapping": {"M_TEST": 1.0},
        "dimension": "cp"
    }
}

@pytest.fixture
def mock_catalog():
    with patch("services.api.policy_catalog.levers_by_id", return_value=MOCK_LEVERS):
        yield

@pytest.fixture
def mock_lego_baseline():
    # We need a baseline for M_TEST to calculate percentages
    # Let's say M_TEST has a baseline of 100Md
    mock_pieces = [
        {
            "id": "piece_test",
            "type": "expenditure",
            "amount_eur": 100_000_000_000,
            "missions": [{"code": "M_TEST", "weight": 1.0}]
        }
    ]
    with patch("services.api.data_loader.load_lego_baseline", return_value={"pieces": mock_pieces, "depensesTotal": 100e9, "recettesTotal": 0}), \
         patch("services.api.data_loader.wh.lego_baseline", return_value={"pieces": mock_pieces}), \
         patch("services.api.data_loader.mission_bridges", return_value=({"piece_test": [("M_TEST", 1.0)]}, {})):
        yield

def test_toggle_consistency(mock_catalog, mock_lego_baseline):
    """
    Case 1: Verify that adding and removing a reform returns to baseline.
    """
    # Baseline
    sdl_base = """
version: 0.1
baseline_year: 2026
actions: []
"""
    _, acc_base, _, _, _, _ = run_scenario(_b64(sdl_base))
    base_deficit = acc_base.deficit_delta_path[0]

    # Add Reform A (Validation requires target/op/amount even for levers)
    sdl_add = """
version: 0.1
baseline_year: 2026
actions:
  - id: reform_A
    target: piece.reform_A
    op: decrease
    amount_eur: 2000000000
"""
    _, acc_add, _, _, _, _ = run_scenario(_b64(sdl_add))
    
    # Verify impact (Reform A saves 2Md -> Deficit delta should be -2Md)
    # Note: data_loader line 1368: delta = -impact. fixed_impact=2Md (pos). delta = -2Md.
    assert acc_add.deficit_delta_path[0] == base_deficit - 2_000_000_000
    
    # Remove Reform A
    sdl_remove = """
version: 0.1
baseline_year: 2026
actions: []
"""
    _, acc_remove, _, _, _, _ = run_scenario(_b64(sdl_remove))
    
    assert acc_remove.deficit_delta_path[0] == base_deficit

def test_bucket_filling_underflow(mock_catalog, mock_lego_baseline):
    """
    Case 2: Target -10% (10Md) and Reform A (2Md).
    Expectation: Total Delta = 10Md. Unspecified = 8Md.
    """
    sdl = """
version: 0.1
baseline_year: 2026
actions:
  - id: target_M_TEST
    target: mission.M_TEST
    op: decrease
    amount_eur: 10000000000
    role: target
  - id: reform_A
    target: piece.reform_A
    op: decrease
    amount_eur: 2000000000
"""
    _, acc, _, _, reso, _ = run_scenario(_b64(sdl))
    
    m_test = next(m for m in reso["byMass"] if m["massId"] == "M_TEST")
    
    # Debug output
    print(f"Target: {m_test.get('targetDeltaEur')}")
    print(f"Specified: {m_test.get('specifiedDeltaEur')}")
    print(f"Unspecified: {m_test.get('unspecifiedCpDeltaEur')}")
    print(f"Total CP Delta: {m_test.get('cpDeltaEur')}")

    # Check expectations for "Bucket Filling"
    # Target Delta should be -10Md (negative for savings/decrease)
    # Specified should be -2Md
    # Unspecified should be -8Md
    
    # Note: In data_loader, "target_delta = amount * float(weight)".
    # op="decrease", amount=10Md -> amount var = -10Md.
    # So target_delta = -10Md.
    
    # reform A: delta = -2Md.
    
    # Current Logic (lines 1730+):
    # unspecified_delta = target_delta - specified_mission
    # -10Md - (-2Md) = -8Md.
    # Total = specified + unspecified = -2 + -8 = -10.
    
    # So the logic SEEMS to implement bucket filling already?
    # "unspecified_delta = target_delta - specified_mission"
    
    assert m_test["targetDeltaEur"] == -10_000_000_000
    assert m_test["specifiedDeltaEur"] == -2_000_000_000
    assert m_test["unspecifiedCpDeltaEur"] == -8_000_000_000
    assert m_test["cpDeltaEur"] == -10_000_000_000

def test_bucket_filling_overflow(mock_catalog, mock_lego_baseline):
    """
    Case 3: Target -10% (10Md) and Reform B (12Md).
    Expectation: Total Delta = 12Md. Unspecified = 0.
    """
    sdl = """
version: 0.1
baseline_year: 2026
actions:
  - id: target_M_TEST
    target: mission.M_TEST
    op: decrease
    amount_eur: 10000000000
    role: target
  - id: reform_B
    target: piece.reform_B
    op: decrease
    amount_eur: 12000000000
"""
    _, acc, _, _, reso, _ = run_scenario(_b64(sdl))
    
    m_test = next(m for m in reso["byMass"] if m["massId"] == "M_TEST")
    
    print(f"Target: {m_test.get('targetDeltaEur')}")
    print(f"Specified: {m_test.get('specifiedDeltaEur')}")
    print(f"Unspecified: {m_test.get('unspecifiedCpDeltaEur')}")
    print(f"Total CP Delta: {m_test.get('cpDeltaEur')}")
    
    # Target = -10Md
    # Specified = -12Md
    # Unspecified = -10Md - (-12Md) = +2Md ?
    # Wait, if unspecified becomes positive, it means we are "adding back" spending to match the target?
    # BUT the user said: "if only if goes over compute it".
    # Meaning: if Specified > Target, then Total = Specified. Unspecified = 0.
    # We should NOT reduce the savings back to 10Md.
    
    # Current logic:
    # unspecified = target - specified = -10 - (-12) = +2.
    # Total = -12 + 2 = -10.
    # So current logic forces the result TO the target, effectively capping the reform's impact at the target level.
    # THIS IS THE BUG. The user wants the reform to overflow.
    
    # We expect Unspecified to be 0 (capped at 0 change? or just 0 bucket fill?)
    # If Specified (-12) is "more saving" than Target (-10), we should keep -12.
    # So Unspecified should be 0.
    
    assert m_test["unspecifiedCpDeltaEur"] == 0
    assert m_test["cpDeltaEur"] == -12_000_000_000

def test_action_order_invariance(mock_catalog, mock_lego_baseline):
    """
    Case 4: Verify that [Target, Reform] produces same result as [Reform, Target].
    The engine splits processing into passes, so order in DSL should not matter.
    """
    dsl_1 = """
version: 0.1
baseline_year: 2026
actions:
  - id: target_M_TEST
    target: mission.M_TEST
    op: decrease
    amount_eur: 10000000000
    role: target
  - id: reform_A
    target: piece.reform_A
    op: decrease
    amount_eur: 2000000000
"""
    
    dsl_2 = """
version: 0.1
baseline_year: 2026
actions:
  - id: reform_A
    target: piece.reform_A
    op: decrease
    amount_eur: 2000000000
  - id: target_M_TEST
    target: mission.M_TEST
    op: decrease
    amount_eur: 10000000000
    role: target
"""
    _, acc_1, _, _, reso_1, _ = run_scenario(_b64(dsl_1))
    _, acc_2, _, _, reso_2, _ = run_scenario(_b64(dsl_2))
    
    assert acc_1.deficit_delta_path == acc_2.deficit_delta_path
    
    m_test_1 = next(m for m in reso_1["byMass"] if m["massId"] == "M_TEST")
    m_test_2 = next(m for m in reso_2["byMass"] if m["massId"] == "M_TEST")
    
    assert m_test_1 == m_test_2