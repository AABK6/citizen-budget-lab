# Research Report

# Report Format: Technical Deep Dive – French Budgetary Policy Levers (PLF 2025/2026)

## Executive Summary

This technical report provides an exhaustive analysis of specific budgetary policy levers debated within the framework of the French *Projet de Loi de Finances* (PLF) for 2025 and projections for 2026. Prepared for an expert audience using budgeting simulation tools, this document isolates actionable fiscal proposals across four strategic domains: **Defense**, **Transport**, **Interior Security**, and **Culture**.

The 2025 budgetary exercise in France is characterized by a "double constraint": the imperative to reduce the public deficit (aiming for 5% of GDP) while simultaneously honoring multi-year programming laws (LPM for Defense, LOPMI for Interior) and addressing urgent investment needs in ecological transition and heritage preservation. The identified levers represent real-world political arbitrations—either adopted, proposed by the government, or introduced via parliamentary amendments (Senate/National Assembly)—during the tumultuous legislative sessions of late 2024 and early 2025.

Each lever is detailed with precise financial impacts, multi-year trajectories, and a risk analysis (political, social, and economic) derived from parliamentary debates, *Cour des Comptes* reports, and industry stakeholder feedback. The data is structured to facilitate direct translation into YAML configurations for budgetary modeling.

---

## 1. Domain: Defense (Défense)
**COFOG Mapping:** 02.1 (Military Defense)

The Defense budget is currently driven by the *Loi de Programmation Militaire* (LPM) 2024-2030, which mandates significant annual increases to cope with high-intensity geopolitical threats. However, the sheer size of these credit openings makes them a target for regulation in a constrained fiscal environment.

### Lever 1.1: LPM Trajectory Adherence (Budget Increase)
**Proposal Type:** Government Proposal (PLF 2025 Base) / Approved Measure

*   **Descriptive Label:** Implementation of "Year 2" of the LPM 2024-2030 (Major Capability Expansion).
*   **Description:**
    This lever activates the planned increase in credits for the *Mission Défense* strictly following the LPM 2024-2030 trajectory. It focuses on upgrading conventional equipment (Scorpion program), replenishing munitions stocks, modernization of nuclear deterrence, and improving personnel retention (*Plan Fidélisation 360*). The 2025 budget represents a historic "marche" (step up) to reach the target of 2% of GDP.
*   **Fixed Impact (Annual):** **+3,300,000,000 EUR** (Increase in Payment Credits - CP).
    *   *Note:* Total mission budget reaches approx. €50.5 billion (excluding pensions) [cite: 1, 2, 3].
*   **Multi-year Impact (Estimates):**
    *   **2026:** +3,200,000,000 EUR (Standard LPM step) to **+6,700,000,000 EUR** (Accelerated trajectory discussed in Senate/Government projections for "surtaxe" or adjustment) [cite: 4, 5, 6].
    *   **2027:** +3,000,000,000 EUR [cite: 7, 8].
    *   **2028:** +3,000,000,000 EUR (Trajectory continues towards €67-69bn by 2030).
*   **Pushbacks & Risks:**
    *   **Economic Risk:** The disconnect between "authorized" spending (LPM) and actual payment capacity creates a "debt wall" or *report de charges* (carry-over charges). The Senate Finance Commission warns that unpaid bills from 2024 are accumulating, potentially reaching €8 billion, which threatens the sincerity of the budget [cite: 4, 9].
    *   **Political Risk:** Left-wing opposition (LFI/PCF) criticizes an "obsession guerrière" (war obsession) at the expense of social spending [cite: 4, 10].
    *   **Execution Risk:** Inflation may erode the real purchasing power of the nominal increase (estimated at €30bn loss in purchasing power over the period) [cite: 11].
*   **Vigilance Points:**
    *   Monitor the level of *report de charges* (unpaid commitments carried to the next year). If >15% of the budget, the increase is artificial.
    *   Watch for "surgels" (freezing of credits) during the fiscal year to pay for inter-ministerial cost overruns (e.g., OPEX costs exceeding provisions).
*   **Sources:**
    *   *Forces Operations Blog* (Oct 2024) [cite: 1].
    *   *Public Sénat* (Dec 2025) [cite: 4].
    *   *Ministère des Armées* Official Release [cite: 3, 12].
    *   *Senate Finance Commission Report* [cite: 9, 13].

### Lever 1.2: Budget Regulation / Rationalization (Budget Savings)
**Proposal Type:** Parliamentary Amendment (Senate - Dominique de Legge) / Counter-Proposal

*   **Descriptive Label:** Reduction of Authorization/Credits to Match Execution Capacity & Reduce "Report de Charges".
*   **Description:**
    A proposal led by the Senate Finance Rapporteur (Dominique de Legge) to reduce the requested increase in credits or cap specific programs. The rationale is not pacifism, but budgetary sincerity: the Ministry of Armed Forces physically cannot spend the massive influx of credits efficiently due to industrial bottlenecks, leading to an accumulation of "carry-overs" (*report de charges*). The proposal aims to align credits with *actual* delivery schedules and impose savings on support functions.
*   **Fixed Impact (Annual):** **-1,700,000,000 EUR** (Savings / Reduction of the planned increase).
    *   *Note:* This does not cut the nominal budget below year N-1 but reduces the *growth* requested for year N [cite: 4, 14, 15].
*   **Multi-year Impact:**
    *   **2026-2028:** Smoothing the LPM "hump" to avoid overheating; implicitly reduces future deficit contribution by ~€1-2bn/year relative to the LPM baseline, though potentially delaying capability deliveries.
*   **Pushbacks & Risks:**
    *   **Strategic Risk:** The Government and Army Staff argue this sends a negative signal to allies and adversaries regarding France's commitment to "High Intensity" warfare readiness [cite: 4, 16].
    *   **Industrial Risk:** Defense contractors (Dassault, Naval Group, etc.) rely on these multi-year commitment authorizations to invest in production lines. Cutting them could slow down the transition to a "War Economy" [cite: 2].
*   **Vigilance Points:**
    *   This lever is technically a "limitation of growth" rather than a net cut in absolute terms.
    *   Impacts specifically *Programme 146* (Equipment) and *Programme 178* (Preparation of Forces).
*   **Sources:**
    *   *Public Sénat* (Dec 2025) [cite: 4].
    *   *Senate Finance Report* (Dominique de Legge) [cite: 8, 14, 15].
    *   *La Tribune* (May 2025) [cite: 9].

---

## 2. Domain: Transports and Mobility (Transports et mobilités)
**COFOG Mapping:** 04.5 (Transport)

The Transport budget is a battleground between the need for ecological planning (rail investment) and the hunt for immediate yield (taxing aviation/roads) or savings (cutting infrastructure agency funding).

### Lever 2.1: Tax on Aviation (Revenue Generation)
**Proposal Type:** Government Amendment (PLF 2025)

*   **Descriptive Label:** Increase of the *Taxe de solidarité sur les billets d'avion* (TSBA) and Aviation Taxation.
*   **Description:**
    A comprehensive fiscal measure to increase the existing TSBA (Solidarity Tax on Airplane Tickets) and introduce stricter taxation on business aviation. The tariff for long-haul and business class flights is significantly hiked. The stated goal is twofold: generating revenue for the state/rail infrastructure and dampening demand for carbon-intensive transport.
*   **Fixed Impact (Annual):** **+1,000,000,000 EUR** (New Revenue / Fiscal Yield).
    *   *Breakdown:* ~€850M from commercial aviation + ~€150M from business aviation [cite: 17, 18, 19].
*   **Multi-year Impact:**
    *   **2026-2028:** Recurring revenue of €1bn/year. However, elasticity of demand might slightly erode the base over time if ticket prices rise too sharply.
*   **Pushbacks & Risks:**
    *   **Economic Criticism:** Airlines (Air France-KLM, FNAM) argue this taxes French hubs disproportionately compared to European competitors, risking a loss of market share and connectivity. They call it a "suicide for the sector" [cite: 19, 20].
    *   **Territorial Risk:** Fears of isolation for French overseas territories (Outre-mer) and regional airports, though some exemptions exist [cite: 21].
    *   **Allocation Criticism:** The industry criticizes that the revenue goes to the general budget (debt reduction) rather than decarbonizing aviation (SAF fuels) [cite: 20].
*   **Vigilance Points:**
    *   Monitor the actual pass-through rate to passengers.
    *   Check for "leakage" where passengers choose hubs like Frankfurt or London to avoid the tax on long-haul connections.
