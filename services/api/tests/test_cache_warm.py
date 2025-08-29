import csv
import os
from typing import Any, Dict, List

import pytest

from services.api.cache_warm import warm_plf_state_budget
from services.api.data_loader import allocation_by_mission
from services.api.models import Basis


def _meta_fields() -> Dict[str, Any]:
    return {
        "dataset": {
            "fields": [
                {"name": "exercice", "type": "double", "label": "exercice"},
                {"name": "mission", "type": "text", "label": "mission"},
                {"name": "libelle_mission", "type": "text", "label": "libelle mission"},
                {"name": "credit_de_paiement", "type": "double", "label": "credit de paiement"},
                {"name": "autorisation_engagement", "type": "double", "label": "autorisation engagement"},
                {"name": "typebudget", "type": "text", "label": "typeBudget"},
            ]
        }
    }


def _rows_raw(year: int) -> List[Dict[str, Any]]:
    return [
        {
            "mission": "050",
            "libelle_mission": "Securite",
            "credit_de_paiement": 1000.0,
            "autorisation_engagement": 1100.0,
            "exercice": float(year),
            "typebudget": "PLF",
        },
        {
            "mission": "050",
            "libelle_mission": "Securite",
            "credit_de_paiement": 2000.0,
            "autorisation_engagement": 2100.0,
            "exercice": float(year),
            "typebudget": "PLF",
        },
        {
            "mission": "060",
            "libelle_mission": "Education",
            "credit_de_paiement": 3000.0,
            "autorisation_engagement": 3100.0,
            "exercice": float(year),
            "typebudget": "PLF",
        },
    ]


def _out_path(year: int) -> str:
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    return os.path.join(here, "data", "cache", f"state_budget_mission_{year}.csv")


def _read_csv_rows(path: str) -> List[List[str]]:
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        return list(r)


def test_plf_server_side_groupby(monkeypatch, tmp_path):
    year = 2099
    out = _out_path(year)
    if os.path.exists(out):
        os.remove(out)

    # dataset_info returns expected schema
    from services.api.clients import ods as o

    monkeypatch.setattr(o, "dataset_info", lambda base, dataset: _meta_fields())

    # records with group_by returns aggregated rows
    def fake_records(base, dataset, select=None, where=None, group_by=None, order_by=None, limit=10, offset=0):  # noqa: ANN001
        if group_by:
            return {
                "results": [
                    {"record": {"mission": "050", "libelle_mission": "Securite", "cp_eur": 3000.0, "ae_eur": 3200.0}},
                    {"record": {"mission": "060", "libelle_mission": "Education", "cp_eur": 3000.0, "ae_eur": 3100.0}},
                ]
            }
        return {"results": []}

    monkeypatch.setattr(o, "records", fake_records)

    path = warm_plf_state_budget("https://example", "plf25", year, "credit_de_paiement", "autorisation_engagement")
    assert path == out
    assert os.path.exists(path)
    rows = _read_csv_rows(path)
    assert len(rows) >= 3  # header + 2 missions
    header = rows[0]
    assert header[:3] == ["year", "mission_code", "mission_label"]
    # Cleanup
    os.remove(path)


def test_plf_fallback_iterate_records(monkeypatch):
    year = 2099
    out = _out_path(year)
    if os.path.exists(out):
        os.remove(out)

    from services.api.clients import ods as o
    monkeypatch.setattr(o, "dataset_info", lambda base, dataset: _meta_fields())

    # First server-side aggregation fails
    def fake_records(base, dataset, select=None, where=None, group_by=None, order_by=None, limit=10, offset=0):  # noqa: ANN001
        if group_by:
            raise RuntimeError("400")
        # iterate_records path: return raw rows matching year
        return {"results": [{"record": r} for r in _rows_raw(year)]}

    monkeypatch.setattr(o, "records", fake_records)

    path = warm_plf_state_budget("https://example", "plf25", year, "credit_de_paiement", "autorisation_engagement", "typebudget='PLF'")
    assert path == out
    assert os.path.exists(path)
    rows = _read_csv_rows(path)
    assert len(rows) >= 3
    # Sum CP for mission 050 should be 3000
    data_rows = rows[1:]
    vals = {r[1]: float(r[5]) for r in data_rows}  # mission_code -> cp_eur
    assert abs(vals.get("050", 0.0) - 3000.0) < 1e-6
    os.remove(path)


def test_plf_fallback_drop_where_and_order_then_raw(monkeypatch):
    year = 2099
    out = _out_path(year)
    if os.path.exists(out):
        os.remove(out)

    from services.api.clients import ods as o
    monkeypatch.setattr(o, "dataset_info", lambda base, dataset: _meta_fields())

    # records rejects where/order/select unless all None; final raw rows succeed
    def fake_records(base, dataset, select=None, where=None, group_by=None, order_by=None, limit=10, offset=0):  # noqa: ANN001
        if group_by is not None:
            raise RuntimeError("400")
        if select is None and where is None and order_by is None:
            return {"results": [{"record": r} for r in _rows_raw(year)]}
        raise RuntimeError("400")

    monkeypatch.setattr(o, "records", fake_records)

    path = warm_plf_state_budget("https://example", "plf25", year)
    assert path == out
    assert os.path.exists(path)
    rows = _read_csv_rows(path)
    assert len(rows) >= 3
    os.remove(path)


def test_allocation_reads_cached_snapshot(tmp_path):
    year = 2098
    out = _out_path(year)
    # Write a minimal cached CSV
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["year", "mission_code", "mission_label", "programme_code", "programme_label", "cp_eur", "ae_eur"])
        w.writerow([year, "999", "Test Mission", "", "", 12345.0, 111.0])

    alloc = allocation_by_mission(year, Basis.CP)
    assert alloc.mission
    assert alloc.mission[0].code == "999"
    assert abs(alloc.mission[0].amount_eur - 12345.0) < 1e-6
    # Cleanup
    os.remove(out)
