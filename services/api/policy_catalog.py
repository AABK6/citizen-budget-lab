from __future__ import annotations

from typing import Dict, List, Optional


# A catalog of well-defined, named reforms with fixed, pre-estimated budgetary impacts.
# In this model, levers are toggles, not parametric sliders.
# The impact is sourced from official reports or widely cited analyses.
_LEVER_CATALOG: List[dict] = [
    {
        "id": "annee_blanche_indexation",
        "family": "SOCIAL_SECURITY",
        "label": "Année Blanche (Freeze Benefit Indexation)",
        "description": "Suspend the annual inflation indexation of social benefits and pensions for one fiscal year.",
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
        "label": "Justice Ministry Efficiency Savings",
        "description": "Implement targeted efficiency measures across the Justice mission (digitalisation, shared services) as outlined in PLF 2026.",
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
        "label": "Education Operational Efficiency",
        "description": "Streamline support services and purchasing within the Education mission while safeguarding classroom spending.",
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
        "label": "Streamline Foreign Affairs Network",
        "description": "Rationalise diplomatic posts and shared service centres abroad to deliver recurrent savings.",
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
        "label": "Reintroduce Wealth Tax (ISF)",
        "description": "Restore a broad wealth tax on high-net-worth households (replacing the real-estate only IFI).",
        "fixed_impact_eur": 5000000000,  # Independent estimates ~€3–4 billion net gain; some political claims up to €10 billion
        "mass_mapping": {},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires new tax law; politically symbolic and contested."},
        "conflicts_with": [],
        "sources": ["Institut Montaigne [1]"],
        "params_schema": {}
    },
    {
        "id": "high_income_surtax",
        "family": "TAXES",
        "label": "Solidarity Surtax on High Incomes",
        "description": "Introduce new top income tax brackets or surcharges for the highest earners.",
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
        "label": "Tax on Excess Corporate Profits",
        "description": "Levy an exceptional or higher tax rate on large companies’ “super-profits” (windfall profits).",
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
        "label": "Abolish Flat Tax on Capital Income",
        "description": "Eliminate the 30% flat tax (PFU) on dividends/interest, reverting to standard progressive income tax rates.",
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
        "label": "Expand Financial Transaction Tax",
        "description": "Broaden the base or increase the rate of the financial transactions tax on stock trades and other financial instruments.",
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
        "label": "Make CSG Contributions More Progressive",
        "description": "Increase the Generalized Social Contribution (CSG) on capital income or higher pensions while reducing it for low incomes.",
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
        "label": "Reintroduce/Raise Carbon Tax on Fossil Fuels",
        "description": "Gradually increase taxes on carbon emissions (fuels, gas, etc.), restoring the carbon tax trajectory halted in 2018.",
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
        "label": "Reform Research Tax Credit (CIR)",
        "description": "Reduce or cap the generous R&D tax credit for companies (Crédit d’Impôt Recherche) to save public funds.",
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
        "label": "Reduce Household Services Tax Credit",
        "description": "Scale back the tax credit for employing home-based workers (cleaners, nannies, etc.) to cut its cost.",
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
        "label": "Abolish 10% Pension Income Tax Deduction",
        "description": "Eliminate the 10% tax allowance currently applied to pension income, making retirement income fully taxable like wages.",
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
        "label": "End Income Tax Exemption for Overtime Pay",
        "description": "Tax overtime earnings like regular income (reversing the current income tax exemption on overtime hours).",
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
        "label": "Combat Tax Evasion and Fraud",
        "description": "Strengthen audits, data-sharing, and penalties to recover more unpaid taxes (closing the tax gap).",
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
        "label": "Increase Digital Services Tax or Minimum Tax",
        "description": "Raise more revenue from multinational tech companies (e.g. higher national digital tax or enforcing a global minimum tax rate).",
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
        "label": "Reinstate Local Business Tax (CVAE)",
        "description": "Cancel the remaining abolition of the CVAE production tax on businesses, restoring it to boost local tax revenues.",
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
        "label": "Reduce Fuel Tax or Subsidize Fuel Prices",
        "description": "Lower the TICPE excise tax on gasoline/diesel or provide fuel price rebates to consumers to ease costs at the pump.",
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
        "label": "Income Tax Cut for Middle-Class Households",
        "description": "Provide relief for middle-income taxpayers (e.g. by raising the tax-free threshold or lowering the rate of the first bracket).",
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
        "label": "Extend Tax Relief on Overtime/Bonuses",
        "description": "Further reduce taxes or social charges on overtime pay or employee bonuses to increase net wages.",
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
        "label": "Cut VAT on Essential Goods",
        "description": "Apply a lower VAT rate (or zero rate) on essential items like food, baby supplies, or women’s hygiene products to boost purchasing power.",
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
        "label": "Lower VAT on Energy to 5.5%",
        "description": "Reduce VAT on electricity, gas, and motor fuels from 20% to 5.5% to alleviate household energy costs.",
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
        "label": "Suspend Inflation Indexing of Tax Brackets",
        "description": "Temporarily freeze income tax bracket thresholds instead of adjusting them for inflation (letting “bracket creep” raise more revenue).",
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
        "label": "Raise Legal Retirement Age to 65",
        "description": "Increase the state pension eligibility age beyond 64 (the current reform) to 65 years, further reducing pension system costs.",
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
        "label": "Revert Retirement Age to 62",
        "description": "Cancel the 2023 reform and restore the legal pension age to 62 (with some exceptions for long careers).",
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
        "label": "Lower Retirement Age to 60",
        "description": "Further reduce the legal pension age to 60 years (full pension at 60 for those meeting contribution requirements).",
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
        "label": "Lengthen Pension Contribution Period",
        "description": "Require additional years of work (more trimesters) to qualify for a full pension, potentially indexing the requirement to life expectancy.",
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
        "label": "Close Special Early-Retirement Regimes",
        "description": "Phase out remaining special pension schemes (e.g. for certain public sector jobs) and restrict early retirement exceptions for specific professions.",
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
        "label": "Slow Pension Benefit Indexation",
        "description": "Temporarily limit or delay inflation adjustments for pensions (e.g. skipping or postponing a cost-of-living increase).",
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
        "label": "Align Public-Sector Pension Calculation with Private",
        "description": "Calculate civil servant pensions on a broader salary period (like 25-year average) instead of the last 6 months, to reduce costs and align with private-sector rules.",
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
        "label": "Increase Pension Contribution Rates",
        "description": "Raise the payroll contribution rates that fund pensions (for employers and/or employees) to improve pension fund revenues.",
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
        "label": "Raise Minimum Pension Benefits",
        "description": "Increase the minimum pension payouts (e.g. ensuring a higher monthly floor for full-career retirees or boosting survivor benefits), improving retirement income for the lowest-paid retirees.",
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
        "label": "Tighten Unemployment Benefit Rules",
        "description": "Restrict unemployment insurance by shortening benefit duration or making rules stricter (especially when the job market is good), to encourage faster return-to-work.",
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
        "label": "Reverse Unemployment Benefit Cuts",
        "description": "Make unemployment insurance more generous again (e.g. restoring longer benefit duration or higher payouts), undoing recent savings measures.",
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
        "label": "Condition/Reduce RSA Welfare Benefits",
        "description": "Require recipients of the RSA minimum income benefit to engage in work or training and tighten eligibility, potentially reducing the beneficiary rolls and spending.",
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
        "label": "Restrict Benefits for Non-Citizens",
        "description": "Apply a “national preference” by limiting access to certain non-contributory social benefits (like family allowances, RSA, housing aid) only to citizens or long-term residents.",
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
        "label": "Freeze Indexation of Welfare Benefits",
        "description": "Temporarily suspend inflation adjustments for social benefits (e.g. RSA, disability allowances) for a year to save on public spending.",
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
        "label": "Cut Housing Assistance (APL)",
        "description": "Reduce expenditures on housing subsidies (APL), for example by tightening eligibility (e.g. for students or higher-income recipients) or slowing indexation of these aids.",
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
        "label": "Reduce Family Allowances for High Earners",
        "description": "Trim family benefit payouts for wealthier households (beyond the means-testing already in place) or consolidate family subsidies to save costs.",
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
        "label": "Crack Down on Social Benefit Fraud",
        "description": "Strengthen controls to detect and prevent fraud in welfare programs (family benefits, unemployment, healthcare cards, etc.), recovering undue payments.",
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
        "label": "Eliminate State Medical Aid for Undocumented (AME)",
        "description": "Abolish the state-funded healthcare program for undocumented immigrants (AME) to reduce public health expenditure on non-citizens.",
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
        "label": "Cap Annual Health Expenditure Growth",
        "description": "Impose a tighter ceiling (ONDAM) on yearly healthcare spending growth (e.g. a near-freeze in the health budget) to force savings in the health system.",
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
        "label": "Reduce Low-Value Health Expenditures",
        "description": "Cut unnecessary or inefficient healthcare spending (e.g. stop fully reimbursing certain drugs, promote generics, delist low-value treatments) to improve system efficiency.",
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
        "label": "Introduce/Increase Patient Co-pays",
        "description": "Implement small patient co-payment fees (e.g. for GP visits or prescriptions) or raise existing co-pays to discourage overuse and shift a minor share of costs to patients.",
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
        "label": "Hire Additional Healthcare Staff",
        "description": "Recruit more medical personnel (e.g. a plan to hire 20,000 nurses and other healthcare workers) to improve service quality, despite the higher wage bill.",
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
        "label": "Raise Hospital Healthcare Worker Salaries",
        "description": "Increase pay scales for hospital nurses and other underpaid medical staff (e.g. adding an extra wage step) to improve retention and recognition.",
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
        "label": "Freeze Public Sector Wage Index",
        "description": "Suspend any increase of the civil service pay index (point d’indice) for a year, instead of indexing it for inflation, to save on the government payroll.",
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
        "label": "Freeze Automatic Pay Promotions (GVT)",
        "description": "Temporarily halt automatic seniority/tenure pay increases (glissement vieillesse-technicité) for civil servants for one year.",
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
        "label": "Increase Civil Servant Pay Scale by 10%",
        "description": "Raise the civil service base pay (point d’indice) by a significant amount (e.g. +10%), boosting public sector salaries across the board.",
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
        "label": "Reduce Public Sector Workforce via Attrition",
        "description": "Shrink the number of government employees by not replacing a portion of retirees (e.g. only hire 1 for every 2 departures), gradually lowering payroll costs.",
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
        "label": "Abolish/Merge Public Agencies",
        "description": "Eliminate or consolidate certain government agencies, quangos, or advisory bodies deemed redundant or “improductive,” along with their associated jobs and overhead.",
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
        "label": "Reduce Public Sector Absenteeism",
        "description": "Introduce measures to curb sick-leave abuse among government workers (e.g. reintroduce a waiting day before paid sick leave, stricter monitoring) to reduce lost work days and temp costs.",
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
        "label": "Cut Perks of Elected Officials",
        "description": "Eliminate or reduce perceived privileges of politicians (e.g. special pension schemes for parliamentarians, free benefits for high officials, excessive expense budgets) to save costs and set an example.",
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
        "label": "Cut Defense Budget by 10%",
        "description": "Reduce military spending growth by cancelling or delaying major equipment programs (e.g. a ~10% cut in defense procurement) for immediate budgetary savings.",
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
        "label": "Roll Back Payroll Tax Cuts for Firms",
        "description": "Scale down broad business subsidies like the generalized reductions in employer social security contributions (originating from the CICE), especially for large companies, to claw back some fiscal space.",
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
        "label": "End Fossil Fuel Tax Breaks",
        "description": "Phase out subsidies and tax exemptions that favor fossil fuels (e.g. reduced diesel taxes for trucking & farming), aligning fiscal policy with climate goals and raising revenue.",
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
        "label": "Cut International Development Aid",
        "description": "Reduce France’s budget for foreign aid and development assistance (which has been increasing) to save money domestically.",
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
        "label": "Reduce Subsidies to Associations",
        "description": "Trim state subsidies to various associations and non-profits (including possibly certain cultural, environmental, or community organizations) as a budget savings measure.",
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
        "label": "Cut or Delay Public Investment Projects",
        "description": "Cancel, scale back, or postpone planned public investment programs (e.g. infrastructure projects, strategic plans like France 2030) to reduce near-term expenditure.",
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
        "label": "Hire Additional Teachers",
        "description": "Recruit more teaching staff to reduce class sizes and improve education (e.g. 10,000 new teachers), increasing the education payroll budget.",
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
        "label": "Reduce Transfers to Local Governments",
        "description": "Cut or freeze the state’s grant to local authorities (e.g. the Dotation Globale de Fonctionnement) to push municipalities and regions to also curb spending.",
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
        "label": "Green Tax on Transport (Airline or Delivery)",
        "description": "Levy new environmental taxes such as a tax on airline tickets/kerosene or on e-commerce deliveries (“small parcels”) to raise revenue and discourage high-emission activities.",
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
        "label": "Improve Public Procurement Efficiency",
        "description": "Streamline government procurement (bulk purchasing, better tendering, anti-fraud) in sectors like healthcare and defense to lower costs for goods and services.",
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
        "label": "One-Year Nominal Spending Freeze (“Année Blanche”)",
        "description": "Hold overall government spending flat for one year (no nominal increases in budgets or benefits across the board) to achieve a one-time deficit reduction.",
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
        "label": "Massive Public Housing Construction",
        "description": "Launch a major state-led program to build new public housing units (e.g. 200,000 units per year) as a social investment, despite the high upfront costs.",
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
        "label": "Make School Meals & Supplies Free",
        "description": "Extend public education support by making school-related expenses free for families (e.g. free canteen meals, school supplies, extracurricular activities in public schools).",
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
        "label": "Retirement age +3m per year",
        "description": "Increase the legal retirement age by 3 months each year until it reaches 65.",
        "mass_mapping": {"10": 1.0},
        "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Requires a major pension reform law. Implementation would be gradual."},
        "conflicts_with": ["pen_age_minus3m_per_year"],
        "sources": [],
        "params_schema": {}
    }