*   **Sources:**
    *   *FNAM* (Oct 2025) [cite: 20].
    *   *Le Club des Juristes* (Feb 2025) [cite: 21].
    *   *Assemblée Nationale* Amendment I-3630 [cite: 18].
    *   *Delville Management* [cite: 19].

### Lever 2.2: Reduction of AFIT France Resources (Spending Cut)
**Proposal Type:** Government Measure (PLF 2025)

*   **Descriptive Label:** Reduction of TICPE Allocation to AFIT France (Agence de financement des infrastructures de transport de France).
*   **Description:**
    To save state revenue, the government reduced the fraction of the TICPE (Fuel Tax) allocated to the transport infrastructure agency (AFITF). This effectively caps the agency's ability to fund new projects (rail regeneration, roads) without increasing the deficit.
*   **Fixed Impact (Annual):** **-487,000,000 EUR to -800,000,000 EUR** (Reduction in funding/savings for the central state budget).
    *   *Note:* The Senate Finance Commission cites a reduction of revenue affectation of €800M in 2025 [cite: 22], while other sources mention a €487M adjustment in "variables d'ajustement" [cite: 23].
*   **Multi-year Impact:**
    *   **2026-2028:** If sustained, this creates an "investment gap" for the *Plan Ferroviaire* (100bn by 2040), delaying RER metropolitan projects (SERM) and rail regeneration [cite: 24, 25].
*   **Pushbacks & Risks:**
    *   **Infrastructure Risk:** Under-investment in rail maintenance leads to "grey debt" (deteriorating assets) and lower service quality (delays/breakdowns) [cite: 17].
    *   **Political Pushback:** The Senate strongly opposed this, adopting amendments to restore funds, arguing it contradicts the Prime Minister's ecological planning promises [cite: 24].
*   **Vigilance Points:**
    *   This is a "pocket-to-pocket" transfer: saving for the State Budget = loss for the Agency Budget.
    *   Crucial for modeling the feasibility of *Serm* (RER Métropolitains) projects.
*   **Sources:**
    *   *Sénat* Finance Report [cite: 17, 22, 24].
    *   *Banque des Territoires* [cite: 23].
    *   *AFIT France* Press Release [cite: 26].

### Lever 2.3: Investment in SERM (Rail Investment)
**Proposal Type:** Parliamentary/Regional Demand (Senate/Regions)

*   **Descriptive Label:** Funding for *Services Express Régionaux Métropolitains* (SERM).
*   **Description:**
    Proposals to create specific funding streams (like a *Versement Mobilité Régional* or dedicated state subsidies) to launch the construction of metropolitan RERs in Strasbourg, Bordeaux, Lyon, etc.
*   **Fixed Impact (Annual):** **+700,000,000 EUR to +1,000,000,000 EUR** (Investment Need/Proposed Credits).
    *   *Note:* PLF 2025 appropriations were debated; initial needs are for studies and early works [cite: 27, 28].
*   **Pushbacks:**
    *   **Financing Flou:** The "100 billion" plan has no clear funding source. The pushback is largely "Who pays?"—Regions vs. State vs. Taxpayers [cite: 17, 28].
*   **Sources:**
    *   *Objectif RER Métropolitains* [cite: 28].
    *   *Ecologie.gouv.fr* [cite: 27].

---

## 3. Domain: Interior Security (Sécurité intérieure)
**COFOG Mapping:** 03.1 (Police) / 03.2 (Fire protection/Civil Defense)

Security budgets are protected by the LOPMI (*Loi d'Orientation et de Programmation du Ministère de l'Intérieur*) 2023-2027. The trend is structurally upward, with little room for cuts except via symbolic political amendments.

### Lever 3.1: LOPMI Implementation (Budget Increase)
**Proposal Type:** Government Proposal (PLF 2025 Base)

*   **Descriptive Label:** Enforcement of LOPMI Year 3 (Security Forces Upgrade).
*   **Description:**
    Increase in credits to finance the "Blue in the streets" strategy: creation of 80 new Gendarmerie brigades, modernization of equipment (digital tools, vehicles), and execution of salary revaluations (Protocoles sociaux) agreed upon before the Olympics.
*   **Fixed Impact (Annual):** **+587,000,000 EUR** (Increase in CP).
    *   *Note:* Total mission budget reaches ~€17.3 billion. The increase covers personnel (+€225M) and investment/functioning (+€527M - offset by other adjustments) [cite: 29, 30].
*   **Multi-year Impact:**
    *   **2026-2027:** The LOPMI plans a cumulative increase of €15 billion over 5 years. Expect annual steps of +€500M to +€800M depending on inflation indexation [cite: 31, 32].
*   **Pushbacks & Risks:**
    *   **Efficiency Criticism:** The *Cour des Comptes* notes that despite massive budget increases (+25% since 2017), "presence on the ground" has not proportionally increased due to administrative burdens and rigid shifts [cite: 33].
    *   **Investment Lag:** Inflation in construction costs is eroding the real value of the investment budget for new Gendarmerie barracks [cite: 34].
*   **Vigilance Points:**
    *   Distinguish between "Payroll measures" (irreversible) and "Equipment/Investment" (adjustable). The LOPMI leans heavily on payroll due to recent union agreements.
*   **Sources:**
    *   *Libération* (Oct 2024) [cite: 29].
    *   *Public Sénat* (Dec 2025) [cite: 34].
    *   *Senate Reports* [cite: 31, 32].

### Lever 3.2: "Disbanding Units" / Symbolic Cuts (Budget Savings)
**Proposal Type:** Parliamentary Amendment (LFI / Ecologists)

*   **Descriptive Label:** Suppression of Specific Units (e.g., BRAV-M) or Reduction of Intervention Credits.
*   **Description:**
    Political amendments aiming to disband controversial units like the BRAV-M (motorized repression brigades) or reduce the "maintain order" budget in favor of "community policing" or suicide prevention.
*   **Fixed Impact (Annual):** **-5,400,000 EUR to -100,000,000 EUR** (Symbolic Savings / Reallocation).
    *   *Note:* Specific amendments often target €5.4M (transfer for suicide prevention) or larger symbolic cuts of ~€100M to police equipment [cite: 35, 36].
*   **Pushbacks:**
    *   **Operational Risk:** The Ministry argues these units are essential for managing riots and high-intensity civil unrest.
    *   **Political Rejection:** These amendments are systematically rejected by the Senate majority and the central block in the Assembly [cite: 35].
*   **Sources:**
    *   *Sénat* Amendment II-1614 [cite: 35].
    *   *Assemblée Nationale* Amendment [cite: 36, 37].

---

## 4. Domain: Culture and Media (Culture et médias)
**COFOG Mapping:** 08.2 (Cultural Services) / 08.3 (Broadcasting)

Culture faces a dichotomy: "Sanctuarization" of Heritage (Patrimoine) vs. "Rationalization" of Public Broadcasting and Youth subsidies.

### Lever 4.1: Heritage "Marshall Plan" (Investment)
**Proposal Type:** Government Amendment (Rachida Dati) / Senate Adoption

*   **Descriptive Label:** Exceptional Plan for Heritage & Monuments (*Plan Patrimoine*).
*   **Description:**
    An exceptional amendment introduced by Minister Rachida Dati to increase funding for the restoration of historic monuments (especially in rural areas) and religious heritage, citing a risk of "disappearance" for 2,000 sites.
*   **Fixed Impact (Annual):** **+300,000,000 EUR** (Increase in Authorizations - AE) / **+200,000,000 EUR** (Payment Credits - CP).
    *   *Breakdown:* €55M for regional monuments, €23M for museums, €8M for rural museums, etc. [cite: 38, 39].
*   **Multi-year Impact:**
    *   **2026-2028:** Intended as a structural upgrade, but often voted as "exceptional" one-off credits. Sustainability depends on future PLFs.
*   **Pushbacks & Risks:**
    *   **Fiscal Risk:** Financed by debt or vague "savings" elsewhere.
    *   **Execution Capacity:** Can the specialized construction sector (craftsmen) absorb €300M of new work immediately? [cite: 40].
*   **Sources:**
    *   *Localtis* (Nov 2024) [cite: 39].
    *   *Boxoffice Pro* [cite: 38].
    *   *Senate Culture Commission* [cite: 40].

### Lever 4.2: Audiovisual Public Cuts (Savings)
**Proposal Type:** Government Proposal (Budget Adjustment)

*   **Descriptive Label:** Budgetary Cuts to *Audiovisuel Public* (France Télévisions, Radio France).
*   **Description:**
    A reduction in the annual dotation for public broadcasters to force efficiency gains and structural reforms (mergers/holding creation).
