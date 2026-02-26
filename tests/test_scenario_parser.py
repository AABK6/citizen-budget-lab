import json

from tools.etl.scenario_parser import flatten_scenario


def test_flatten_scenario_extracts_reforms_and_masses():
    dsl = {
        "version": 0.1,
        "baseline_year": 2026,
        "actions": [
            {
                "id": "wealth_tax",
                "target": "lever.wealth_tax",
                "op": "activate",
            },
            {
                "id": "amend_raise_buyback_tax",
                "target": "lever.amend_raise_buyback_tax",
                "op": "increase",
                "amount_eur": 250000000,
            },
            {
                "id": "mass_edu",
                "target": "mission.M_EDU",
                "op": "increase",
                "delta_pct": 5,
            },
            {
                "id": "mass_cofog_09",
                "target": "cofog.09",
                "op": "decrease",
                "delta_pct": 2,
            },
        ],
    }
    meta = {"timestamp": 1700000000.0}

    flat = flatten_scenario(json.dumps(dsl), meta)

    assert flat["baseline_year"] == 2026
    assert flat["reform_wealth_tax"] == 1.0
    assert flat["reform_amend_raise_buyback_tax"] == 250000000.0
    assert flat["mass_mission_m_edu_delta_pct"] == 5.0
    assert flat["mass_cofog_09_delta_pct"] == -2.0
    assert flat["vote_timestamp"] == 1700000000.0


def test_flatten_scenario_extracts_macro_stats():
    dsl = {"version": 0.1, "baseline_year": 2026, "actions": []}
    meta = {
        "accounting": {
            "deficit_path": [100.0, 200.0],
            "debt_path": [1500.0, 1750.0],
        }
    }

    flat = flatten_scenario(dsl, meta)

    assert flat["macro_deficit_final_eur"] == 200.0
    assert flat["macro_debt_final_eur"] == 1750.0


def test_flatten_scenario_extracts_panel_metadata():
    dsl = {"version": 0.1, "baseline_year": 2026, "actions": []}
    meta = {
        "timestamp": 1700001234,
        "respondentId": "abc-123",
        "sessionDurationSec": 42.5,
        "channel": "qualtrics",
        "entryPath": "/build?ID=abc-123",
    }

    flat = flatten_scenario(dsl, meta)

    assert flat["vote_timestamp"] == 1700001234.0
    assert flat["respondent_id"] == "abc-123"
    assert flat["session_duration_sec"] == 42.5
    assert flat["entry_channel"] == "qualtrics"
    assert flat["entry_path"] == "/build?ID=abc-123"
