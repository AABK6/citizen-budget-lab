from __future__ import annotations

from pathlib import Path

import pytest

from tools.build_voted_2026_aggregates import _build_apu_targets, build_aggregates


def _write(path: Path, content: str) -> Path:
    path.write_text(content, encoding="utf-8")
    return path


def _write_bridge(path: Path) -> Path:
    return _write(
        path,
        (
            "year,entry_type,subsector,key,cofog,na_item,mass_id,weight,source,source_url,note\n"
            "2026,state_mission,state,EC,GF09,TE,M_EDU,1,src,https://example.invalid,ok\n"
            "2026,state_mission,state,TA,GF04,TE,M_TRANSPORT,1,src,https://example.invalid,ok\n"
            "2026,social_branch,social,maladie,GF07,TE,M_HEALTH,1,src,https://example.invalid,ok\n"
            "2026,local_mass,local,M_HOUSING,GF06,TE,M_HOUSING,1,src,https://example.invalid,ok\n"
            "2026,local_mass,local,M_TRANSPORT,GF04,TE,M_TRANSPORT,1,src,https://example.invalid,ok\n"
        ),
    )


def test_build_apu_targets_includes_local_rows_and_source_quality(tmp_path: Path) -> None:
    state_b = _write(
        tmp_path / "state_b.csv",
        (
            "mission_code,cp_eur_jo,cp_eur_budget_annex,match_ok\n"
            "EC,1000000000,1000000000,true\n"
            "TA,2000000000,2000000000,true\n"
        ),
    )
    state_a = _write(
        tmp_path / "state_a.csv",
        (
            "metric_key,value_eur,match_ok\n"
            "budget_general_recettes_fiscales_nettes,100000000,true\n"
            "budget_general_psr_collectivites_ue,10000000,true\n"
            "budget_general_recettes_non_fiscales,20000000,true\n"
        ),
    )
    state_a_lines = _write(
        tmp_path / "state_a_lines.csv",
        "line_code,section,label,amount_eur\n1601,fiscal,TVA,10000000\n",
    )
    lfss_branch = _write(
        tmp_path / "lfss_branch.csv",
        (
            "branch_key,recettes_eur,depenses_eur,solde_eur,match_ok\n"
            "maladie,100000000,110000000,-10000000,true\n"
            "all_branches_hors_transferts,300000000,350000000,-50000000,true\n"
        ),
    )
    lfss_asso = _write(
        tmp_path / "lfss_asso.csv",
        (
            "metric_key,value_pct_pib,match_ok\n"
            "asso_recettes_pct_pib_2026,26.9,true\n"
        ),
    )
    apul = _write(
        tmp_path / "apul.csv",
        (
            "year,mass_id,mass_label,amount_eur,subsector,source_quality,source_ref,method_note,match_ok\n"
            "2026,M_HOUSING,Logement local,5000000000,S1313,estimated,https://example.invalid,test,true\n"
            "2026,M_TRANSPORT,Transport local,7000000000,S1313,estimated,https://example.invalid,test,true\n"
        ),
    )
    bridge = _write_bridge(tmp_path / "bridge.csv")

    payload = build_aggregates(
        state_b_csv=state_b,
        state_a_csv=state_a,
        state_a_lines_csv=state_a_lines,
        lfss_branch_csv=lfss_branch,
        lfss_asso_csv=lfss_asso,
        apul_csv=apul,
        bridge_csv=bridge,
    )
    targets = _build_apu_targets(payload)

    exp_rows = targets["targets"]["expenditure"]
    rev_rows = targets["targets"]["revenue"]
    assert any(
        row["mass_id"] == "M_HOUSING" and row["subsector"] == "S1313" and row["source_quality"] == "estimated"
        for row in exp_rows
    )
    assert any(row["group_id"] == "state_fiscal" and row["source_quality"] == "voted" for row in rev_rows)
    assert any(row["group_id"] == "social_security" and row["source_quality"] == "voted" for row in rev_rows)
    assert set(targets["pillars"].keys()) == {"state", "social", "local"}
    assert any(row["mass_id"] == "M_HOUSING" for row in targets["pillars"]["local"]["expenditure"])
    assert targets["summary"]["by_pillar"]["local"]["expenditure_eur"] > 0