*   **Fixed Impact (Annual):** **-50,000,000 EUR** to **-81,500,000 EUR** (Savings).
    *   *Note:* The cut is relative to the "trajectory" or inflation-adjusted needs. Specifically, a €50M nominal cut was announced [cite: 38, 41].
*   **Multi-year Impact:**
    *   **2026:** Proposed further savings of €71M [cite: 42, 43].
*   **Pushbacks & Risks:**
    *   **Social Risk:** Unions at France TV/Radio France warn of strikes and reduced content quality.
    *   **Strategic Risk:** Weakening public media in the face of private platforms (Netflix/YouTube) and disinformation [cite: 41].
*   **Sources:**
    *   *Sénat* Opinion Reports [cite: 41].
    *   *Vie Publique* (Oct 2025) [cite: 42].

### Lever 4.3: Pass Culture Reform (Savings)
**Proposal Type:** Government Reform

*   **Descriptive Label:** Reform of the Individual Share of *Pass Culture*.
*   **Description:**
    Reducing the amount allocated to the "individual share" (money given directly to 15-18 year olds) or tightening eligibility conditions to curb "deadweight loss" (aubaine) and focus on collective school activities.
*   **Fixed Impact (Annual):** **-43,000,000 EUR** (Savings).
    *   *Note:* Credits reduced from €210.5M to €127.5M in some lines, net saving estimated around €35-43M due to lower usage projections [cite: 44, 45].
*   **Pushbacks:**
    *   **Youth Opposition:** Unpopular among 15-18 year olds.
    *   **Cultural Sector Risk:** Bookstores and Manga sellers (primary beneficiaries) risk a revenue drop [cite: 46].
*   **Sources:**
    *   *Livre Provence* [cite: 44].
    *   *Sénat* Culture Report [cite: 45].

---

## 5. Summary Table for Simulation Tool (YAML Prep)

| Domain | Lever Label | Type | Impact (EUR) | Scope | Sources |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Defense** | LPM Year 2 Execution | Spending (+) | +3,300,000,000 | Annual (Base 2025) | [cite: 1, 3] |
| **Defense** | Senate "De Legge" Adjustment | Savings (-) | -1,700,000,000 | Adjustment to Growth | [cite: 4, 14] |
| **Transport** | TSBA Aviation Tax Increase | Revenue (+) | +1,000,000,000 | Annual Revenue | [cite: 17, 19] |
| **Transport** | AFITF Funding Cut (TICPE) | Savings (-) | -800,000,000 | Central Budget Gain | [cite: 22]|
| **Security** | LOPMI Implementation | Spending (+) | +587,000,000 | Annual (Base 2025) | [cite: 29] |
| **Culture** | Heritage "Marshall Plan" | Spending (+) | +300,000,000 | Exceptional Inv. | [cite: 39] |
| **Culture** | Audiovisual Efficiency Cut | Savings (-) | -50,000,000 | Annual Cut | [cite: 38, 41] |
| **Culture** | Pass Culture Rationalization | Savings (-) | -43,000,000 | Structural Reform | [cite: 45, 47] |

---

## 6. Detailed Summaries for YAML Translation

### 6.1 Defense: LPM Year 2 Execution
*   **id:** `def_lpm_execution_2025`
*   **name:** "Execute LPM Year 2 (+3.3bn)"
*   **description:** "Implementation of the planned budget increase for the Ministry of Armed Forces compliant with the Loi de Programmation Militaire 2024-2030. Focuses on ammunition stocks, nuclear modernization, and retention."
*   **cofog:** "02.1"
*   **impact_annual_eur:** 3300000000
*   **impact_2026_eur:** 6700000000
*   **impact_2027_eur:** 3000000000
*   **risk_analysis:** "High accumulation of carry-over charges (report de charges) if payment credits do not match authorization speed. Inflation may absorb 30% of the nominal increase."
*   **source_ids:** [cite: 1, 3]

### 6.2 Defense: Senate Adjustment
*   **id:** `def_senate_adjustment`
*   **name:** "Limit Defense Growth (Senate Proposal)"
*   **description:** "Reduction of the planned Defense budget increase by 1.7 billion EUR to align with actual industrial production capacity and reduce the 'debt wall' of unpaid bills."
*   **cofog:** "02.1"
*   **impact_annual_eur:** -1700000000
*   **risk_analysis:** "Political backlash regarding commitment to NATO/High Intensity warfare. Risk of slowing down industrial investments."
*   **source_ids:** [cite: 4, 14]

### 6.3 Transport: TSBA Aviation Tax
*   **id:** `trans_aviation_tax_tsba`
*   **name:** "Increase Air Ticket Solidarity Tax (TSBA)"
*   **description:** "Tripling of the solidarity tax on commercial flights and introduction of specific levies on business aviation to fund rail infrastructure and debt reduction."
*   **cofog:** "04.5"
*   **impact_annual_eur:** -1000000000
    *   *(Note: Negative EUR in expenditure context usually means Revenue/Savings in simulation tools, adjust sign based on tool logic. Here it represents a **gain** for the budget).*
*   **risk_analysis:** "Loss of competitiveness for Paris-CDG hub (Air France). Risk to tourism in Outre-mer territories."
*   **source_ids:** [cite: 17, 20]

### 6.4 Transport: AFITF Cut
*   **id:** `trans_afitf_cut`
*   **name:** "Reduce AFITF TICPE Allocation"
*   **description:** "Reduction of the fraction of Fuel Tax (TICPE) allocated to the Transport Infrastructure Agency, effectively capping transport investment to save central state funds."
*   **cofog:** "04.5"
*   **impact_annual_eur:** -8000000000
    *   *(Note: This is a cut in spending transfer).*
*   **risk_analysis:** "Deterioration of rail network (grey debt). Delays in RER Metropolitains (SERM) deployment."
*   **source_ids:** [cite: 22]

### 6.5 Security: LOPMI Implementation
*   **id:** `sec_lopmi_increase`
*   **name:** "Interior Ministry LOPMI Increase"
*   **description:** "Budget increase to fund 80 new Gendarmerie brigades, cyber-security upgrades, and salary protocols for police forces."
*   **cofog:** "03.1"
*   **impact_annual_eur:** 587000000
*   **risk_analysis:** "Efficiency paradox: budget increases faster than 'blue on the street' presence due to administrative weight."
*   **source_ids:** [cite: 29]

### 6.6 Culture: Heritage Investment
*   **id:** `cult_heritage_plan`
*   **name:** "Exceptional Heritage Plan (Dati)"
*   **description:** "One-off investment plan for the restoration of historic monuments and religious heritage in rural areas."
*   **cofog:** "08.2"
*   **impact_annual_eur:** 300000000
*   **risk_analysis:** "Absorption capacity of the restoration craft sector. Sustainability of funding beyond 2025."
*   **source_ids:** [cite: 39]

### 6.7 Culture: Audiovisual Savings
*   **id:** `cult_audiovisual_cut`
*   **name:** "Public Broadcasting Budget Cut"
*   **description:** "Reduction in state dotation for France Télévisions and Radio France to mandate efficiency gains."
*   **cofog:** "08.3"
*   **impact_annual_eur:** -50000000
*   **risk_analysis:** "Social unrest (strikes). Risk to content creation diversity."
*   **source_ids:** [cite: 38, 41]

