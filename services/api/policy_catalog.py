from __future__ import annotations

from typing import Dict, List, Optional


# A catalog of well-defined, named reforms with fixed, pre-estimated budgetary impacts.
# In this model, levers are toggles, not parametric sliders.
# The impact is sourced from official reports or widely cited analyses.
_LEVER_CATALOG: List[dict] = [
    {
        "id": "annee_blanche_indexation",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 6500000000,  # Approximate savings from freezing benefit indexation for one year
        "mass_mapping": {"10": 1.0},
        "feasibility": {
            "law": True,
            "adminLagMonths": 2,
            "notes": "Requires finance bill amendment; politically sensitive due to impact on households."
        },
        "conflicts_with": [],
        "sources": ["Cour des comptes 2023", "PLF 2026 orientation documents"],
        "params_schema": {},
        "dimension": "cp",
    },
    {
        "id": "plf2026_mission_justice_efficiency",
        "family": "OPERATIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 750000000,
        "mass_mapping": {"03": 1.0},
        "feasibility": {
            "law": False,
            "adminLagMonths": 9,
            "notes": "Requires programme-by-programme redeployment; identified in PLF 2026 savings annex.",
        },
        "conflicts_with": [],
        "sources": ["PLF 2026, Mission Justice"],
        "params_schema": {},
        "dimension": "cp",
        "short_label": "Justice savings",
        "popularity": 0.35,
    },
    {
        "id": "plf2026_mission_education_efficiency",
        "family": "OPERATIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1200000000,
        "mass_mapping": {"09": 1.0},
        "feasibility": {
            "law": False,
            "adminLagMonths": 12,
            "notes": "Requires management reform and procurement pooling across rectorats.",
        },
        "conflicts_with": [],
        "sources": ["PLF 2026, Mission Enseignement scolaire"],
        "params_schema": {},
        "dimension": "cp",
        "short_label": "Education effic.",
        "popularity": 0.28,
    },
    {
        "id": "plf2026_mission_foreign_affairs_streamlining",
        "family": "OPERATIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 350000000,
        "mass_mapping": {"01": 1.0},
        "feasibility": {
            "law": False,
            "adminLagMonths": 18,
            "notes": "Requires administrative decrees and redeployment of staff; highlighted in PLF 2026 action plan.",
        },
        "conflicts_with": [],
        "sources": ["PLF 2026, Mission Action extérieure"],
        "params_schema": {},
        "dimension": "cp",
        "short_label": "Affaires ext.",
        "popularity": 0.22,
    },
    {
        "id": "wealth_tax",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 4000000000,  # Independent estimates ~€3–4 billion net gain; some political claims up to €10 billion
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires new tax law; politically symbolic and contested."},
        "conflicts_with": [],
        "sources": ["Institut Montaigne [1]"],
        "params_schema": {}
    },
    {
        "id": "high_income_surtax",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 8000000000,  # e.g. adding multiple brackets could raise ~€8–10 billion annually
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Requires budget law change; likely political resistance from opposition."},
        "conflicts_with": [],
        "sources": ["Fondation iFRAP [4]"],
        "params_schema": {}
    },
    {
        "id": "superprofits_tax",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 4000000000,  # Moderate design yields a few €billion/year; extreme proposals claim >€20 billion (unlikely)
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Needs new tax law; complex to define 'excess' profits and avoid capital flight."},
        "conflicts_with": [],
        "sources": ["Oxfam France [6]"],
        "params_schema": {}
    },
    {
        "id": "end_flat_tax",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 3500000000,  # Estimated additional revenue of ~€3–4 billion annually
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Implemented via finance law; may affect investment behavior."},
        "conflicts_with": [],
        "sources": ["Fondation iFRAP [8]"],
        "params_schema": {}
    },
    {
        "id": "expand_ftt",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2000000000,  # Doubling current scope could roughly add €1–3 billion in revenue
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Requires law; careful design needed to avoid market relocation."},
        "conflicts_with": [],
        "sources": ["Assemblée nationale [9]"],
        "params_schema": {}
    },
    {
        "id": "progressive_csg",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 4500000000,  # A reformed CSG could yield on the order of +€4–5 billion if broadened to more income types
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Adjustment via social security financing law; aims for revenue-neutral shifts or modest net gain."},
        "conflicts_with": [],
        "sources": ["Fondation iFRAP [10]"],
        "params_schema": {}
    },
    {
        "id": "carbon_tax",
        "family": "CLIMATE",
        "label": "",
        "description": "",
        "fixed_impact_eur": 3000000000,  # Moderate carbon tax hikes could generate an extra €2–4 billion annually
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Implemented via tax law; politically sensitive (yellow-vest protests)."},
        "conflicts_with": [],
        "sources": ["Oxfam France [6]"],
        "params_schema": {}
    },
    {
        "id": "cap_research_credit",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2000000000,  # Capping or trimming this €7.7 billion/year credit could save a few €billion
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Change in tax code; risk of pushback from industry and research sectors."},
        "conflicts_with": [],
        "sources": ["La Finance Pour Tous [16]"],
        "params_schema": {}
    },
    {
        "id": "reduce_home_services_credit",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1000000000,  # Partial reduction of this ~€6.8 billion expenditure could save on the order of €1 billion+
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Requires tax code change; might affect domestic employment sector."},
        "conflicts_with": [],
        "sources": ["La Finance Pour Tous [17]"],
        "params_schema": {}
    },
    {
        "id": "remove_pension_deduction",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 5000000000,  # Would yield up to €5 billion by ending a €4.95 billion tax break for many retirees
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Change in tax law; politically sensitive among retirees."},
        "conflicts_with": [],
        "sources": ["La Finance Pour Tous [18]"],
        "params_schema": {}
    },
    {
        "id": "end_overtime_exemption",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1700000000,  # Removing this €1.8 billion/year tax niche would bring in roughly €1.5–2 billion
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Simple change via finance law; may be unpopular as it affects take-home pay."},
        "conflicts_with": [],
        "sources": ["La Finance Pour Tous [19]"],
        "params_schema": {}
    },
    {
        "id": "fight_tax_fraud",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2300000000,  # Targeted additional tax recoveries ~€1–3 billion per year (gov aims ~€2.3 billion in 2024)
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Mostly administrative, but may require new enforcement powers; actual yields uncertain."},
        "conflicts_with": [],
        "sources": ["Public Sénat [20]"],
        "params_schema": {}
    },
    {
        "id": "expand_digital_tax",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 800000000,  # Roughly +€0.5–1 billion a year potential from expanded digital taxation
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Dependent on international agreements (OECD/EU) for full effect; domestic DST increase possible unilaterally."},
        "conflicts_with": [],
        "sources": ["France24 [22]"],
        "params_schema": {}
    },
    {
        "id": "reinstate_cvae",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 4000000000,  # Reversing the 2023 cut would bring back roughly €4 billion per year
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Would be done via finance law; opposed by businesses due to competitiveness concerns."},
        "conflicts_with": [],
        "sources": ["France24 [22]"],
        "params_schema": {}
    },
    {
        "id": "cut_fuel_taxes",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": -5000000000,  # A significant fuel tax cut or subsidy could cost the budget on the order of several €billion annually
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 1, "notes": "Can be done via budget or decree; quick to implement but very costly and possibly at odds with climate goals."},
        "conflicts_with": [],
        "sources": ["Budget 2022"],
        "params_schema": {}
    },
    {
        "id": "cut_income_tax_middle",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": -3000000000,  # Depending on scope, could reduce revenues by roughly €2–5 billion annually
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Would be included in a finance law; popular with taxpayers but worsens deficit."},
        "conflicts_with": [],
        "sources": ["Budget debates 2023"],
        "params_schema": {}
    },
    {
        "id": "expand_overtime_exemption",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": -500000000,  # Additional relief measures would have modest costs (hundreds of €millions)
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Change via finance or social law; relatively easy administratively, but reduces revenues."},
        "conflicts_with": ["end_overtime_exemption"],
        "sources": ["Budget debates 2023"],
        "params_schema": {}
    },
    {
        "id": "cut_vat_essentials",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": -1500000000,  # Lowering VAT on basics could cost on the order of €1–2 billion in revenue, depending on scope
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Needs change in VAT law; EU VAT rules allow reduced rates on some essentials."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "cut_vat_energy",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": -11000000000,  # Estimated annual revenue loss of ~€10–12 billion from such a drastic VAT cut on energy
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires EU approval to derogate from standard VAT rules on fuel; very costly measure championed by opposition."},
        "conflicts_with": [],
        "sources": ["Independent est."],
        "params_schema": {}
    },
    {
        "id": "freeze_tax_brackets",
        "family": "TAXES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 6100000000,  # Not indexing for one year yields roughly +€6.1 billion (2024 est.)
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 0, "notes": "Enacted via annual budget; quick fiscal gain but effectively a stealth tax increase on all taxpayers."},
        "conflicts_with": [],
        "sources": ["PLF 2024"],
        "params_schema": {}
    },
    {
        "id": "raise_retirement_age_65",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 8000000000,  # On the order of +€5–10 billion annual savings by early 2030s (incremental to the 64->65 shift)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Major pension reform requiring law; phased implementation over several years."},
        "conflicts_with": ["lower_retirement_age_62", "lower_retirement_age_60"],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "lower_retirement_age_62",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": -34000000000,  # Estimated cost over €34 billion per year once implemented (undoing the 64-age savings)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Would require overturning recent law; extremely costly and likely violates EU fiscal commitments."},
        "conflicts_with": ["raise_retirement_age_65"],
        "sources": ["BFMTV [23]"],
        "params_schema": {}
    },
    {
        "id": "lower_retirement_age_60",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": -50000000000,  # Around €50 billion annual cost (a transformative expansion of pension outlays)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Flagship far-left proposal; tremendously expensive and would require massive new revenues or debt."},
        "conflicts_with": ["raise_retirement_age_65"],
        "sources": ["OFCE (2024)"],
        "params_schema": {}
    },
    {
        "id": "extend_contribution_period",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 5000000000,  # Extended careers would gradually yield savings on the order of several €billion annually
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Can be included in pension law; effect builds over time as cohorts adjust."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "close_special_regimes",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 500000000,  # Closing remaining special regimes would save on the order of €0.5–1 billion annually (growing over time)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Reform via statute or in pension law; unions strongly resist, and savings materialize gradually."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "freeze_pension_indexation",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 6200000000,  # One-year freeze (delay Jan to Dec) in 2025 was estimated to save €6.2 billion
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Change enacted via Social Security law; immediate budget relief but reduces retirees’ purchasing power."},
        "conflicts_with": [],
        "sources": ["L'Express [26]"],
        "params_schema": {}
    },
    {
        "id": "align_public_private_pensions",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1500000000,  # Could eventually save on the order of €1–2 billion annually in the long run
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires pension reform law; long-term savings as new formula phases in."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "raise_pension_contributions",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 10000000000,  # Roughly +€1 billion per 0.1% point increase – e.g. a full 1% point combined hike yields ~€10 billion
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Change via Social Security financing law; effectively a tax increase on labor, facing resistance from employers and workers."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "raise_min_pension",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": -1500000000,  # A further boost to minimum pensions could cost on the order of €1–2 billion annually (depending on scope)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Included in pension or social security law; must be financed by other measures or adds to deficit."},
        "conflicts_with": [],
        "sources": ["BFMTV [25]"],
        "params_schema": {}
    },
    {
        "id": "tighten_unemployment_benefits",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2500000000,  # Current reforms aim for ~€2–2.5 billion savings by 2026; deeper cuts could reach €4 billion by 2030
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Implemented via unemployment insurance regulations (backed by law or decree); opposed by unions but already partly in effect."},
        "conflicts_with": ["expand_unemployment_benefits"],
        "sources": ["Le Monde [28]"],
        "params_schema": {}
    },
    {
        "id": "expand_unemployment_benefits",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": -2500000000,  # Would forgo the ~€2–2.5 billion in savings planned from the recent reform (and cost more if made even more generous)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Could be done by executive order (as rules are in regulations) but likely via law; politically supported by left, criticized by fiscal watchdogs."},
        "conflicts_with": ["tighten_unemployment_benefits"],
        "sources": ["Le Monde [28]"],
        "params_schema": {}
    },
    {
        "id": "tighten_rsa_requirements",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 800000000,  # Hard to quantify; optimistic scenarios see up to ~€0.5–1 billion in savings if many exit the program
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Would need legal changes and administrative capacity to enforce; savings are speculative and depend on implementation."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "restrict_non_citizen_benefits",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2000000000,  # Populist proposals claim ~€1–3 billion savings, but legal feasibility is doubtful
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Likely unconstitutional and against EU law; even if attempted, would face legal challenges and limited savings."},
        "conflicts_with": [],
        "sources": ["RN estimate"],
        "params_schema": {}
    },
    {
        "id": "freeze_social_benefits",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2300000000,  # An across-the-board one-year freeze of major benefits could save roughly €2.3 billion
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Can be done via budget/social security law for one year; reduces purchasing power for the poorest."},
        "conflicts_with": [],
        "sources": ["L'Express [27]"],
        "params_schema": {}
    },
    {
        "id": "cut_housing_aid",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1300000000,  # E.g. eliminating certain housing aid programs was estimated up to ~€1.3 billion saved
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Change in Social Security or budget law; directly affects low-income renters, likely controversial."},
        "conflicts_with": [],
        "sources": ["L'Express [31]"],
        "params_schema": {}
    },
    {
        "id": "cut_family_benefits",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 600000000,  # On the order of €0.5–1 billion could be saved by further reducing upper-tier family benefits
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Changes via social security financing law; moderate savings but politically delicate among families."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "fight_social_fraud",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1000000000,  # Officials cite potential to recover +€1 billion or more (currently ~€0.9b is recouped out of an estimated €20b fraud gap)
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Administrative measures (improved data cross-checks, inspections) largely; additional legal tools might help. Real impact uncertain."},
        "conflicts_with": [],
        "sources": ["Fondation iFRAP [61]"],
        "params_schema": {}
    },
    {
        "id": "eliminate_ame",
        "family": "SOCIAL_SECURITY",
        "label": "",
        "description": "",
        "fixed_impact_eur": 500000000,  # Would save a few hundred million euros per year (though some costs might shift to emergency care)
        "mass_mapping": {"07": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Requires legal change; controversial due to public health implications and likely marginal net savings."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "cap_health_spending",
        "family": "HEALTH",
        "label": "",
        "description": "",
        "fixed_impact_eur": 5000000000,  # A stringent cap was targeted to save roughly €5 billion in healthcare costs in a year (e.g. 2025 plan)
        "mass_mapping": {"07": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Set in the Social Security financing law; requires subsequent cost-containment measures by health authorities."},
        "conflicts_with": [],
        "sources": ["Bayrou plan [32]"],
        "params_schema": {}
    },
    {
        "id": "reduce_health_costs",
        "family": "HEALTH",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2000000000,  # A package of efficiency measures could save on the order of €1–3 billion in health spending
        "mass_mapping": {"07": 1.0},
        "feasibility": {"law": False, "adminLagMonths": 6, "notes": "Mostly via administrative decisions and regulatory changes in health insurance coverage; part of recent savings plans."},
        "conflicts_with": [],
        "sources": ["Bayrou plan [32]"],
        "params_schema": {}
    },
    {
        "id": "increase_patient_copays",
        "family": "HEALTH",
        "label": "",
        "description": "",
        "fixed_impact_eur": 200000000,  # Such measures would have only marginal net savings (on the order of €0.1–0.2 billion)
        "mass_mapping": {"07": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Usually set via Social Security financing law; politically sensitive as it affects access, and savings are small."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "hire_health_workers",
        "family": "HEALTH",
        "label": "",
        "description": "",
        "fixed_impact_eur": -2800000000,  # Rough cost ~€2.8 billion per year for +20k nurses (approx. €140k including benefits per nurse annually)
        "mass_mapping": {"07": 1.0},
        "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Budget allocation and administrative hiring process; requires training and addressing staff shortages."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "raise_healthcare_wages",
        "family": "HEALTH",
        "label": "",
        "description": "",
        "fixed_impact_eur": -700000000,  # On the order of €0.5–1 billion annual cost for a notable salary boost
        "mass_mapping": {"07": 1.0},
        "feasibility": {"law": False, "adminLagMonths": 6, "notes": "Typically decided by government in healthcare budget or wage agreements; improves morale but adds to health deficits."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "freeze_civil_service_pay",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": 3600000000,  # A 1-year freeze in 2025 saves ~€3.6 billion (versus a modest 1.7% indexation)
        "mass_mapping": {"09": 0.3, "07": 0.2, "03": 0.1, "02": 0.1, "01": 0.3},
        "feasibility": {"law": False, "adminLagMonths": 0, "notes": "Can be decided by executive (no index raise decree); immediate savings but triggers labor discontent."},
        "conflicts_with": ["raise_civil_service_pay"],
        "sources": ["L'Express [35]"],
        "params_schema": {}
    },
    {
        "id": "freeze_civil_service_promotions",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2700000000,  # One-year pause could save on the order of €2.5–3 billion in wage costs
        "mass_mapping": {"09": 0.3, "07": 0.2, "03": 0.1, "02": 0.1, "01": 0.3},
        "feasibility": {"law": False, "adminLagMonths": 0, "notes": "Likely can be done by executive HR policy; unions oppose strongly as it suspends career progression rewards."},
        "conflicts_with": [],
        "sources": ["L'Express [37]"],
        "params_schema": {}
    },
    {
        "id": "raise_civil_service_pay",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": -20000000000,  # Approximately -€20 billion annual cost (since ~1% = €2 billion) for a 10% increase
        "mass_mapping": {"09": 0.3, "07": 0.2, "03": 0.1, "02": 0.1, "01": 0.3},
        "feasibility": {"law": False, "adminLagMonths": 1, "notes": "Implemented by government decree; politically popular among workers but very costly to the budget."},
        "conflicts_with": ["freeze_civil_service_pay"],
        "sources": ["Official est."],
        "params_schema": {}
    },
    {
        "id": "cut_public_workforce",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": 2500000000,  # An aggressive plan (e.g. 50k net job cuts over a few years) could save ~€2–3 billion annually when achieved
        "mass_mapping": {"09": 0.3, "07": 0.2, "03": 0.1, "02": 0.1, "01": 0.3},
        "feasibility": {"law": False, "adminLagMonths": 24, "notes": "Policy decision enforced via hiring freezes; savings accrue gradually as workforce declines."},
        "conflicts_with": [],
        "sources": ["L'Express [42]"],
        "params_schema": {}
    },
    {
        "id": "cut_agencies",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1000000000,  # Rough estimate: scrapping some agencies and ~1,500 jobs plus overhead might save on the order of €1 billion
        "mass_mapping": {"01": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires legislative or executive action to dissolve entities; savings modest, mainly symbolic of state belt-tightening."},
        "conflicts_with": [],
        "sources": ["Bayrou plan [43]"],
        "params_schema": {}
    },
    {
        "id": "reduce_sick_leave",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1300000000,  # If successful, could save on the order of €1.3 billion by cutting excessive absenteeism
        "mass_mapping": {"09": 0.3, "07": 0.2, "03": 0.1, "02": 0.1, "01": 0.3},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "May require legal change (to add waiting day, etc.); relies on enforcement and cultural change, savings are estimates."},
        "conflicts_with": [],
        "sources": ["L'Express [34]"],
        "params_schema": {}
    },
    {
        "id": "cut_officials_privileges",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": 100000000,  # Only tens of millions in savings (<<€0.1b), but high symbolic value
        "mass_mapping": {"01": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Some changes require law or even constitutional reform (e.g. cutting number of MPs); politically popular but fiscally minor."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "cut_defense_spending",
        "family": "DEFENSE",
        "label": "",
        "description": "",
        "fixed_impact_eur": 6000000000,  # Example: ~€60b defense budget -> cut ~€6b in one year by scaling back procurement
        "mass_mapping": {"02": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Would be set in budget law; faces strong opposition due to security concerns and contract penalties for cancellations."},
        "conflicts_with": [],
        "sources": ["L'Express [44]"],
        "params_schema": {}
    },
    {
        "id": "reduce_payroll_subsidies",
        "family": "SUBSIDIES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 5000000000,  # Partial rollback of these €70+ billion/yr allègements could yield on the order of +€5 billion in revenue/savings
        "mass_mapping": {"04": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Change via budget or social security law; businesses will lobby against it due to competitiveness concerns."},
        "conflicts_with": [],
        "sources": ["The Guardian [45]"],
        "params_schema": {}
    },
    {
        "id": "remove_fossil_subsidies",
        "family": "CLIMATE",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1500000000,  # Ending remaining fuel tax advantages could save on the order of €1–2 billion per year
        "mass_mapping": {"05": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Implemented via finance law; politically sensitive for affected sectors (transport, agriculture) but aligns with green transition."},
        "conflicts_with": [],
        "sources": ["The Guardian [46]"],
        "params_schema": {}
    },
    {
        "id": "cut_foreign_aid",
        "family": "SUBSIDIES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1500000000,  # Further cuts could save on the order of €1–2 billion (a 2024 cut added €1.5b savings)
        "mass_mapping": {"01": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Change in budget law; may draw criticism for undermining international commitments and soft power."},
        "conflicts_with": [],
        "sources": ["L'Express [47]"],
        "params_schema": {}
    },
    {
        "id": "cut_association_subsidies",
        "family": "SUBSIDIES",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1600000000,  # A proposal targeted ~€1.6 billion reduction in these subsidies
        "mass_mapping": {"08": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Enacted via budget allocations; politically contentious as it affects civil society and local programs."},
        "conflicts_with": [],
        "sources": ["L'Express [49]"],
        "params_schema": {}
    },
    {
        "id": "cut_public_investments",
        "family": "OTHER",
        "label": "",
        "description": "",
        "fixed_impact_eur": 800000000,  # Perhaps on the order of €0.5–1 billion could be saved in a given year by deferring some investments
        "mass_mapping": {"04": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Adjust via budget credit allocations; may hinder long-term goals (infrastructure, green transition) for short-term savings."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "hire_teachers",
        "family": "STAFFING",
        "label": "",
        "description": "",
        "fixed_impact_eur": -500000000,  # Roughly €50k per teacher with benefits -> 10k teachers ~€0.5 billion annually
        "mass_mapping": {"09": 1.0},
        "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Budgetary decision to fund new positions; faces teacher supply constraints but politically popular for education quality."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "cut_local_transfers",
        "family": "OTHER",
        "label": "",
        "description": "",
        "fixed_impact_eur": 1500000000,  # For instance, continuing a nominal freeze or slight cut could save on the order of €1–2 billion for the central state
        "mass_mapping": {"01": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Done via budget law; shifts financial pressure to local governments (potentially causing local service cuts or tax hikes)."},
        "conflicts_with": [],
        "sources": ["Est."],
        "params_schema": {}
    },
    {
        "id": "green_transport_tax",
        "family": "CLIMATE",
        "label": "",
        "description": "",
        "fixed_impact_eur": 600000000,  # Could yield on the order of a few hundred million (up to ~€0.5–1 billion) annually, depending on rate and scope
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 18, "notes": "Would ideally be coordinated at EU level (especially for kerosene); implementation could be slow due to negotiations."},
        "conflicts_with": [],
        "sources": ["Bayrou plan [11]"],
        "params_schema": {}
    },
    {
        "id": "efficient_procurement",
        "family": "PROCUREMENT",
        "label": "",
        "description": "",
        "fixed_impact_eur": 500000000,  # Enhanced procurement practices might save on the order of a few hundred million euros per year
        "mass_mapping": {"02": 0.5, "07": 0.5},
        "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Administrative and managerial reforms; requires investment in procurement systems and political will to enforce changes."},
        "conflicts_with": ["def_fleet_delay"],
        "sources": ["Cour des Comptes (2023)"],
        "params_schema": {}
    },
    {
        "id": "freeze_spending_one_year",
        "family": "OPERATIONS",
        "label": "",
        "description": "",
        "fixed_impact_eur": 7000000000,  # Approximately €7 billion saved in the year relative to trend growth, per government projection for 2026
        "mass_mapping": {"10": 0.5, "07": 0.2, "09": 0.1, "04": 0.1, "01": 0.1},
        "feasibility": {"law": True, "adminLagMonths": 0, "notes": "Enacted via annual budget law; not a permanent reform, but spreads the effort widely for a short-term gain."},
        "conflicts_with": [],
        "sources": ["info.gouv.fr [51]"],
        "params_schema": {}
    },
    {
        "id": "build_social_housing",
        "family": "OTHER",
        "label": "",
        "description": "",
        "fixed_impact_eur": -30000000000,  # Tens of billions per year if fully financed by the state (200k units * ~€150k each ~ €30b, though could be co-financed)
        "mass_mapping": {"06": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Would be part of multi-year investment plan and budgets; requires capacity in construction sector and political prioritization."},
        "conflicts_with": [],
        "sources": ["NFP platform (2024)"],
        "params_schema": {}
    },
    {
        "id": "free_school_services",
        "family": "OTHER",
        "label": "",
        "description": "",
        "fixed_impact_eur": -15000000000,  # On the order of tens of billions annually if fully generalized (would substantially increase education spending)
        "mass_mapping": {"09": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Implemented through education budget increases; very costly universal benefit approach championed by the left."},
        "conflicts_with": [],
        "sources": ["NFP platform (2024)"],
        "params_schema": {}
    },
    {
        "id": "pen_age_plus3m_per_year",
        "family": "PENSIONS",
        "label": "",
        "description": "",
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires a major pension reform law. Implementation would be gradual."},
        "conflicts_with": ["pen_age_minus3m_per_year"],
        "sources": [],
        "params_schema": {}
    }
]


def _with_mission_mapping(entry: dict) -> dict:
    out = dict(entry)
    try:
        from . import data_loader as dl  # lazy import to avoid cycles

        out["mission_mapping"] = dl.convert_mass_mapping_to_missions(entry.get("mass_mapping") or {})
    except Exception:
        out["mission_mapping"] = {}
    return out


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
    return [_with_mission_mapping(x) for x in items]


def levers_by_id() -> Dict[str, dict]:
    return {str(x.get("id")): _with_mission_mapping(x) for x in _LEVER_CATALOG}


def suggest_levers_for_mass(mass_id: str, limit: int = 5) -> List[dict]:
    """Return levers ranked by relevance to the given mission identifier."""

    mission_id = str(mass_id).upper()
    try:
        from . import data_loader as dl  # lazy import to avoid cycles
    except Exception:  # pragma: no cover - fallback for import issues
        dl = None
    scored: List[tuple[float, dict]] = []
    for it in _LEVER_CATALOG:
        raw_mapping = it.get("mass_mapping") or {}
        mission_mapping = dl.convert_mass_mapping_to_missions(raw_mapping) if dl else {}

        weight = float(mission_mapping.get(mission_id, 0.0))
        if weight <= 0 and mission_id.isdigit():
            # Legacy support: allow raw COFOG majors
            try:
                weight = float(raw_mapping.get(mission_id, 0.0))
            except Exception:
                weight = 0.0
        if weight <= 0:
            continue
        pop = float(it.get("popularity", 0.5))
        score = weight * (0.5 + 0.5 * pop)
        scored.append((score, _with_mission_mapping(it)))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:limit]]
