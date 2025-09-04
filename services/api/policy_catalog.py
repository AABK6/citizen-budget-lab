from __future__ import annotations

from typing import Dict, List, Optional


# Minimal stub catalog for MVP+: extend with real config later.
_LEVER_CATALOG: List[dict] = [
    {
        "id": "def_procurements_trim",
        "family": "DEFENSE",
        "label": "Reduce vessel orders",
        "description": "Defer or cancel a portion of naval procurement.",
        "params_schema": {"cut_pct": {"min": 1, "max": 20, "step": 1}},
        "feasibility": {"law": False, "adminLagMonths": 6, "notes": "Contractual negotiations required."},
        "conflicts_with": ["def_fleet_delay"],
        "sources": ["LPM", "Cour des comptes"],
    },
    {
        "id": "def_fleet_delay",
        "family": "DEFENSE",
        "label": "Delay fleet renewal",
        "description": "Shift delivery schedule to later years.",
        "params_schema": {"delay_months": {"min": 3, "max": 24, "step": 3}},
        "feasibility": {"law": False, "adminLagMonths": 3, "notes": "Operational risk; avoid double-count with procurement cuts."},
        "conflicts_with": ["def_procurements_trim"],
        "sources": ["LPM"],
    },
    {
        "id": "staffing_headcount_minus1pct",
        "family": "STAFFING",
        "label": "Headcount −1%",
        "description": "Reduce public headcount via attrition.",
        "params_schema": {"pct": {"min": 0.5, "max": 3.0, "step": 0.5}},
        "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Natural attrition path."},
        "conflicts_with": [],
        "sources": ["PAP", "RAP"],
    },
    {
        "id": "pen_age_plus3m_per_year",
        "family": "PENSIONS",
        "label": "Retirement age +3m/yr",
        "description": "Gradual increase in retirement age.",
        "params_schema": {"hike_months_per_year": {"min": 3, "max": 6, "step": 3}},
        "feasibility": {"law": True, "adminLagMonths": 18, "notes": "Requires legislation."},
        "conflicts_with": [],
        "sources": ["DREES"],
    },
]


def list_policy_levers(family: Optional[str] = None, search: Optional[str] = None) -> List[dict]:
    items = _LEVER_CATALOG
    if family:
        fam = str(family).upper()
        items = [x for x in items if str(x.get("family", "")).upper() == fam]
    if search:
        q = search.lower()
        items = [
            x
            for x in items
            if q in str(x.get("label", "")).lower() or q in str(x.get("description", "")).lower()
        ]
    return list(items)


def levers_by_id() -> Dict[str, dict]:
    return {str(x.get("id")): x for x in _LEVER_CATALOG}