**Sources:**
1. [forcesoperations.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHmsvNsgmUofude4faKYe4vXJUCBUPd8LfsjmScxP1qW7gOnuA_H1dpgTmzQcY51mzrEkjVDQX1RXyCbC8GZwHJNK7tYnVrSVZKz96MlUZZittN1emKHOBEwiREtiax9MDUzNHdys2HsKnPTc6vYpVIRhRRRuFz7pNLhUeQx6cpQCRzTj3HGg3c)
2. [defnat.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHltr1wyYwp1PSLLOXsLqnGcPTHU5pADtUATJGeTgAmN-rJaC_Jn0IepKMP447670bZ97hwnpjd9br74E6ZNmUq9ieqGF61wm5xs3A42zOje_cyOUDfSZVnTR1PzLWFNyls6iM63-pZ-pHXmRs=)
3. [defense.gouv.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGL47Y0Uk5kDlm8qaNUcjV908QFxczDfAK9R0kIs6sRgauLXGuXJojQGYKd9RWMKkwOLUn4PUIiJxMUHs8MpAwSeGGsXq2m0T7ALBcdm5yYFraAWPzBzJi-kn8GoyLduokidCE5SO7OU9nCy7eOj8bGBYbvo_JbmgXFGR9BfAjQC6eq_49OSlmGi-cGKizVKKFqysubZTQLerEN3MbbgKHubXJyU9ELcxF8SptrEsJYLQM24NXy-xLOfj1FvwfkIw==)
4. [publicsenat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQECuytDdI9jeDTOSIRv3kOcD14AfdisS_MfMSrsrHdrQn3NPjz9IEmsFknP5PY8EFDqnoGl-HXFJ_TuUM-mfYh7xf6fqFgFqnyL2iMNpNNAgKQ2yVgBRp4EKm0wxYUp98n0MOIgszEE2mhDQtnfb5XX9X00b1SgJ86Vo20a0bGSobX8nCH1YyFr_D4EpVV-HTr3_yHNYh2unNAimFYXFgmRCX7fsgzzK8oIwjf-sh9NBEtW34ukukN6ga-rIr7pRE-fu56tY_oPNpoSvAkVp3QUwme9DOUyjZ8FjQhx9qvvBoXl0A-F)
5. [defense.gouv.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHkjWRBJlsES7FASL-pKYVwYMGCKqyJ4AugbDSLlCTgTDMebAK32SSqR-c_nFKvSmGKx-EHuaPtf0U7trlzUlVZKn_hmsIXyIvwBL8zJwkrnmbGFwfjSFWUVq2cF7VcyLJGLZSgLVuHc7Vz-RrGsk3XZtt-WC4wydp0_meYkoah-47qiaUQO6cvQFSDS1m3pi_Eu9KyTc_IIR6yjPeLi8F5uCqorutBtIVjTcMccghrKgcCxtVF6d-nxsjKHZcPjQ==)
6. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHKc6d1s8VulnyMtzC_6bg2intq53cf8KA3PrJXBDXLH2vTG8Qti1rEzV132TJ9Dhn8R-vFdcreVsqgjg0J8NnPOhfpP0MKY8d4NEL-Zmqr25ejNtFjGrM6N87Mmg8e5AnWo_xy9P98X67jXuH7Lw==)
7. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGb-eWEUmE3F2F4goiFdfp0eknN9nyoW_22dXekIiSAyDOW4c7Ddjw4mvZGjOjIQLgP3MPC73cP-UNZ9sZ_6e1pPmEWJgfokb5kF0BN7YlG7Nx5DuA6N0og6Qn5NCDYMKvmg53Sa3axLZp3)
8. [publicsenat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG1QEPpeDQGIducrqmH3cjYvR1DI0QbT-yerqMIBRP9ViLeSyz9rhKvm6HWjKgWttVVHy9vbhXRZwZTyvvrSzYQvkBYFVDt8cnmRekIBkOzCGax-81-rkR5w8mSh92ecj4AZFVDfCRRRFoJTvB7bBvGfD2HIVWJnLVPh_th9LF8mM9wrcV_dmzYPJDcnXwFUPpnNNnUZ3Z9WZk_ryLT3vS1GeId-0_ee5auDBjgHJsIoAxrfz4jprHUvKpqxOwhD8mXxEBYY9COFCWYxcW5Vl5M0QHV0dgNBFn7MrZ52EdPl7H8dkwSSezUjk5Bq4A-T3J7BSI=)
9. [latribune.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHuYzg86l1L4OMa_s2jh2XInDRrRlEWOsfdy33NkEMspidOax9PkWZ0YS4nB13-4ao-jLg2yAdTp9jLGRBgIeoAJe1pVblPIHuxYXb104zM-EIO7tHiEGGZ8XzlWyKVjYZLxfBm_kXt6dfqKPTA2R5J8RkCO7aeLsaKDH2mTfxj1e54BbEnzRnUyB1ROcYB4khstgkyMJZMM7tuW27usTThPCB8e41iVXApiQbghlYcypgvULAREJg9g-92zYZ9HWOHq-S-Qyd_Ve3cXTGsKiZw)
10. [assemblee-nationale.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF1w6q6AdeTwItUtyd4HvdKt4GXvp7ghxRcwinBj8B4WHGakn9QhpvoX-1LqR8eJUPSDsGH-BPBX71OhCqCecuhx5tSCRbAp3vYswHr1HLmOcIh4hSNAxVWoRs6Jy4jHMpZoRlC9Z1uHkxhtzabsms=)
11. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGo9KbS3p_oVF3riO0iqQyZWBzQiG82kk238jJPY5V5FIcDOcakjQfY_-2etZmFcIKShDvmKnf1wph4cIN3YkkZpbfV-dK1acVIMdpjaivgz8g7TvIHaZv45vGvKJMwtgmBtXv952fQFzM=)
12. [defense.gouv.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHJTPBhEMLE0ZjTHnXHkye9vWnz7Yq3_rsPlXjbUFi0V5hwIwCj7Bafk3roluJcScippbih2uNrLNymszhYzwnhVpAiHKxt-ph025369ismZ68mCXVHmq-DIpOvLuvQlLzl767yPeMQkeQDHuU2zP5tI3_J20v83ePut07PJvsvVuF3unObvqhpYSdjGoGGo5oUK68DbiEXnNtAT2i-a4VD2Z7gpiWz5ChqIdjj0YV7DDJXZVdYP_36Hfi5OAP6H9I3m777D8iuvnClnhCcDFhYbw==)
13. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF23gTDb_1Yu8BkpkOrOOqAhueYCp17TZvQmtveWH6paCIzWnk9b0NSqwQrVOFkRZN13qw_q0lEay9R6-bY-TRjpMRdydj7vdFJHDhhL3mPefQ9-9DrAHEBO81LA0dOZavRnyQnLeWuZ-RkO8DbyA==)
14. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEWVTs-CfF_y5i5aS0HRqAtMf91cJlUOYQRoMwj3QXViTPmTAve2wE-Giv_AYDn1BeOPySSUL_NhAzEMllc1KbaZkXCLLai221hJOigSNMYuHSIFxuKu8RkvEaF_KBQ8P4uJQOu5tLd6lpLFw==)
15. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHfT_-kb7hoC15EY2WYTMmYBKo7F9PEl0geObkZZNFl3jv_lnhqstxGMRHxt0ZasbNu7KcAp0sh3fGztVAlOKabpD5bJmWrOjlfQAJDf6olzKh_ca53zmYqnkVNe4Z5Ad3FFwAo_67a-YkP0q33fA==)
16. [vie-publique.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE--_gn49F0SpDoDHijXpYw9OWROXxXq2-SpQ2Ko_9nMoVbk4gV_Hp7bL03cX8Hi-1BFuWzd28qwxqc6973_pSfeDmheEH-CqN_ctUcw9Rt4wuA-eJgkKheXejZZLxHfYI2ZltGRrqijjM83q-1x6fhcUpxv-wVQp9-E-qfdGsueyj-o3ySSdF4cgd6A509wIyQLSym99em)
17. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHotqoMtH8B38fTHcWnjDIgKi9aHlxPIrZQLPULB1PPb7Q4Ot28YFNMb-b_DZWsO9AV5FronpTx1LbemSobStvV3eSleiNEkijylXE5C4EqfUA7c98XzH976pbjSF-ve1a9cmx-UKyjlnI=)
18. [assemblee-nationale.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGKoq-i_-OHgJDW9O6KZsQD7yMe6pCtLMzMOVUatGq5akYiUMSmZSKJk2yTvm5Ibkcs5BBqOphowIYZjkRDvr_v4ixyexYuXQy0L3k5i09YQbBV1H1D1rRtwY1m7umdqZqgDPyaKdJU525ubcs-liHcWd249KSHgXt_)
19. [delville-management.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGMzChiHIfH_U_P_xjc3HcnBGAanlUpEjSEVxUT3zxuZjVlNBHcad_biVbslQJzzVLwYRu2woLKJUyQKZcScotW_L84fbtXgkXKUUTjLDc5eMn4dsSUowvHULWMNkA1HdYJsE8dTjdkvBRlcRgXkYhfPPx_)
20. [fnam.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHEwXGxt4I5v_Defl1dT8icru9f6mxPwM4xGCzB9AuZP45uW5DBJZMna-DzJygBJo3N0cGDey2lUOL6PhJC1BtunNIpM9CdAfr_i1piAX9PFLHHfaAN7x9EtiNJCouc-bYMUdvHLaCASnHhldnxp52Bmvook7jFLjfjIEohhkRi)
21. [leclubdesjuristes.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEBnE7Z18m4qu8fyhUAjYJPSi22xEwMh8o5kMHLsGNeFbuV99av0llqP7SMP-uqUKfHCsPjoEOvD3ayKZPbmKnvCDJeXd9Jkn2qTgZeAlDil0JBkidHmt0WoOX1H55WFH47-ZHpC9gvUxeGzP40j434b_BuYmUbSR4RcjTgolK6YXUyunO0UB3VCL3ug-0w6TpPg74KOyuNBVWsQ2QPaNferlptpJnTPWzE6u_k5I6T1ddUDQ==)
22. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEEuS1--0wNGBges9G8wlLxyD8_NEJDU-Zfr-98r9xOkFMKdw-rd9-BtXwIz5oYHAUvIyiLkDshTrxTWM3-p0iN09sznYnSvFFaQ2eDGrZXCwUBQY7WQWKgfBvdB22BRiGOum6YEJX2Q_ugZb_wD5lM)
23. [banquedesterritoires.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHLuMQ9GIbFQtWhaOFjhDT9nhBy4UzPKebUOGUGNkWn9CuwzbC6CiVnFTQ44Y_znJzGsUCiq29mOAty46U3U4Tbi6QGkJ9nGsYrGcBZRtay6gB00CEaeUT5O_PC-ynyIXtTQT2pxcllCd87ZjJbHN3VuuTYkCXBHAVMJe7gRevBtI98rEpvlqMsVl9pRhILxkjRB6U7OdslEqzMJaCRlvDp90ZePtuCRJgMmVxLAgE=)
24. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEmCD8LgNlb9SdUnm0--3p_1WoEPnNGtACScMPtn8ZiMHoer2ErPiozcNAHIIkU06IXbz7_J5RdXHfsx_jYiwgY5-zGBOVU5yzgidprDjs_gyicK2Qb1TFyoPg1oCe-hbJMj_siFLdTz8qRLMo=)
25. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFbIAWLZJtBGYDOjm1H2sVmW2JyNOcGrSX-6ck_XWBgwR3zoDmksLKDJ7km6bcILAzu3as_PgqPYXQJ0gLiG6dgdX1f8Y-agWOXCTF9Y0bFt389vDZWV9Iio4kxwODC1eTzdr4Z81BYdg==)
26. [afit-france.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGorljov9JzqIjH0huTWH80dKJJqJkKfpoxlzF2x8ugJ-N08nbp_-kiHGHiLf1IJjKPnyivg6x2PvHXq8O5TbnYjtabfS1hIyHh5eWF1SPoebQV_7ET30fqgpDNf0guw5khWj98dEvFQ6Vz-teaCP8uXS5WATBLTG2faZoIjwF5iC-KVBM_OE83POoprCldvpEik2TIwwYtkbbs0NDRo9Ql0At0VNOGAMDPAMK6Pz_uY3uOOC_A)
27. [ecologie.gouv.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEwg3lQGXzM5xIGtFCdkpaF49IgFCnGpUtn_scafX6ArJJezc57BUvEPgxMNJB9vQ5XWmx8GCQUD7lxz3OCPs_5FjdD_7cgNx_tZDVXdtRU07R20JjHGZ3kxFD1X4xb5DNchRGYZCQWkOE6W77xDLoVQQ5o8NTr3Q7cQKRZDWeR9XfMEZJehHqoSvTTsigYsCk50i4bzME=)
28. [objectifrerm.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQElzvEbHCxeI54ecDPej46Q89P_SVAoS3elWSZFJgTeel7BPkUbFKahkJXBZTxFYc5Z-gQPtiKGW6SRUJeaIJi1sbrrj9u1xpq41gVgour0aLoRl5QeJ1BLkHNMzO2JyxkbbXJKe0XzN6ZG-d1qghW1HnsloSqy_fg=)
29. [liberation.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH3ueo6azb0FC470Bwyu4iikXMIoXQDfcpULXbs9qD9doON4C_ICRKGDkSZZq6peBnTYRl3aT2JO1xgkqacUHSEbTM-gbGvD18keRbB5YRPTGn5vF2TlV4XRgPNiFUIqZKMNwE_nAuwdy3sI0yGPdA19zqLuIEJ1URdmlWr17t1s9fAOEZBhI7OblNtvpMvniOzMjX1qSHbQIbjoewxLJaHE0GCUeHZOTn-ujdPjGr9Q1bh5l05zGs6uJeSprQgrHXjgL-ZHXHMucGUQtMLum0ieReysWaupA==)
30. [vie-publique.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGuoXVDJ7d7S2k26aLTt-jVr5OE1OX-xW4pyWDemvTIvNgx-qPMN4nbkUpCPb8qGayBCXeVhWSFCfyAPOOxzlnEPnKGcZFfnaPCh22mZeKR961ZD7uAuvxjE9Vaz4xMPgv6TPlTxhCif955gCZuKa1WB2E7pqAfa_IgICjIxf40sSOP1YXOTnE463M6yCZ0DWoRO-4ofPm7WWJ3PTcv6fMtkqo=)
31. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHCA-D0s0AxjtneYEgOA0PyUtyhXC9yS7xYFB15OJlLGi1hPLZ3myvTSoDSqDRmPDgPjpWuHnn7z_sWBLK1dE0PcPhETDAr83FORiosox3YDFv17LMoCyBJUPVv6BPILVOpK8t076ghqRd-3rPYYnJ4zqTxBQ==)
32. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHKY-AAalxeGNDb1Q0nLTnYTOO82jBMUCzWdzNSTsUxbIGHYaSRBsY3RvObqQVdyh5L4LogLCm2Vu5y1HenNInfpEIAdaXdARjM6X7lAYw47RY4J6p4xJoD5_SGDO_TpYJPh3A7jU3pmvcy8e6nOg==)
33. [ccomptes.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQET6k3qPWoDRW4IWDVAWqWww02gwEOF8TakKTaQd4AryZ8L_O9habSnKaXmgwyNWQNviLeKBIEmYjkOTnjSx_0N5j58IZ7AHUoK8bQ8yz9MMbLtOBKE7Dakc7rJKkv5RR320nZi3USbefXZDdQZh9LV0DqbDd4_0084keoop_h41F0RL4UfEz5BCXMUIro8y-GpoqrqCLEnQgZZAXmIFHrMQQgsmO9V8mfSyw==)
34. [publicsenat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEa6vghMG-Rq8hs-_sVE5f_1Q3JMER0qW2SopTRXGlgpmgE4GgXQfoYSR5FNxszDkceK3plP0PSOydfq0uM9H4ysJwjOqJU-VG_JoUe9MzDjwwlgV7naLwwfiu6-_12DwJFn1RgRPfsm-4ajfP77L5rc1tskKTTRNdraMcgJzFQmX1p-CYVKGpG0jnH6x7gVFp3qZazm3yD7K71JOyheKu4_R6wy1ww83bxRnCEC1h3FdH21NAgY7_vESKXZP2uhBZ8eFXFLLK8NtKxfFr-Xnu9ACMjB49sowuQzo0_hO-e)
35. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEOa2hxA2daHunvIflarGFfJXovbX6zZuZVsGizhaPTcwcIimgF8BDMNBQ1agYyiUG7AZA2p_cun4p86lCPa7vzpIF0OXc6a5UZqAuCT2ukNqCBCWfMowz8Vu5c3_cfYwqBV9AgtP5OMZ9UdnG0ddbyUcVv)
36. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH3Ycl9qeRk8ZOfJOMWlMC0-_JRPhgKM6hwrv8a562z0m0f-sj3V0DbDczkMPZFVMeBq1b6uu6LG3L3eG213E97xsBk29Sj5eFTdD0l6F3N0Plknzk-xkLmEM6V3ODRIv6R-XG8Y1arAIzbPHoQUxQK2rUycbY=)
37. [assemblee-nationale.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEgS4mPROKBcWzIIBV0APZfYCo6hCQpkESsf-ApuKuoHdJIG6_wQF0tGG2_Sv_KQ2odF_I0VA_G4jscY_sd-tnQCuBq90Afj6V2YWPRFfMkWtV96ldM4zzyEFTLtbcirSurVazECHTGN8BLXHshAVkkb4WPeDrIKVjvl6yXIZXHqvurQYcRGmbyVediyT0=)
38. [boxofficepro.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE0LsNO29JmKCcEccGch5NfNyJvQYF79cvWL8O85OXic7-CBNh2yhQOOCIpPN9C6VXlPUry6xjp03Xlv986mQ9m7IGDOkFALkawuqohFDK1RPBaRaCYLblpuwB0Bs69qpy7YaJ7dt602--FPC48M22Yf0-2RIAT797SxTpqAA==)
39. [banquedesterritoires.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG_E3MEUIowi66aQJrUbK3MPBAxPUJ5BGMTAfJ4PgNG_m1gbtsw5aG5mrYvIxW1YjmsRSVkGWoxuuWu30iw4pDQMh4zy1yqfxf4DmO4JNPCubyM03dSDSvZMYzW2XKvp8F8UbxaGlljUY1C3uSsl30Pld1CsPE9BqzL3iOiMnEXUjK-CboFf0EIHqMC1ROKjZBgg7FnMQ_vsX4=)
40. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEBo9LSAHNdC7gQptXfi4OdBcPGCDHC30fGB42qrsvWf28SUP0hpu9RvO2vJEocV5250Hjpo-HdRZuplSqn7A9R7cEhJTswvlA7YzDjiQ5Gif1tmLrQFmrxXdKaSKzkDbayJeRsasw_ZTbv)
41. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFlTpMv-JETXvJ6xDaTJjSXZ_XcsfFuabh8brj2aisPVttM56aCgUj84jV6aE3D8tbvLonpfKbC_9U-IHOq983vEojCaVGkkuJWOpaZ8cvbePCn90Xhu-_HMpEz5uOrPMegZHpmOHjgaFc_VFvWBA==)
42. [vie-publique.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGVM2bYW82q8z5j1LEm0ol1TM9MqO0oEwYmROrRVzVUJDZQHVrmlMq2mYSIBNVWU8CfWlWUuXT0fW_1PXHLOgLAFzSHbdMXvnfYXMNzZKZH43JsFAYCOQ8lXVEY1ZSlqLa2itx2cNuWTi_NiMrkjMTXNZ73aynqIXL9HA51mx7ibgPnAzwqWCJ7ltgK9BUZ9Vfj_df3XTony8B3YA==)
43. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE2Cuc34oS8qnoGhwF5FGHPSWglnA6rVGBExOuK2ZD2N4pg08mtNdwbPWLOAndWcjhiRqxTNdTfcH7u4jwlS5bZe0HvZHlgEKFauDdRvpFwiwhp4W1dikXIBoXg__8v6AlJH4CGk2S85YL-uiQtVRTry9EATvcF)
44. [livre-provencealpescotedazur.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEm1bRCs4CHinUfMwVX8uez_UjJg-oEVxIXq8_aB9KYIoqfbM2BGQqDbCy2fe0FALhXwDCpr4GHMz9tLnuPbJKgZepjueSNQGkfKHJETYmBjuzrko9kSFoaeZgXiLiIsRAVXBpBK8ZyeF3_tuYp77Qh7EWGps3fOSUL_zuIh2XGmQ-zxXZaMAwrwymjl0JhdvPLSw6Wz4MiqhLWLPicFAMRuno=)
45. [senat.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-RdfyOT-xt-1yJTs_Ru2xFyfpo0D5QBDDY0itwRCchZu5g9V5yKJp0xJgzTG8MhafgJxxlMaoaX8H0exmJEZpZE9AbGMevPS9e2Wu7d44AM4GASL3fZ-goKQadBXpUFDPOxksN1RDyi2NNg==)
46. [assemblee-nationale.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHpjC1-tQbrfvmuoODXHiLl7i4P6NPKe3nMtlF263jyVMIDl_Tm-zY_1NMBwb8vQp78C753yVhTz-YHK5oOXKRwD9SASQMlZUV78vNyvZ4AtjfMmlCb2A2A-rpXulpD9guV2cE9h8mmD8IWJZBUVufVHQDs7o9fi60CZRvkXbF3wQXaMpY247vl6qrrkPM=)
47. [artcena.fr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEr7ogCiKxZRI6AehbIxz-pDMXzsrIpMbseYjxeucjHtqRb1GWNzpi9R-OnBM_JvoYZOufFzSzZ8-P78ubwuLwTGctCVOOowfV9ReHJIbUCjIfKrOz_iDs8_4h9VztPt0cwU_Lk1FBpiVCZs-0W2jNcC2QH7YfBRwoG2YC1x9JhNYbF)


