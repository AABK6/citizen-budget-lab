from __future__ import annotations

from typing import Dict, List, Optional


# A catalog of well-defined, named reforms with fixed, pre-estimated budgetary impacts.
# In this model, levers are toggles, not parametric sliders.
# The impact is sourced from official reports or widely cited analyses.
_LEVER_CATALOG: List[dict] = [
    # --- PENSIONS ---
    {
        "id": "pensions_repeal_reform_64",
        "family": "PENSIONS",
        "label": "Repeal 2023 Pension Reform (Return to 62)",
        "description": "Cancels the 2023 reform, progressively returning the legal retirement age from 64 to 62.",
        "params_schema": {},
        "fixed_impact_eur": -17700000000,  # Cost of ~€17.7B in 2030
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Impact estimate for horizon year 2030."},
        "conflicts_with": ["pensions_maintain_reform_64"],
        "sources": ["Conseil d'orientation des retraites (COR)"],
        "popularity": 0.6,
        "mass_mapping": {"10": 1.0}
    },
    {
        "id": "pensions_maintain_reform_64",
        "family": "PENSIONS",
        "label": "Maintain Retirement Age at 64",
        "description": "Represents the baseline savings from the 2023 pension reform.",
        "params_schema": {},
        "fixed_impact_eur": 177000000000, # This is a saving
        "feasibility": {"law": False, "adminLagMonths": 0, "notes": "Baseline scenario."},
        "conflicts_with": ["pensions_repeal_reform_64"],
        "sources": ["Conseil d'orientation des retraites (COR)"],
        "popularity": 0.4,
        "mass_mapping": {"10": 1.0}
    },
    # --- TAXES ---
    {
        "id": "tax_vat_energy_lower_5_5",
        "family": "TAXES",
        "label": "Lower VAT on Energy to 5.5%",
        "description": "Reduces the Value Added Tax on all energy products (gas, electricity, fuel) to the reduced rate of 5.5%.",
        "params_schema": {},
        "fixed_impact_eur": -11000000000,  # Cost (revenue loss) of ~€11B per year
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Significant revenue loss."},
        "conflicts_with": [],
        "sources": ["Budget 2023 official estimates"],
        "popularity": 0.8,
        "mass_mapping": {} # Revenue levers do not map to expenditure masses
    },
    {
        "id": "tax_abolish_cvae",
        "family": "TAXES",
        "label": "Abolish CVAE Production Tax",
        "description": "Completes the two-year plan to abolish the CVAE, a tax on the added value produced by companies.",
        "params_schema": {},
        "fixed_impact_eur": -4000000000,  # Cost (revenue loss) of ~€4B per year
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "This is part of a multi-year government plan."},
        "conflicts_with": [],
        "sources": ["PLF 2024"],
        "popularity": 0.5,
        "mass_mapping": {}
    },
    # --- STAFFING ---
    {
        "id": "staffing_freeze_public_hiring",
        "family": "STAFFING",
        "label": "Freeze Public Sector Hiring (Non-priority)",
        "description": "Halts new hiring across the central state, except for security and education, relying on attrition for headcount reduction.",
        "params_schema": {},
        "fixed_impact_eur": 1500000000,  # Savings of ~€1.5B per year
        "feasibility": {"law": False, "adminLagMonths": 3, "notes": "Excludes priority sectors; may affect service quality."},
        "conflicts_with": [],
        "sources": ["Cour des comptes reports"],
        "popularity": 0.3,
        "mass_mapping": {"01": 0.6, "04": 0.2, "08": 0.2}
    },
    # --- DEFENSE ---
    {
        "id": "defense_reduce_vessel_orders",
        "family": "DEFENSE",
        "label": "Reduce Naval Vessel Orders",
        "description": "Cancel or defer the order for one new-generation frigate as part of the military programming law (LPM).",
        "params_schema": {},
        "fixed_impact_eur": 3000000000, # Savings of ~€3B spread over several years
        "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Long-term impact on naval capacity. Contractual negotiations required."},
        "conflicts_with": [],
        "sources": ["Loi de Programmation Militaire (LPM)"],
        "popularity": 0.4,
        "mass_mapping": {"02": 1.0}
    }
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


def suggest_levers_for_mass(mass_id: str, limit: int = 5) -> List[dict]:
    """Return levers ranked by relevance to the given COFOG major.

    Ranking = mass_mapping weight × popularity (fallback popularity=0.5 when absent).
    """
    mid = str(mass_id).zfill(2)[:2]
    scored: List[tuple[float, dict]] = []
    for it in _LEVER_CATALOG:
        mm = it.get("mass_mapping") or {}
        w = float(mm.get(mid, 0.0))
        if w <= 0:
            continue
        pop = float(it.get("popularity", 0.5))
        score = w * (0.5 + 0.5 * pop)
        scored.append((score, it))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:limit]]