,
    {
      "id": "is_rate_33_5",
      "family": "TAXES",
      "label": "Raise Corporate Tax Rate to 33.5%",
      "description": "Increase IS from 25% to 33.5%.",
      "fixed_impact_eur": 4400000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Budget law change; competitiveness concerns."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "transfer_pricing_enforcement",
      "family": "TAXES",
      "label": "Tighten Transfer Pricing & BEPS Enforcement",
      "description": "Stronger audits, documentation, adjustments on intra-group pricing.",
      "fixed_impact_eur": 4600000000,
      "mass_mapping": {},
      "feasibility": {"law": False, "adminLagMonths": 6, "notes": "Admin + legal updates; depends on enforcement capacity."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "vat_normal_plus1",
      "family": "TAXES",
      "label": "Raise VAT Normal Rate by 1pp",
      "description": "Standard rate +1 percentage point.",
      "fixed_impact_eur": 6000000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "EU-conform; regressive distributional impact."},
      "conflicts_with": ["vat_all_rates_plus1", "vat_intermediate_12_5"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "vat_all_rates_plus1",
      "family": "TAXES",
      "label": "Raise All VAT Rates by 1pp",
      "description": "Uniform +1pp on normal/intermediate/reduced rates.",
      "fixed_impact_eur": 8200000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "EU-conform; high political salience."},
      "conflicts_with": ["vat_normal_plus1", "vat_intermediate_12_5"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "vat_intermediate_12_5",
      "family": "TAXES",
      "label": "Raise Intermediate VAT to 12.5%",
      "description": "From 10% to 12.5%.",
      "fixed_impact_eur": 2905982906,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "EU-conform."},
      "conflicts_with": ["vat_all_rates_plus1", "vat_normal_plus1"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "vat_franchise_threshold_halved",
      "family": "TAXES",
      "label": "Halve VAT Small-Business Franchise Threshold",
      "description": "Lower turnover thresholds for VAT franchise.",
      "fixed_impact_eur": 2200000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Impacts micro-enterprises; admin workload increases."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "cap_quotient_conjugal",
      "family": "TAXES",
      "label": "Cap Conjugal Split Benefit",
      "description": "Plafonner le bénéfice du quotient conjugal pour hauts revenus.",
      "fixed_impact_eur": 1100000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Finance law; distributional debate likely."},
      "conflicts_with": ["abolish_quotient_conjugal"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "abolish_quotient_conjugal",
      "family": "TAXES",
      "label": "Abolish Conjugal Split",
      "description": "Supprimer le quotient conjugal.",
      "fixed_impact_eur": 10600000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Major PIT redesign."},
      "conflicts_with": ["cap_quotient_conjugal"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "abolish_qf_demi_parts_noneffective",
      "family": "TAXES",
      "label": "Remove Non-Effective Demi-Parts",
      "description": "Supprimer les demi-parts qui ne reflètent pas des charges réelles.",
      "fixed_impact_eur": 2890000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Targeted fairness reform."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "wealth_minimum_tax_2pct_100m",
      "family": "TAXES",
      "label": "2% Minimum Tax on Wealth > €100m",
      "description": "Impôt minimum sur patrimoines financiers > €100m.",
      "fixed_impact_eur": 4800000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "New base; valuation/admin issues."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "restore_taxe_habitation_top20",
      "family": "TAXES",
      "label": "Restore Taxe d’Habitation for Top 20%",
      "description": "Réinstaurer TH pour les 20% les plus aisés.",
      "fixed_impact_eur": 9300000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Local tax redesign w/ compensation rules."},
      "conflicts_with": ["restore_taxe_habitation_all"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "restore_taxe_habitation_all",
      "family": "TAXES",
      "label": "Restore Taxe d’Habitation for All",
      "description": "Réinstaurer TH résidences principales (tous ménages).",
      "fixed_impact_eur": 21800000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 9, "notes": "Large reform; distributional offset needed."},
      "conflicts_with": ["restore_taxe_habitation_top20"],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "airline_ticket_tax_increase",
      "family": "CLIMATE",
      "label": "Increase Airline Ticket Tax",
      "description": "Augmenter le barème sur billets d’avion.",
      "fixed_impact_eur": 3700000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "EU/state aid coordination may arise."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "ecotax_heavy_trucks",
      "family": "CLIMATE",
      "label": "Eco-Tax per km on Heavy Trucks",
      "description": "Peage kilométrique (hors autoroutes) sur poids lourds.",
      "fixed_impact_eur": 1000000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Infrastructure & enforcement cost; EU coordination."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Recettes"],
      "params_schema": {}
    },
    {
      "id": "abolish_tonnage_tax",
      "family": "TAX_EXPENDITURES",
      "label": "Abolish Tonnage Tax for Shipping",
      "description": "Supprimer la taxe au tonnage (IS normal).",
      "fixed_impact_eur": 1375000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Sector lobbying likely."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses fiscales"],
      "params_schema": {}
    },
    {
      "id": "cir_cut_large_firms_half",
      "family": "TAX_EXPENDITURES",
      "label": "CIR: Halve Benefit for Large Firms",
      "description": "Mieux cibler le CIR (–50% pour GE).",
      "fixed_impact_eur": 1500000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Refines existing CIR; consider R&D impact."},
      "conflicts_with": ["cap_research_credit"],
      "sources": ["Workbook 20251017, Dépenses fiscales"],
      "params_schema": {}
    },
    {
      "id": "cir_remove_5pct_above_100m",
      "family": "TAX_EXPENDITURES",
      "label": "CIR: Remove 5% Rate Above €100m",
      "description": "Supprimer le taux à 5% > €100m.",
      "fixed_impact_eur": 400000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Complements prior CIR trims."},
      "conflicts_with": ["cap_research_credit"],
      "sources": ["Workbook 20251017, Dépenses fiscales"],
      "params_schema": {}
    },
    {
      "id": "remove_ticpe_air_exemption",
      "family": "TAX_EXPENDITURES",
      "label": "End TICPE Exemption for Aviation",
      "description": "Supprimer exonération de TICPE transport aérien.",
      "fixed_impact_eur": 3500000000,
      "mass_mapping": {},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "International agreements may bind timing."},
      "conflicts_with": ["remove_fossil_subsidies"],
      "sources": ["Workbook 20251017, Dépenses fiscales"],
      "params_schema": {}
    },
    {
      "id": "apl_flat_minus5",
      "family": "SOCIAL_SECURITY",
      "label": "APL: Flat €5 Monthly Cut",
      "description": "Baisse forfaitaire des APL de 5€.",
      "fixed_impact_eur": 60000000,
      "mass_mapping": {"10": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Simple but regressive."},
      "conflicts_with": ["cut_housing_aid"],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "apl_means_test_18920",
      "family": "SOCIAL_SECURITY",
      "label": "APL: Tighter Means-Test (18 920€ threshold)",
      "description": "Conditionner APL à seuil net global abattu de 18 920€.",
      "fixed_impact_eur": 550000000,
      "mass_mapping": {"10": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Admin screening required."},
      "conflicts_with": ["cut_housing_aid", "apl_means_test_39020"],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "apl_means_test_39020",
      "family": "SOCIAL_SECURITY",
      "label": "APL: Tighter Means-Test (39 020€ threshold)",
      "description": "Conditionner APL à seuil net global abattu de 39 020€.",
      "fixed_impact_eur": 820000000,
      "mass_mapping": {"10": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Admin screening required."},
      "conflicts_with": ["cut_housing_aid", "apl_means_test_18920"],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "private_ed_subsidy_75_to_50",
      "family": "OTHER",
      "label": "Reduce Private-School Subsidy 75%→50%",
      "description": "Baisser la subvention aux établissements privés.",
      "fixed_impact_eur": 3500000000,
      "mass_mapping": {"09": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Political/legal scrutiny."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "higher_ed_tuition_uniform_increase",
      "family": "OTHER",
      "label": "Raise Public HE Tuition (Uniform Step)",
      "description": "Licence 730€, Master 887€, Doctorat 1 380€.",
      "fixed_impact_eur": 463000000,
      "mass_mapping": {"09": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "Equity offsets advisable (grants)."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "education_demography_adjust",
      "family": "OTHER",
      "label": "Adjust Education Spending to Enrolment Decline",
      "description": "Aligner la dépense sur la baisse démographique.",
      "fixed_impact_eur": 400000000,
      "mass_mapping": {"09": 1.0},
      "feasibility": {"law": False, "adminLagMonths": 12, "notes": "Operational implementation across rectorats."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "freeze_local_transfers_value",
      "family": "OTHER",
      "label": "Freeze State Transfers to Local Govts (Nominal)",
      "description": "Geler en valeur les transferts de l’État aux APUL.",
      "fixed_impact_eur": 3408000000,
      "mass_mapping": {"01": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Shifts pressure to local taxation/services."},
      "conflicts_with": ["freeze_local_transfers_volume", "freeze_apul_budget_value", "freeze_apul_budget_volume", "cut_local_transfers"],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "freeze_apul_budget_value",
      "family": "OTHER",
      "label": "Freeze APUL Budgets ex-Debt (Nominal)",
      "description": "Geler en valeur le budget APUL (hors charges de dette).",
      "fixed_impact_eur": 6720000000,
      "mass_mapping": {"01": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Broader than transfer freeze; macro impact larger."},
      "conflicts_with": ["freeze_local_transfers_value", "freeze_local_transfers_volume", "freeze_apul_budget_volume", "cut_local_transfers"],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "apply_35h_local",
      "family": "STAFFING",
      "label": "Apply 35h in Local Govts (–2.7% FTE)",
      "description": "Harmoniser la durée légale du travail (APUL).",
      "fixed_impact_eur": 1300000000,
      "mass_mapping": {"01": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 12, "notes": "HR transition; social dialogue required."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "pensions_freeze_base_plus_compl_2026",
      "family": "PENSIONS",
      "label": "Freeze Base & Complementary Pensions (2026)",
      "description": "Gel ponctuel des retraites de base et complémentaires.",
      "fixed_impact_eur": 3900000000,
      "mass_mapping": {"10": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 3, "notes": "Distinct from full annual indexation freeze."},
      "conflicts_with": ["freeze_pension_indexation"],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "pensions_deindex_above_2000",
      "family": "PENSIONS",
      "label": "De-index Pensions Above €2,000",
      "description": "Désindexation ciblée des pensions >2 000€.",
      "fixed_impact_eur": 2500000000,
      "mass_mapping": {"10": 1.0},
      "feasibility": {"law": True, "adminLagMonths": 6, "notes": "Targeted distributional choice."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
      "params_schema": {}
    },
    {
      "id": "maprimerenov_focus_deep",
      "family": "CLIMATE",
      "label": "MaPrimeRénov’: Focus on Deep Retrofits",
      "description": "Ciblage rénovations d’ampleur / sorties de passoires.",
      "fixed_impact_eur": 904000000,
      "mass_mapping": {"06": 1.0},
      "feasibility": {"law": False, "adminLagMonths": 6, "notes": "Paramétrage de programme & contrôles."},
      "conflicts_with": [],
      "sources": ["Workbook 20251017, Dépenses budgétaires"],
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