### Citations
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGL47Y0Uk5kDlm8qaNUcjV908QFxczDfAK9R0kIs6sRgauLXGuXJojQGYKd9RWMKkwOLUn4PUIiJxMUHs8MpAwSeGGsXq2m0T7ALBcdm5yYFraAWPzBzJi-kn8GoyLduokidCE5SO7OU9nCy7eOj8bGBYbvo_JbmgXFGR9BfAjQC6eq_49OSlmGi-cGKizVKKFqysubZTQLerEN3MbbgKHubXJyU9ELcxF8SptrEsJYLQM24NXy-xLOfj1FvwfkIw==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHltr1wyYwp1PSLLOXsLqnGcPTHU5pADtUATJGeTgAmN-rJaC_Jn0IepKMP447670bZ97hwnpjd9br74E6ZNmUq9ieqGF61wm5xs3A42zOje_cyOUDfSZVnTR1PzLWFNyls6iM63-pZ-pHXmRs=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHmsvNsgmUofude4faKYe4vXJUCBUPd8LfsjmScxP1qW7gOnuA_H1dpgTmzQcY51mzrEkjVDQX1RXyCbC8GZwHJNK7tYnVrSVZKz96MlUZZittN1emKHOBEwiREtiax9MDUzNHdys2HsKnPTc6vYpVIRhRRRuFz7pNLhUeQx6cpQCRzTj3HGg3c
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQECuytDdI9jeDTOSIRv3kOcD14AfdisS_MfMSrsrHdrQn3NPjz9IEmsFknP5PY8EFDqnoGl-HXFJ_TuUM-mfYh7xf6fqFgFqnyL2iMNpNNAgKQ2yVgBRp4EKm0wxYUp98n0MOIgszEE2mhDQtnfb5XX9X00b1SgJ86Vo20a0bGSobX8nCH1YyFr_D4EpVV-HTr3_yHNYh2unNAimFYXFgmRCX7fsgzzK8oIwjf-sh9NBEtW34ukukN6ga-rIr7pRE-fu56tY_oPNpoSvAkVp3QUwme9DOUyjZ8FjQhx9qvvBoXl0A-F
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHKc6d1s8VulnyMtzC_6bg2intq53cf8KA3PrJXBDXLH2vTG8Qti1rEzV132TJ9Dhn8R-vFdcreVsqgjg0J8NnPOhfpP0MKY8d4NEL-Zmqr25ejNtFjGrM6N87Mmg8e5AnWo_xy9P98X67jXuH7Lw==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHkjWRBJlsES7FASL-pKYVwYMGCKqyJ4AugbDSLlCTgTDMebAK32SSqR-c_nFKvSmGKx-EHuaPtf0U7trlzUlVZKn_hmsIXyIvwBL8zJwkrnmbGFwfjSFWUVq2cF7VcyLJGLZSgLVuHc7Vz-RrGsk3XZtt-WC4wydp0_meYkoah-47qiaUQO6cvQFSDS1m3pi_Eu9KyTc_IIR6yjPeLi8F5uCqorutBtIVjTcMccghrKgcCxtVF6d-nxsjKHZcPjQ==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG1QEPpeDQGIducrqmH3cjYvR1DI0QbT-yerqMIBRP9ViLeSyz9rhKvm6HWjKgWttVVHy9vbhXRZwZTyvvrSzYQvkBYFVDt8cnmRekIBkOzCGax-81-rkR5w8mSh92ecj4AZFVDfCRRRFoJTvB7bBvGfD2HIVWJnLVPh_th9LF8mM9wrcV_dmzYPJDcnXwFUPpnNNnUZ3Z9WZk_ryLT3vS1GeId-0_ee5auDBjgHJsIoAxrfz4jprHUvKpqxOwhD8mXxEBYY9COFCWYxcW5Vl5M0QHV0dgNBFn7MrZ52EdPl7H8dkwSSezUjk5Bq4A-T3J7BSI=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGb-eWEUmE3F2F4goiFdfp0eknN9nyoW_22dXekIiSAyDOW4c7Ddjw4mvZGjOjIQLgP3MPC73cP-UNZ9sZ_6e1pPmEWJgfokb5kF0BN7YlG7Nx5DuA6N0og6Qn5NCDYMKvmg53Sa3axLZp3
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHuYzg86l1L4OMa_s2jh2XInDRrRlEWOsfdy33NkEMspidOax9PkWZ0YS4nB13-4ao-jLg2yAdTp9jLGRBgIeoAJe1pVblPIHuxYXb104zM-EIO7tHiEGGZ8XzlWyKVjYZLxfBm_kXt6dfqKPTA2R5J8RkCO7aeLsaKDH2mTfxj1e54BbEnzRnUyB1ROcYB4khstgkyMJZMM7tuW27usTThPCB8e41iVXApiQbghlYcypgvULAREJg9g-92zYZ9HWOHq-S-Qyd_Ve3cXTGsKiZw
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF1w6q6AdeTwItUtyd4HvdKt4GXvp7ghxRcwinBj8B4WHGakn9QhpvoX-1LqR8eJUPSDsGH-BPBX71OhCqCecuhx5tSCRbAp3vYswHr1HLmOcIh4hSNAxVWoRs6Jy4jHMpZoRlC9Z1uHkxhtzabsms=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGo9KbS3p_oVF3riO0iqQyZWBzQiG82kk238jJPY5V5FIcDOcakjQfY_-2etZmFcIKShDvmKnf1wph4cIN3YkkZpbfV-dK1acVIMdpjaivgz8g7TvIHaZv45vGvKJMwtgmBtXv952fQFzM=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHJTPBhEMLE0ZjTHnXHkye9vWnz7Yq3_rsPlXjbUFi0V5hwIwCj7Bafk3roluJcScippbih2uNrLNymszhYzwnhVpAiHKxt-ph025369ismZ68mCXVHmq-DIpOvLuvQlLzl767yPeMQkeQDHuU2zP5tI3_J20v83ePut07PJvsvVuF3unObvqhpYSdjGoGGo5oUK68DbiEXnNtAT2i-a4VD2Z7gpiWz5ChqIdjj0YV7DDJXZVdYP_36Hfi5OAP6H9I3m777D8iuvnClnhCcDFhYbw==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF23gTDb_1Yu8BkpkOrOOqAhueYCp17TZvQmtveWH6paCIzWnk9b0NSqwQrVOFkRZN13qw_q0lEay9R6-bY-TRjpMRdydj7vdFJHDhhL3mPefQ9-9DrAHEBO81LA0dOZavRnyQnLeWuZ-RkO8DbyA==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEWVTs-CfF_y5i5aS0HRqAtMf91cJlUOYQRoMwj3QXViTPmTAve2wE-Giv_AYDn1BeOPySSUL_NhAzEMllc1KbaZkXCLLai221hJOigSNMYuHSIFxuKu8RkvEaF_KBQ8P4uJQOu5tLd6lpLFw==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHfT_-kb7hoC15EY2WYTMmYBKo7F9PEl0geObkZZNFl3jv_lnhqstxGMRHxt0ZasbNu7KcAp0sh3fGztVAlOKabpD5bJmWrOjlfQAJDf6olzKh_ca53zmYqnkVNe4Z5Ad3FFwAo_67a-YkP0q33fA==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE--_gn49F0SpDoDHijXpYw9OWROXxXq2-SpQ2Ko_9nMoVbk4gV_Hp7bL03cX8Hi-1BFuWzd28qwxqc6973_pSfeDmheEH-CqN_ctUcw9Rt4wuA-eJgkKheXejZZLxHfYI2ZltGRrqijjM83q-1x6fhcUpxv-wVQp9-E-qfdGsueyj-o3ySSdF4cgd6A509wIyQLSym99em
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGKoq-i_-OHgJDW9O6KZsQD7yMe6pCtLMzMOVUatGq5akYiUMSmZSKJk2yTvm5Ibkcs5BBqOphowIYZjkRDvr_v4ixyexYuXQy0L3k5i09YQbBV1H1D1rRtwY1m7umdqZqgDPyaKdJU525ubcs-liHcWd249KSHgXt_
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGMzChiHIfH_U_P_xjc3HcnBGAanlUpEjSEVxUT3zxuZjVlNBHcad_biVbslQJzzVLwYRu2woLKJUyQKZcScotW_L84fbtXgkXKUUTjLDc5eMn4dsSUowvHULWMNkA1HdYJsE8dTjdkvBRlcRgXkYhfPPx_
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHotqoMtH8B38fTHcWnjDIgKi9aHlxPIrZQLPULB1PPb7Q4Ot28YFNMb-b_DZWsO9AV5FronpTx1LbemSobStvV3eSleiNEkijylXE5C4EqfUA7c98XzH976pbjSF-ve1a9cmx-UKyjlnI=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHEwXGxt4I5v_Defl1dT8icru9f6mxPwM4xGCzB9AuZP45uW5DBJZMna-DzJygBJo3N0cGDey2lUOL6PhJC1BtunNIpM9CdAfr_i1piAX9PFLHHfaAN7x9EtiNJCouc-bYMUdvHLaCASnHhldnxp52Bmvook7jFLjfjIEohhkRi
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEBnE7Z18m4qu8fyhUAjYJPSi22xEwMh8o5kMHLsGNeFbuV99av0llqP7SMP-uqUKfHCsPjoEOvD3ayKZPbmKnvCDJeXd9Jkn2qTgZeAlDil0JBkidHmt0WoOX1H55WFH47-ZHpC9gvUxeGzP40j434b_BuYmUbSR4RcjTgolK6YXUyunO0UB3VCL3ug-0w6TpPg74KOyuNBVWsQ2QPaNferlptpJnTPWzE6u_k5I6T1ddUDQ==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEEuS1--0wNGBges9G8wlLxyD8_NEJDU-Zfr-98r9xOkFMKdw-rd9-BtXwIz5oYHAUvIyiLkDshTrxTWM3-p0iN09sznYnSvFFaQ2eDGrZXCwUBQY7WQWKgfBvdB22BRiGOum6YEJX2Q_ugZb_wD5lM
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHLuMQ9GIbFQtWhaOFjhDT9nhBy4UzPKebUOGUGNkWn9CuwzbC6CiVnFTQ44Y_znJzGsUCiq29mOAty46U3U4Tbi6QGkJ9nGsYrGcBZRtay6gB00CEaeUT5O_PC-ynyIXtTQT2pxcllCd87ZjJbHN3VuuTYkCXBHAVMJe7gRevBtI98rEpvlqMsVl9pRhILxkjRB6U7OdslEqzMJaCRlvDp90ZePtuCRJgMmVxLAgE=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEmCD8LgNlb9SdUnm0--3p_1WoEPnNGtACScMPtn8ZiMHoer2ErPiozcNAHIIkU06IXbz7_J5RdXHfsx_jYiwgY5-zGBOVU5yzgidprDjs_gyicK2Qb1TFyoPg1oCe-hbJMj_siFLdTz8qRLMo=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFbIAWLZJtBGYDOjm1H2sVmW2JyNOcGrSX-6ck_XWBgwR3zoDmksLKDJ7km6bcILAzu3as_PgqPYXQJ0gLiG6dgdX1f8Y-agWOXCTF9Y0bFt389vDZWV9Iio4kxwODC1eTzdr4Z81BYdg==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGorljov9JzqIjH0huTWH80dKJJqJkKfpoxlzF2x8ugJ-N08nbp_-kiHGHiLf1IJjKPnyivg6x2PvHXq8O5TbnYjtabfS1hIyHh5eWF1SPoebQV_7ET30fqgpDNf0guw5khWj98dEvFQ6Vz-teaCP8uXS5WATBLTG2faZoIjwF5iC-KVBM_OE83POoprCldvpEik2TIwwYtkbbs0NDRo9Ql0At0VNOGAMDPAMK6Pz_uY3uOOC_A
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQElzvEbHCxeI54ecDPej46Q89P_SVAoS3elWSZFJgTeel7BPkUbFKahkJXBZTxFYc5Z-gQPtiKGW6SRUJeaIJi1sbrrj9u1xpq41gVgour0aLoRl5QeJ1BLkHNMzO2JyxkbbXJKe0XzN6ZG-d1qghW1HnsloSqy_fg=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEwg3lQGXzM5xIGtFCdkpaF49IgFCnGpUtn_scafX6ArJJezc57BUvEPgxMNJB9vQ5XWmx8GCQUD7lxz3OCPs_5FjdD_7cgNx_tZDVXdtRU07R20JjHGZ3kxFD1X4xb5DNchRGYZCQWkOE6W77xDLoVQQ5o8NTr3Q7cQKRZDWeR9XfMEZJehHqoSvTTsigYsCk50i4bzME=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGuoXVDJ7d7S2k26aLTt-jVr5OE1OX-xW4pyWDemvTIvNgx-qPMN4nbkUpCPb8qGayBCXeVhWSFCfyAPOOxzlnEPnKGcZFfnaPCh22mZeKR961ZD7uAuvxjE9Vaz4xMPgv6TPlTxhCif955gCZuKa1WB2E7pqAfa_IgICjIxf40sSOP1YXOTnE463M6yCZ0DWoRO-4ofPm7WWJ3PTcv6fMtkqo=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH3ueo6azb0FC470Bwyu4iikXMIoXQDfcpULXbs9qD9doON4C_ICRKGDkSZZq6peBnTYRl3aT2JO1xgkqacUHSEbTM-gbGvD18keRbB5YRPTGn5vF2TlV4XRgPNiFUIqZKMNwE_nAuwdy3sI0yGPdA19zqLuIEJ1URdmlWr17t1s9fAOEZBhI7OblNtvpMvniOzMjX1qSHbQIbjoewxLJaHE0GCUeHZOTn-ujdPjGr9Q1bh5l05zGs6uJeSprQgrHXjgL-ZHXHMucGUQtMLum0ieReysWaupA==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHCA-D0s0AxjtneYEgOA0PyUtyhXC9yS7xYFB15OJlLGi1hPLZ3myvTSoDSqDRmPDgPjpWuHnn7z_sWBLK1dE0PcPhETDAr83FORiosox3YDFv17LMoCyBJUPVv6BPILVOpK8t076ghqRd-3rPYYnJ4zqTxBQ==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHKY-AAalxeGNDb1Q0nLTnYTOO82jBMUCzWdzNSTsUxbIGHYaSRBsY3RvObqQVdyh5L4LogLCm2Vu5y1HenNInfpEIAdaXdARjM6X7lAYw47RY4J6p4xJoD5_SGDO_TpYJPh3A7jU3pmvcy8e6nOg==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQET6k3qPWoDRW4IWDVAWqWww02gwEOF8TakKTaQd4AryZ8L_O9habSnKaXmgwyNWQNviLeKBIEmYjkOTnjSx_0N5j58IZ7AHUoK8bQ8yz9MMbLtOBKE7Dakc7rJKkv5RR320nZi3USbefXZDdQZh9LV0DqbDd4_0084keoop_h41F0RL4UfEz5BCXMUIro8y-GpoqrqCLEnQgZZAXmIFHrMQQgsmO9V8mfSyw==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEa6vghMG-Rq8hs-_sVE5f_1Q3JMER0qW2SopTRXGlgpmgE4GgXQfoYSR5FNxszDkceK3plP0PSOydfq0uM9H4ysJwjOqJU-VG_JoUe9MzDjwwlgV7naLwwfiu6-_12DwJFn1RgRPfsm-4ajfP77L5rc1tskKTTRNdraMcgJzFQmX1p-CYVKGpG0jnH6x7gVFp3qZazm3yD7K71JOyheKu4_R6wy1ww83bxRnCEC1h3FdH21NAgY7_vESKXZP2uhBZ8eFXFLLK8NtKxfFr-Xnu9ACMjB49sowuQzo0_hO-e
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEOa2hxA2daHunvIflarGFfJXovbX6zZuZVsGizhaPTcwcIimgF8BDMNBQ1agYyiUG7AZA2p_cun4p86lCPa7vzpIF0OXc6a5UZqAuCT2ukNqCBCWfMowz8Vu5c3_cfYwqBV9AgtP5OMZ9UdnG0ddbyUcVv
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH3Ycl9qeRk8ZOfJOMWlMC0-_JRPhgKM6hwrv8a562z0m0f-sj3V0DbDczkMPZFVMeBq1b6uu6LG3L3eG213E97xsBk29Sj5eFTdD0l6F3N0Plknzk-xkLmEM6V3ODRIv6R-XG8Y1arAIzbPHoQUxQK2rUycbY=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEgS4mPROKBcWzIIBV0APZfYCo6hCQpkESsf-ApuKuoHdJIG6_wQF0tGG2_Sv_KQ2odF_I0VA_G4jscY_sd-tnQCuBq90Afj6V2YWPRFfMkWtV96ldM4zzyEFTLtbcirSurVazECHTGN8BLXHshAVkkb4WPeDrIKVjvl6yXIZXHqvurQYcRGmbyVediyT0=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE0LsNO29JmKCcEccGch5NfNyJvQYF79cvWL8O85OXic7-CBNh2yhQOOCIpPN9C6VXlPUry6xjp03Xlv986mQ9m7IGDOkFALkawuqohFDK1RPBaRaCYLblpuwB0Bs69qpy7YaJ7dt602--FPC48M22Yf0-2RIAT797SxTpqAA==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG_E3MEUIowi66aQJrUbK3MPBAxPUJ5BGMTAfJ4PgNG_m1gbtsw5aG5mrYvIxW1YjmsRSVkGWoxuuWu30iw4pDQMh4zy1yqfxf4DmO4JNPCubyM03dSDSvZMYzW2XKvp8F8UbxaGlljUY1C3uSsl30Pld1CsPE9BqzL3iOiMnEXUjK-CboFf0EIHqMC1ROKjZBgg7FnMQ_vsX4=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEBo9LSAHNdC7gQptXfi4OdBcPGCDHC30fGB42qrsvWf28SUP0hpu9RvO2vJEocV5250Hjpo-HdRZuplSqn7A9R7cEhJTswvlA7YzDjiQ5Gif1tmLrQFmrxXdKaSKzkDbayJeRsasw_ZTbv
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFlTpMv-JETXvJ6xDaTJjSXZ_XcsfFuabh8brj2aisPVttM56aCgUj84jV6aE3D8tbvLonpfKbC_9U-IHOq983vEojCaVGkkuJWOpaZ8cvbePCn90Xhu-_HMpEz5uOrPMegZHpmOHjgaFc_VFvWBA==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE2Cuc34oS8qnoGhwF5FGHPSWglnA6rVGBExOuK2ZD2N4pg08mtNdwbPWLOAndWcjhiRqxTNdTfcH7u4jwlS5bZe0HvZHlgEKFauDdRvpFwiwhp4W1dikXIBoXg__8v6AlJH4CGk2S85YL-uiQtVRTry9EATvcF
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGVM2bYW82q8z5j1LEm0ol1TM9MqO0oEwYmROrRVzVUJDZQHVrmlMq2mYSIBNVWU8CfWlWUuXT0fW_1PXHLOgLAFzSHbdMXvnfYXMNzZKZH43JsFAYCOQ8lXVEY1ZSlqLa2itx2cNuWTi_NiMrkjMTXNZ73aynqIXL9HA51mx7ibgPnAzwqWCJ7ltgK9BUZ9Vfj_df3XTony8B3YA==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEm1bRCs4CHinUfMwVX8uez_UjJg-oEVxIXq8_aB9KYIoqfbM2BGQqDbCy2fe0FALhXwDCpr4GHMz9tLnuPbJKgZepjueSNQGkfKHJETYmBjuzrko9kSFoaeZgXiLiIsRAVXBpBK8ZyeF3_tuYp77Qh7EWGps3fOSUL_zuIh2XGmQ-zxXZaMAwrwymjl0JhdvPLSw6Wz4MiqhLWLPicFAMRuno=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-RdfyOT-xt-1yJTs_Ru2xFyfpo0D5QBDDY0itwRCchZu5g9V5yKJp0xJgzTG8MhafgJxxlMaoaX8H0exmJEZpZE9AbGMevPS9e2Wu7d44AM4GASL3fZ-goKQadBXpUFDPOxksN1RDyi2NNg==
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHpjC1-tQbrfvmuoODXHiLl7i4P6NPKe3nMtlF263jyVMIDl_Tm-zY_1NMBwb8vQp78C753yVhTz-YHK5oOXKRwD9SASQMlZUV78vNyvZ4AtjfMmlCb2A2A-rpXulpD9guV2cE9h8mmD8IWJZBUVufVHQDs7o9fi60CZRvkXbF3wQXaMpY247vl6qrrkPM=
- https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEr7ogCiKxZRI6AehbIxz-pDMXzsrIpMbseYjxeucjHtqRb1GWNzpi9R-OnBM_JvoYZOufFzSzZ8-P78ubwuLwTGctCVOOowfV9ReHJIbUCjIfKrOz_iDs8_4h9VztPt0cwU_Lk1FBpiVCZs-0W2jNcC2QH7YfBRwoG2YC1x9JhNYbF