def test_build_aggregates_requires_apul_verified_csv(tmp_path: Path) -> None:
    state_b = _write(
        tmp_path / "state_b.csv",
        "mission_code,cp_eur_jo,cp_eur_budget_annex,match_ok\nEC,1000000000,1000000000,true\n",
    )
    state_a = _write(
        tmp_path / "state_a.csv",
        (
            "metric_key,value_eur,match_ok\n"
            "budget_general_recettes_fiscales_nettes,100000000,true\n"
            "budget_general_psr_collectivites_ue,10000000,true\n"
            "budget_general_recettes_non_fiscales,20000000,true\n"
        ),
    )
    state_a_lines = _write(
        tmp_path / "state_a_lines.csv",
        "line_code,section,label,amount_eur\n1601,fiscal,TVA,10000000\n",
    )
    lfss_branch = _write(
        tmp_path / "lfss_branch.csv",
        (
            "branch_key,recettes_eur,depenses_eur,solde_eur,match_ok\n"
            "maladie,100000000,110000000,-10000000,true\n"
            "all_branches_hors_transferts,300000000,350000000,-50000000,true\n"
        ),
    )
    lfss_asso = _write(
        tmp_path / "lfss_asso.csv",
        "metric_key,value_pct_pib,match_ok\nasso_recettes_pct_pib_2026,26.9,true\n",
    )
    missing_apul = tmp_path / "missing_apul.csv"
    bridge = _write_bridge(tmp_path / "bridge.csv")

    with pytest.raises(RuntimeError, match="APUL verified CSV is required"):
        build_aggregates(
            state_b_csv=state_b,
            state_a_csv=state_a,
            state_a_lines_csv=state_a_lines,
            lfss_branch_csv=lfss_branch,
            lfss_asso_csv=lfss_asso,
            apul_csv=missing_apul,
            bridge_csv=bridge,
        )


def test_build_aggregates_requires_bridge_csv(tmp_path: Path) -> None:
    state_b = _write(
        tmp_path / "state_b.csv",
        "mission_code,cp_eur_jo,cp_eur_budget_annex,match_ok\nEC,1000000000,1000000000,true\n",
    )
    state_a = _write(
        tmp_path / "state_a.csv",
        (
            "metric_key,value_eur,match_ok\n"
            "budget_general_recettes_fiscales_nettes,100000000,true\n"
            "budget_general_psr_collectivites_ue,10000000,true\n"
            "budget_general_recettes_non_fiscales,20000000,true\n"
        ),
    )
    state_a_lines = _write(
        tmp_path / "state_a_lines.csv",
        "line_code,section,label,amount_eur\n1601,fiscal,TVA,10000000\n",
    )
    lfss_branch = _write(
        tmp_path / "lfss_branch.csv",
        (
            "branch_key,recettes_eur,depenses_eur,solde_eur,match_ok\n"
            "maladie,100000000,110000000,-10000000,true\n"
            "all_branches_hors_transferts,300000000,350000000,-50000000,true\n"
        ),
    )
    lfss_asso = _write(
        tmp_path / "lfss_asso.csv",
        "metric_key,value_pct_pib,match_ok\nasso_recettes_pct_pib_2026,26.9,true\n",
    )
    apul = _write(
        tmp_path / "apul.csv",
        (
            "year,mass_id,mass_label,amount_eur,subsector,source_quality,source_ref,method_note,match_ok\n"
            "2026,M_HOUSING,Logement local,5000000000,S1313,estimated,https://example.invalid,test,true\n"
        ),
    )
    missing_bridge = tmp_path / "missing_bridge.csv"

    with pytest.raises(RuntimeError, match="Bridge CSV is required"):
        build_aggregates(
            state_b_csv=state_b,
            state_a_csv=state_a,
            state_a_lines_csv=state_a_lines,
            lfss_branch_csv=lfss_branch,
            lfss_asso_csv=lfss_asso,
            apul_csv=apul,
            bridge_csv=missing_bridge,
        )
