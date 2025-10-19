from __future__ import annotations

from typing import Dict, List, Optional


# A catalog of well-defined, named reforms with fixed, pre-estimated budgetary impacts.
# In this model, levers are toggles, not parametric sliders.
# The impact is sourced from official reports or widely cited analyses.
_LEVER_CATALOG: List[dict] = [
    {
        "id": "annee_blanche_indexation",
        "family": "SOCIAL_SECURITY",
        "label": "Année Blanche (Geler l'indexation des prestations)",
        "description": "Suspendre la revalorisation annuelle (indexation sur l'inflation) des prestations sociales et des retraites pendant un an.",
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
        "label": "Économies d'efficacité (Mission Justice)",
        "description": "Mettre en œuvre des mesures d'efficacité (numérisation, services partagés) au sein du ministère de la Justice.",
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
        "label": "Efficacité opérationnelle (Mission Éducation)",
        "description": "Rationaliser les services support et les achats au sein de l'Éducation nationale, en préservant les dépenses pour les classes.",
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
        "label": "Rationalisation (Mission Affaires étrangères)",
        "description": "Rationaliser les postes diplomatiques et les services partagés à l'étranger pour réaliser des économies.",
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
        "label": "Rétablir l'Impôt de Solidarité sur la Fortune (ISF)",
        "description": "Restaurer un impôt général sur le patrimoine des ménages les plus aisés (en remplacement de l'IFI, qui ne concerne que l'immobilier).",
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
        "label": "Surtaxe sur les très hauts revenus",
        "description": "Introduire de nouvelles tranches supérieures ou une surtaxe sur l'impôt sur le revenu pour les plus hauts revenus.",
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
        "label": "Taxe sur les 'super-profits' des entreprises",
        "description": "Prélever une taxe exceptionnelle sur les 'super-profits' (bénéfices exceptionnels) des grandes entreprises.",
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
        "label": "Supprimer la 'Flat Tax' (PFU) sur les revenus du capital",
        "description": "Supprimer le Prélèvement Forfaitaire Unique (PFU) de 30% sur les dividendes et intérêts, et revenir au barème progressif de l'impôt.",
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
        "label": "Étendre la Taxe sur les Transactions Financières (TTF)",
        "description": "Élargir l'assiette ou augmenter le taux de la taxe sur les transactions financières (achats d'actions, etc.).",
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
        "label": "Rendre la CSG plus progressive",
        "description": "Augmenter la CSG sur les revenus du capital ou les hautes retraites, tout en la réduisant pour les bas revenus.",
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
        "label": "Rétablir / Augmenter la taxe carbone",
        "description": "Augmenter progressivement les taxes sur les émissions de carbone (carburants, gaz...) en restaurant la trajectoire de la taxe carbone.",
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
        "label": "Réformer le Crédit d'Impôt Recherche (CIR)",
        "description": "Réduire ou plafonner le Crédit d'Impôt Recherche (CIR) pour les entreprises afin de réaliser des économies.",
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
        "label": "Réduire le crédit d'impôt 'Services à la personne'",
        "description": "Diminuer le crédit d'impôt pour l'emploi à domicile (ménage, garde d'enfants...) pour réduire son coût.",
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
        "label": "Supprimer l'abattement fiscal de 10% sur les pensions",
        "description": "Supprimer l'abattement forfaitaire de 10% appliqué aux pensions de retraite, alignant leur fiscalité sur celle des salaires.",
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
        "label": "Supprimer l'exonération fiscale des heures supplémentaires",
        "description": "Rendre les heures supplémentaires imposables à l'impôt sur le revenu, comme le salaire normal.",
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
        "label": "Lutter contre la fraude et l'évasion fiscales",
        "description": "Renforcer les contrôles, le partage de données et les sanctions pour récupérer davantage d'impôts impayés.",
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
        "label": "Augmenter la taxe sur le numérique (GAFAM)",
        "description": "Augmenter les revenus issus des entreprises multinationales du numérique (via la taxe nationale ou l'impôt minimum mondial).",
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
        "label": "Rétablir la CVAE (Impôt de production)",
        "description": "Annuler la suppression totale de la CVAE (Cotisation sur la Valeur Ajoutée des Entreprises) pour restaurer cet impôt de production.",
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
        "label": "Réduire les taxes sur le carburant (TICPE)",
        "description": "Baisser la taxe (TICPE) sur l'essence et le diesel, ou subventionner le prix à la pompe.",
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
        "label": "Baisser l'impôt sur le revenu des classes moyennes",
        "description": "Alléger l'impôt pour les contribuables de la classe moyenne (ex: en ajustant les tranches du barème).",
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
        "label": "Étendre la défiscalisation des heures sup. / primes",
        "description": "Réduire davantage les impôts ou charges sociales sur les heures supplémentaires ou les primes salariales.",
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
        "label": "Baisser la TVA sur les produits de première nécessité",
        "description": "Appliquer un taux de TVA réduit (ou nul) sur les produits essentiels (alimentation, produits d'hygiène...).",
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
        "label": "Baisser la TVA sur l'énergie à 5,5%",
        "description": "Réduire la TVA sur l'électricité, le gaz et les carburants de 20% à 5,5%.",
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
        "label": "Geler le barème de l'impôt sur le revenu",
        "description": "Ne pas revaloriser les tranches du barème de l'impôt sur l'inflation (ce qui augmente mécaniquement l'impôt).",
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
        "label": "Augmenter l'âge légal de la retraite à 65 ans",
        "description": "Augmenter l'âge légal de départ à la retraite à 65 ans (au-delà de la réforme actuelle le fixant à 64 ans).",
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
        "label": "Revenir à l'âge légal de la retraite à 62 ans",
        "description": "Annuler la réforme de 2023 et rétablir l'âge légal de départ à la retraite à 62 ans.",
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
        "label": "Abaisser l'âge légal de la retraite à 60 ans",
        "description": "Réduire l'âge légal de départ à la retraite à 60 ans (pour ceux ayant les annuités requises).",
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
        "label": "Allonger la durée de cotisation pour la retraite",
        "description": "Exiger davantage de trimestres de travail pour obtenir une retraite à taux plein.",
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
        "label": "Supprimer les régimes spéciaux de retraite restants",
        "description": "Mettre fin aux régimes spéciaux de retraite encore existants et restreindre les départs anticipés.",
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
        "label": "Geler ou sous-indexer les pensions de retraite",
        "description": "Limiter ou retarder temporairement la revalorisation des pensions par rapport à l'inflation.",
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
        "label": "Aligner le calcul des retraites public/privé",
        "description": "Calculer les pensions des fonctionnaires sur une période plus longue (ex: 25 ans) au lieu des 6 derniers mois, pour aligner sur le privé.",
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
        "label": "Augmenter les cotisations retraite",
        "description": "Augmenter les taux de cotisation (salariale et/ou patronale) qui financent les retraites.",
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
        "label": "Augmenter les pensions minimales",
        "description": "Augmenter le montant de la pension minimum (ex: pour les carrières complètes) pour les retraités modestes.",
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
        "label": "Durcir les règles de l'assurance chômage",
        "description": "Restreindre l'assurance chômage en raccourcissant la durée d'indemnisation ou en durcissant les conditions d'accès.",
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
        "label": "Annuler les coupes dans l'assurance chômage",
        "description": "Rendre l'assurance chômage plus généreuse (ex: rétablir des durées d'indemnisation plus longues).",
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
        "label": "Conditionner le versement du RSA",
        "description": "Exiger des bénéficiaires du RSA (Revenu de Solidarité Active) des activités (travail, formation) en contrepartie de l'allocation.",
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
        "label": "Restreindre les aides sociales aux non-citoyens",
        "description": "Appliquer une 'préférence nationale' en limitant l'accès de certains non-citoyens aux aides sociales non-contributives (RSA, APL...).",
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
        "label": "Geler l'indexation des minima sociaux",
        "description": "Suspendre temporairement la revalorisation sur l'inflation des minima sociaux (RSA, AAH...) pendant un an.",
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
        "label": "Réduire les Aides au Logement (APL)",
        "description": "Réduire les dépenses d'APL (Aide Personnalisée au Logement), par exemple en durcissant les conditions d'éligibilité.",
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
        "label": "Réduire les allocations familiales (hauts revenus)",
        "description": "Diminuer les allocations familiales versées aux ménages les plus aisés.",
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
        "label": "Lutter contre la fraude aux prestations sociales",
        "description": "Renforcer les contrôles pour détecter et prévenir la fraude aux prestations sociales (famille, chômage, santé...).",
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
        "label": "Supprimer l'Aide Médicale d'État (AME)",
        "description": "Supprimer l'AME (Aide Médicale d'État), le programme de santé pour les immigrés sans papiers.",
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
        "label": "Plafonner la croissance des dépenses de santé (ONDAM)",
        "description": "Imposer un plafond plus strict (ONDAM) à la croissance annuelle des dépenses de santé.",
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
        "label": "Réduire les dépenses de santé 'inutiles'",
        "description": "Réduire les dépenses de santé jugées inefficaces (ex: moins rembourser certains médicaments, promouvoir les génériques).",
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
        "label": "Augmenter le reste à charge (franchises médicales)",
        "description": "Mettre en place ou augmenter les franchises médicales (participation forfaitaire) sur les visites ou les médicaments.",
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
        "label": "Embaucher du personnel soignant supplémentaire",
        "description": "Recruter davantage de personnel médical (ex: un plan pour embaucher 20 000 infirmiers et aides-soignants).",
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
        "label": "Augmenter les salaires des soignants à l'hôpital",
        "description": "Augmenter les grilles de salaires des infirmiers et autres soignants à l'hôpital public.",
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
        "label": "Geler le point d'indice des fonctionnaires",
        "description": "Suspendre l'augmentation générale du point d'indice des fonctionnaires pendant un an.",
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
        "label": "Geler les promotions automatiques (Fonction Publique)",
        "description": "Suspendre temporairement les augmentations automatiques liées à l'ancienneté (GVT) pour les fonctionnaires.",
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
        "label": "Augmenter le point d'indice de 10% (Fonction Publique)",
        "description": "Augmenter la valeur du point d'indice (salaire de base des fonctionnaires) de 10%.",
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
        "label": "Réduire le nombre de fonctionnaires (non-remplacement)",
        "description": "Diminuer le nombre d'agents publics en ne remplaçant qu'une partie des départs à la retraite.",
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
        "label": "Supprimer ou fusionner des agences publiques",
        "description": "Éliminer ou regrouper certaines agences ou comités publics jugés redondants.",
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
        "label": "Réduire l'absentéisme dans la fonction publique",
        "description": "Mettre en place des mesures pour réduire l'absentéisme (ex: réintroduire un jour de carence, contrôles renforcés).",
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
        "label": "Réduire les 'privilèges' des élus",
        "description": "Supprimer ou réduire les avantages des politiciens (ex: régimes de retraite spéciaux, budgets de frais).",
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
        "label": "Réduire le budget de la Défense de 10%",
        "description": "Réduire la croissance des dépenses militaires en annulant ou reportant des programmes d'équipement majeurs.",
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
        "label": "Réduire les allègements de cotisations patronales",
        "description": "Diminuer les réductions générales de cotisations sociales patronales (ex-CICE), en particulier pour les grandes entreprises.",
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
        "label": "Supprimer les niches fiscales 'brunes' (fossiles)",
        "description": "Supprimer les subventions et exonérations fiscales qui favorisent les énergies fossiles (ex: gazole non routier).",
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
        "label": "Réduire l'aide publique au développement",
        "description": "Réduire le budget de la France consacré à l'aide internationale et au développement.",
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
        "label": "Réduire les subventions aux associations",
        "description": "Diminuer les subventions de l'État accordées à diverses associations (culturelles, communautaires, etc.).",
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
        "label": "Réduire ou reporter les investissements publics",
        "description": "Annuler, réduire ou reporter des programmes d'investissement public prévus (ex: infrastructures, plan France 2030).",
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
        "label": "Embaucher des enseignants supplémentaires",
        "description": "Recruter davantage d'enseignants pour réduire la taille des classes (ex: 10 000 postes).",
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
        "label": "Réduire les dotations aux collectivités locales",
        "description": "Réduire ou geler les dotations de l'État aux mairies, départements et régions (ex: DGF).",
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
        "label": "Taxe verte sur les transports (Avion, Livraisons)",
        "description": "Prélever de nouvelles taxes écologiques (ex: sur les billets d'avion, le kérosène, ou les livraisons e-commerce).",
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
        "label": "Améliorer l'efficacité des achats publics",
        "description": "Rationaliser les achats de l'État (achats groupés, meilleurs appels d'offres) pour réduire les coûts.",
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
        "label": "Gel des dépenses de l'État en valeur (1 an)",
        "description": "Geler les dépenses publiques en valeur (zéro augmentation nominale) pendant un an.",
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
        "label": "Construction massive de logements sociaux",
        "description": "Lancer un grand programme public de construction de logements sociaux (ex: 200 000 par an).",
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
        "label": "Gratuité de la cantine et des fournitures scolaires",
        "description": "Rendre gratuites les dépenses liées à l'école (cantine, fournitures, activités périscolaires) pour les familles.",
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
        "label": "Retraite : âge légal +3 mois par an",
        "description": "Augmenter l'âge légal de la retraite de 3 mois chaque année jusqu'à atteindre 65 ans.",
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
      "label": "Augmenter l'Impôt sur les Sociétés (IS) à 33,5%",
      "description": "Augmenter le taux de l'Impôt sur les Sociétés (IS) de 25% à 33,5%.",
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
      "label": "Renforcer le contrôle des prix de transfert (multinationales)",
      "description": "Contrôles accrus sur les prix de transfert entre filiales de multinationales (optimisation fiscale).",
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
      "label": "Augmenter le taux normal de TVA de 1 point",
      "description": "Augmenter le taux normal de TVA (de 20% à 21%).",
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
      "label": "Augmenter tous les taux de TVA de 1 point",
      "description": "Augmenter tous les taux de TVA (normal, intermédiaire, réduit) de 1 point.",
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
      "label": "Augmenter le taux intermédiaire de TVA à 12,5%",
      "description": "Augmenter le taux intermédiaire de TVA de 10% à 12,5% (concerne restauration, transports...)",
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
      "label": "Réduire le seuil de la franchise de TVA (petites entreprises)",
      "description": "Diviser par deux le seuil de chiffre d'affaires permettant aux petites entreprises de ne pas facturer la TVA.",
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
      "label": "Plafonner le quotient conjugal",
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
      "label": "Supprimer le quotient conjugal",
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
      "label": "Supprimer les demi-parts fiscales 'non effectives'",
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
      "label": "Impôt minimum de 2% (Patrimoine > 100 M€)",
      "description": "Créer un impôt minimum de 2% sur le patrimoine financier des personnes détenant plus de 100 M€.",
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
      "label": "Rétablir la Taxe d'Habitation (20% plus aisés)",
      "description": "Réinstaurer la Taxe d'Habitation pour les 20% des ménages les plus aisés.",
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
      "label": "Rétablir la Taxe d'Habitation (Tous)",
      "description": "Réinstaurer la Taxe d'Habitation sur les résidences principales pour tous les ménages.",
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
      "label": "Augmenter la taxe sur les billets d'avion",
      "description": "Augmenter le barème de la taxe de solidarité ('taxe Chirac') sur les billets d'avion.",
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
      "label": "Écotaxe kilométrique (Poids lourds)",
      "description": "Instaurer un péage kilométrique (hors autoroutes) pour les poids lourds (transport de marchandises).",
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
      "label": "Supprimer la taxe au tonnage (transport maritime)",
      "description": "Supprimer le régime favorable de la taxe au tonnage pour les transporteurs maritimes (retour à l'IS normal).",
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
      "label": "CIR : Réduire de 50% (Grandes Entreprises)",
      "description": "Réduire de moitié le Crédit d'Impôt Recherche (CIR) pour les grandes entreprises.",
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
      "label": "CIR : Supprimer le taux à 5% (> 100 M€)",
      "description": "Supprimer le taux réduit de 5% du CIR pour les dépenses de recherche dépassant 100 M€.",
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
      "label": "Supprimer l'exonération de TICPE (Kérosène)",
      "description": "Supprimer l'exonération de taxe (TICPE) sur le kérosène utilisé par le transport aérien.",
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
      "label": "APL : Baisse forfaitaire de 5€",
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
      "label": "APL : Durcir le seuil d'accès (Revenu 18 920€)",
      "description": "Conditionner l'accès aux APL à un seuil de revenu net global de 18 920€.",
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
      "label": "APL : Durcir le seuil d'accès (Revenu 39 020€)",
      "description": "Conditionner l'accès aux APL à un seuil de revenu net global de 39 020€.",
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
      "label": "Réduire les subventions à l'enseignement privé",
      "description": "Baisser la subvention publique aux établissements d'enseignement privé.",
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
      "label": "Augmenter les frais d'inscription à l'université",
      "description": "Augmenter les frais d'inscription (ex: Licence 730€, Master 887€, Doctorat 1 380€).",
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
      "label": "Ajuster les dépenses d'éducation à la démographie",
      "description": "Aligner les dépenses d'éducation sur la baisse du nombre d'élèves (baisse démographique).",
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
      "label": "Geler les dotations de l'État (collectivités)",
      "description": "Geler en valeur (sans inflation) les transferts financiers de l'État aux collectivités locales.",
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
      "label": "Geler les budgets des collectivités locales (hors dette)",
      "description": "Geler en valeur le budget des collectivités locales (hors charges de dette).",
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
      "label": "Appliquer les 35h (collectivités locales)",
      "description": "Harmoniser la durée légale du travail (1607h/an) dans les collectivités locales.",
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
      "label": "Geler les retraites (base + compl.) en 2026",
      "description": "Gel ponctuel des retraites de base et complémentaires en 2026.",
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
      "label": "Désindexer les retraites de plus de 2 000€",
      "description": "Désindexer de l'inflation les pensions de retraite supérieures à 2 000€.",
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
      "label": "MaPrimeRénov’ : Cibler les rénovations d'ampleur",
      "description": "Recentrer l'aide MaPrimeRénov' sur les rénovations globales ('d'ampleur') et la sortie des 'passoires thermiques'.",
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