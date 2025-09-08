# Citizen Budget Lab (France)

*A public, transparent, and interactive app to explore French public spending and test “what‑if” scenarios—with credible macro and distributional impacts.*

---

## 1) Executive summary

**Problem.** Public debate on budgets is polarized and opaque. Citizens rarely see who spends what, for what outcomes, and what trade‑offs reforms imply.

**Solution.** Citizen Budget Lab is a web app that aggregates open French public‑finance data (État, Sécu, collectivités), procurement flows, and outcomes; lets users start either from the **Budget Playground** (turn dials on big masses) or the **Policy Workshop** (select named, fixed-impact reforms) with both views kept in sync; and instantly shows **accounting**, **distributional (microsim)**, and **macro (growth/jobs/deficit/debt)** impacts—with uncertainty and rule‑checks. A **Resolution Meter** makes unspecified changes visible until explained by concrete policies.

**Impact.** Improve understanding and trust by making trade‑offs tangible and sourced. Enable better media coverage and civic education; give policymakers a neutral, auditable sandbox.

**MVP focus.** A fast, delightful explorer of spending (missions/programmes ↔ COFOG), a procurement map (who is paid), simple deficit/debt arithmetic, EU rule indicators, and shareable explainer views. MVP+ introduces the Budget Playground with dials and pending state; V1 adds the Policy Workshop, Lens Switch, and Compare & Remix; V2 adds a lightweight macro kernel with uncertainty bands.

---

## 2) Objectives & non‑goals

### Product objectives (12–18 months)

* **Transparency:** Every euro is traceable to a line, organization, and function; every chart links to a source.
* **Education:** Show that choices have trade‑offs—what moves when a slider moves.
* **Credibility:** Surface ranges/uncertainty, assumptions, and institutional constraints.
* **Adoption:** Reach classrooms, journalists, NGOs, and curious citizens.

### Non‑goals (for now)

* Forecasting precise quarterly GDP; election‑style “true costings” claims.
* Modeling general equilibrium or endogenous monetary policy.
* Individual‑level personal data collection beyond optional, ephemeral inputs.

---

## 3) Key users & jobs-to-be-done

* **Curious citizens & students** — *Understand where money goes; compare France to EU peers; debunk myths.*
* **Journalists & fact‑checkers** — *Compile sourcing‑ready charts; test simple scenarios; export visuals.*
* **Teachers** — *Run guided exercises (“move €1bn from X to Y”); show distributional impacts.*
* **Civil society & analysts** — *Stress‑test reforms; cite assumptions and constraints.*
* **Local officials** — *Benchmark their territory; view procurement recipients; respect local balance rules.*

Success for all: **clarity + trust + shareability.**

---

## 4) What the product answers

1. **Where does each euro go?** By mission/program/action and by COFOG function; over time; vs. EU average.
2. **Who gets paid?** Procurement recipients by sector, size, location; competition flags.
3. **What if I change X?** Two synchronized ways:
   - Top‑down: turn the **Budget Dial** on a mass (e.g., Defense −10%) and see a pending delta chip and stripes until you specify “how” in policies.
   - Bottom‑up: pick a **Named Reform** (e.g., Carbon tax +€15B; Pension age path) and watch it “paint” across masses. Immediate: accounting impact (deficit/debt), EU rule lights. Then: distributional (households) and macro bands with uncertainty.
4. **How does my household look?** (V1+) Optional OpenFisca “me & my taxes” view; all local on device if feasible.

---

## 4.1) Interaction Model — Playground ↔ Workshop

- Playground center: An interactive **treemap** visualizes the budget. The three-column layout includes **Spending Controls** on the left and **Revenue Controls** on the right.
- Budget Dials & Reforms: Clicking a category in the side panels reveals an expanded view for setting targets and applying reforms.
- Policy Workshop: A hierarchical dashboard of **Reform Families → Levers** (e.g., Pensions: age, indexation; Taxes: VAT, carbon; Defense: procurement/personnel/operations) with a **Progress‑to‑Target** bar and **Feasibility tags** (Law/Admin/Lag). A **Path Compare** tray contrasts alternative mixes with distribution/EU lights/feasibility.
- Resolution Meter: HUD indicator “**Specified X%**” (overall and by mass) reflecting how much of mass goals are explained by named reforms.
- Lens Switch: toggle **By Mass ⇄ By Reform Family ⇄ By Named Reform**; ribbons show how a reform lands across multiple masses.
- Share & Permalink: every state exports a stamped **Share Card** (methods/version; partials show “Specified X%”).
- Compare & Remix: load a published plan, see side‑by‑side **twin bars + Δ waterfall**, then **Duplicate & Edit** to craft a counter‑proposal; lineage remains on the share card.
- Challenges & Classroom: weekly **challenges** (e.g., “Find €20B for green without raising VAT”) with **Resolution ≥80%** to submit; **Classroom Rooms** with live leaderboard (Balance, Equity, Compliance, Resolution) and auto‑debrief slides.

---

## 5) Scope by phase

### MVP (8–12 weeks)

* Data: State budget (missions/programmes, AE/CP/execution), Budget Vert tags (if available), DECP procurement, SIRENE firm registry; basic COFOG mapping; EU rule indicators; deficit/debt arithmetic.
* Features: “€1 explorer”; procurement map; compare across years; rule lights; share/export.
* Tech: Data pipelines + lakehouse; GraphQL read API; static arithmetic service; web client.

### MVP+ (4–8 weeks post‑MVP)

* Add Budget Playground (Twin Bars + Budget Dials) with pending stripes, Δ chips, and a global Resolution Meter (partial share watermark).
* Beneficiary lens for masses; permalink/share card service.

### V1 (12–20 weeks post‑MVP)

* Add OpenFisca for tax/benefit scenarios & distributional charts (deciles, household types, regions).
* Add broader COFOG lens and EU peer comparisons (Eurostat series).
* Policy Workshop (families/levers), Lens Switch, Compare & Remix view; Classroom mode: guided scenarios, printable handouts; Challenges loop.

### V2 (20–32 weeks post‑V1)

* Add macro kernel (reduced‑form impulse responses + uncertainty fans); toggleable priors (e.g., Banque de France / OFCE / INSEE families).
* Local finance module (OFGL/DGCL), with **équilibre réel** validation in simulations.

---

## 6) Data landscape (high level)

* **State (État):** PLF/LFI/PLR; PAP/RAP (performance indicators); AE/CP/execution; Budget Vert labels.
* **Social security (ASSO):** ONDAM and branches (CNAM, CNAF, CNAV) aggregates; health indicators (DREES/CNAM).
* **Local governments (APUL):** OFGL/DGCL datasets—accounts (M57/M14), balances, indicators; territorial codes.
* **Procurement:** DECP consolidated feeds/APIs; link to SIRENE for supplier identity, sector, and location.
* **Classifications:** COFOG; NAF/APE; functional/administrative mappings.
* **Macroeconomic series:** INSEE/Eurostat aggregates for context (GDP, jobs, debt/deficit); EU fiscal rule reference series.
* **Microsim:** OpenFisca France parameters & API.

All sources are open/public. We will maintain provenance, licenses, vintages, and refresh cadences.

---

## 7) Domain model (conceptual)

```
Organization (id, type: [Etat, Ministere, Programme, Action, APUL, ASSO], name, parent_id)
BudgetLine (id, org_id, year, classification: [mission, programme, action], cofog_code?, ae, cp, executed?, amount_eur, budget_vert_tag?)
CofogFunction (code, label, level)
Mapping (source_type, source_code, cofog_code, weight)
ProcurementContract (id, buyer_org_id, supplier_siren, date, procedure_type, amount_eur, lot_count, cpv_code, location_code)
Supplier (siren, name, naf_ape, employees_band, postcode, municipality_code)
LocalAccount (id, entity_id, year, title, nature, amount_eur, section: [operating, investment])
HouseholdSegment (id, definition_json)  // deciles, household type, region, etc.
Scenario (id, author, created_at, dsl_json, baseline_year)
Result (scenario_id, metric, timeseries_json, assumptions_ref)
Source (id, dataset_name, url, license, refresh_cadence, vintage, checksum)
```

---

## 8) Docs Index

- BACKLOG: `BACKLOG.md`
- Developer Notes: `README_DEV.md`
- LEGO Methodology: `docs/LEGO_METHOD.md`
- API Points (Eurostat, ODS, INSEE, etc.): `api-points.md`
- Caching & Warmers: `docs/CACHING.md`
- Secrets & Env Vars: `docs/SECRETS.md`
- GraphQL Contract: `docs/GRAPHQL_CONTRACT.md`

**Key relationships**: Organization→BudgetLine (1‑N); BudgetLine→Cofog via Mapping (N‑N weighted); ProcurementContract→Supplier via SIREN; LocalAccount→Organization (APUL); Scenario→Result (1‑N).

---

## 8) Data contracts (ingestion and semantic layer)

### 8.1 Budget lines (État)

```
Table: state_budget_lines
Columns:
- year: INT (YYYY)
- mission_code: TEXT
- mission_label: TEXT
- programme_code: TEXT
- programme_label: TEXT
- action_code: TEXT
- action_label: TEXT
- ae_eur: NUMERIC(20,2)  // authorisations d’engagement
- cp_eur: NUMERIC(20,2)  // crédits de paiement
- executed_eur: NUMERIC(20,2)  // realised (if available)
- budget_vert_tag: TEXT NULL  // climate tagging, if provided
- source_id: UUID  // to Source table
- updated_at: TIMESTAMP
Indexes: (year, programme_code), (mission_code), (programme_code, action_code)
```

### 8.2 COFOG mapping

```
Table: mapping_state_to_cofog
Columns:
- source: ENUM('mission', 'programme', 'action')
- source_code: TEXT
- cofog_code: TEXT  // e.g., 07.3
- weight: NUMERIC(5,4)  // 0..1, sums to 1 per source_code
- notes: TEXT
```

### 8.3 Procurement (DECP) + SIRENE

```
Table: procurement_contracts
Columns:
- contract_id: TEXT
- buyer_org_id: TEXT  // link to Organization
- supplier_siren: TEXT
- signed_date: DATE
- amount_eur: NUMERIC(20,2)
- cpv_code: TEXT
- procedure_type: TEXT
- lot_count: INT
- location_code: TEXT  // postal/INSEE code
- competition_flag: BOOLEAN  // derived
- source_id: UUID

Table: suppliers
- siren: TEXT PRIMARY KEY
- name: TEXT
- naf_ape: TEXT
- employees_band: TEXT
- postcode: TEXT
- municipality_code: TEXT
- source_id: UUID
```

### 8.4 Local public finance (OFGL/DGCL)

```
Table: local_accounts
- entity_id: TEXT  // INSEE code or SIREN of collectivity
- year: INT
- section: ENUM('operating','investment')
- title_code: TEXT
- nature_code: TEXT
- amount_eur: NUMERIC(20,2)
- source_id: UUID
Constraints:
- Check équilibre réel: operating_result >= 0 per year; investment section must balance including financing items.
```

### 8.5 Microsim (OpenFisca) integration

* **Transport**: REST to OpenFisca instance; batch calls with payload compression.
* **Contract**: For each scenario we send parameter deltas (rates, thresholds) and a representative household sample definition; we receive metrics per decile/household type.

---

## 9) Scenario DSL (draft)

**Design principles**: Human‑readable, versioned, declarative, and composable. Targets may be administrative (mission/programme) or functional (COFOG). Taxes/transfers use named parameters. Offsets optional; if absent, deficit/debt absorb.

```yaml
version: 0.1
baseline_year: 2026
assumptions:
  macro_kernel: BDF_2024_base   # choice of priors (V2)
  horizon_years: 5
  compliance_checks: [EU_3pct, EU_60pct, EU_NetExpenditure]
  price_index: CPI

actions:
  - id: ed_invest_boost
    target: mission.education
    dimension: cp
    op: increase
    amount_eur: 1000000000
    recurring: true
  - id: ir_cut_T3
    target: tax.ir.bracket_T3
    op: rate_change
    delta_bps: -50
    recurring: true
  - id: defense_trim
    target: mission.defense
    dimension: cp
    op: decrease
    amount_eur: 500000000
    recurring: true

offsets:
  - rule: share_across  # distribute across all operating subsidies except protected list
    pool: cofog.10.*    # social protection, exclude pensions
    total_eur: 500000000

metadata:
  title: "Boost education, cut mid‑bracket IR, trim defense"
  author: "demo@citizenlab"
  description: "Illustrative sandbox scenario"
```

**Validation**: schema checks, target IDs must exist for baseline\_year; guard against breaking local balance rules (see §12).

---

## 10) Calculation pipeline

### 10.1 Accounting layer (mechanical)

1. Parse DSL → a vector of **budget deltas** by administrative code and by COFOG.
2. Apply **AE/CP rules** and roll‑forward for recurring changes.
3. Recompute aggregates: deficit (flow), debt (stock), and classify by subsector (APUC/APUL/ASSO) for reporting.
4. EU rule checks (see §12) → status lights.

### 10.2 Distributional layer (OpenFisca)

* Build **policy deltas** from actions targeting taxes/transfers.
* Evaluate on a **representative household sample** (deciles × household types × regions) or on anonymized microdata if available.
* Return: Δnet income by decile, Gini/poverty deltas, regional view, and archetype stories.
* Performance: cache common parameter bundles; memoize results per baseline\_year.

### 10.3 Macro layer (V2)

* Represent user shocks as a function‑level vector **s** (COFOG categories and tax instruments) by year t..t+H.
* For each category *k*, store an **impulse response function** (IRF) for output/employment/deficit: $IRF_k(h)$, h=0..H.
* Compute effects via **convolution**:

  * $ΔY_t = \sum_k \sum_{h=0}^H IRF^{Y}_k(h) · s_{k,t-h}$
  * $ΔEmp_t = \sum_k \sum_{h=0}^H IRF^{Emp}_k(h) · s_{k,t-h}$
  * $ΔDef_t = mechanical\ + $ automatic stabilizers (elasticities to $ΔY_t$).
* **Debt dynamics**: $B_{t+1} = B_t + Def_t + SF_t$; interest bill uses projected average rate; display r‑g wedge.
* **Uncertainty**: for each IRF, store {low, base, high}; show fan charts; let power users switch prior sets.

---

## 11) EU and national constraints (logic spec)

**Checks implemented in the accounting layer:**

* **Deficit reference (3%)**: flag if general government deficit / GDP > 3% in any horizon year.
* **Debt reference (60%)**: display starting level and path; show whether debt decreases sufficiently under assumed path (informative).
* **Net expenditure rule** (new EU framework): compute growth of net primary expenditure adjusted for discretionary revenue measures; warn if path exceeds country‑specific reference (informative in MVP, scenario‑aware in V2).
* **Local balance (équilibre réel)**: for APUL entities, operating section ≥ 0; investment section must balance including financing—reject violating scenarios or require offsets.

All checks are **explainable** (hover for formula and inputs) and **non‑authoritative** (we present best‑effort indicators, not legal determinations).

Hover micro‑explainers: every rule light exposes a “Why/How computed” tooltip showing the exact formula, inputs used (by year), and links to Methods. These act as trust cues and learning aids.

---

## 12) UX & feature design

**Navigation**

* Top tabs: **Explore €1** • **Who gets paid?** • **What‑if?** • **My household** (V1) • **Compare EU** • **Sources**

Persistent Budget HUD (bottom): balance (€/ %GDP), debt path sparkline (fan on when uncertainty is enabled), EU lights, real/nominal toggle, year selector, undo/redo, reset.

**Explore €1**

* Sunburst/treemap by mission/program/action and parallel COFOG view; outcome indicators (from PAP/RAP) beside spend.
* Time slider with vintage toggle: allocation vs. execution; badge for provisional/final.

**Who gets paid?**

* Map + tables of suppliers by SIREN; filters (sector, size, geography); top counterparties for your department; competition flags; export table with source link.
* Caveat banner for provisional/partial data (info tooltip explains risks).

**What‑if? (Scenario builder)**

* Left: LEGO Shelf — search with synonyms, filters, and Spending/Revenue tabs; functional (COFOG) ⇄ administrative (missions/programmes) lens.
* Center: Building Canvas with twin bars — Total Revenues vs Total Spending; the animated gap is the deficit/surplus (also as %GDP). Drag pieces onto the canvas; add fixed-impact reforms from the Workshop. Chips above the bars show scheduled changes by year.
* Right: Consequence Dashboard — Accounting (big balance readout, debt path mini‑chart), EU rule lights (tooltips with formulas), Distribution (deciles/households), Macro (lite) with uncertainty bands. A Share bar sits at the bottom: Share card, Permalink, Export PNG/SVG, Embed.
* **Sources & assumptions drawer** lists data vintage, mappings, and model priors; one‑click copy of DSL JSON.
* **Share**: permalinks use deterministic scenario IDs (stable hash). Social card schema includes: `title`, mini twin‑bars, `deficit` (€/ %GDP), `debtDeltaPct`, one `highlight` fact, and source/methods badge. Exports include PNG/SVG and an embed with “Remix this”.

**Accessibility & trust**

* Plain‑language tooltips; bilingual FR/EN; keyboard‑friendly; color‑blind palettes; every chart has a “show the table” option.

---

## 13) Non‑functional requirements

* **Performance:** P95 < 1.5s for explorer queries; < 2.5s for simple scenarios; microsim < 5s with cache; macro < 1.5s (precomputed IRFs).
* **Reliability:** 99.5% monthly uptime; graceful data‑vintage fallbacks.
* **Observability:** tracing for scenario eval steps; audit log for data provenance.
* **Security & privacy:** No collection of personal identifiers by default; household inputs, if any, stay client‑side or are anonymized/ephemeral.
* **Openness:** Public API for read‑only queries with rate limits; open‑source mappings and DSL schema.

---

## 14) Architecture (high level)

* **Ingestion pipelines:** nightly pulls from open portals (CSV/JSON/API); schema validation (Great Expectations); dedupe; provenance captured in **Source**.
* **Warehouse/lakehouse:** Parquet tables; semantic layer (dbt) exposing **Administrative ↔ COFOG** mappings and aggregates by APU subsector.
* **Services:**

  * **Query API (GraphQL):** explorer queries; procurement joins.
  * **Microsim service:** wrapper around OpenFisca; job queue + cache.
  * **Macro kernel service:** IRF store + convolution engine + debt arithmetic.
  * **Compliance service:** EU/local rule calculators.
* **Client:** SPA (React/Next); state machine for scenario DSL; charting with saved views.

---

## 15) Governance & neutrality

* **Advisory panel:** economists (macro & public finance), public‑sector accounting, civil‑society reps, data stewards.
* **Documentation:** methodology notes per module; change log on assumptions; disclosure of limitations.
* **Neutral defaults:** present ranges, avoid point claims; label scenarios clearly.

---

## 16) KPIs & evaluation

* **Reach & engagement:** MAUs, time on task, scenarios created, replay rate.
* **Understanding/trust:** pre/post short quizzes in classroom mode; user survey: “I understand public spending better” (Likert ≥ 4/5).
* **Media uptake:** citations/embeds in major outlets; dataset downloads.
* **Robustness:** % queries with sourced data; data freshness SLA; audit issues resolved.
* **Virality:** % of scenarios that get shared; challenge completion rate.

---

## 17) Risks & mitigations

* **Data quality gaps** → multi‑source cross‑checks, visible caveats, versioning.
* **Model controversy** → multiple priors (toggle), uncertainty bands, plain‑language notes.
* **Political capture** → open methods, advisory panel, scenario labels (“illustrative”).
* **Performance** → pre‑aggregations, caching, async microsim jobs, graceful degradation.
* **Privacy (procurement small firms)** → aggregation thresholds in public views; raw tables via download with disclaimers.

---

## 18) Team & delivery plan

**Core team (MVP)**: Product Lead (0.5 FTE), Tech Lead (1), 2× Data Engineers, 1× Front‑end, 1× Designer, 0.5× Public‑finance Analyst, 0.3× DevOps.

**Add for V1/V2**: 1× Economist (microsim/macro), 1× Backend (services), 0.5× QA, 0.2× Policy counsel.

**Milestones**

* **M0–M1.5**: Data contracts, ingestion, basic explorer.
* **M1.5–M3**: Procurement map, COFOG mapping, deficit/debt arithmetic, rule lights → **MVP launch**.
* **M3–M5**: OpenFisca integration, distributional UI, EU compare → **V1**.
* **M5–M8**: Macro kernel, uncertainty fans, local finance module → **V2**.

---

## 19) Open questions (for discovery)

1. Depth of PAP/RAP indicator coverage desired in MVP?
2. Target granularity for local finance in V2 (commune vs. department vs. region)?
3. Classroom mode: which grade levels; what curriculum links?
4. Default macro priors set(s) and horizon—3 or 5 years?
5. Procurement competition flags: simple rules or advanced scoring?
6. Minimum viable EU peer set for comparisons?

---

## 20) Appendices

### A. Example GraphQL queries

```graphql
# 1) How is €1 allocated by mission for 2026?
query {
  allocation(year: 2026, basis: CP) { mission { code label amountEur share } }
}

# 2) Top suppliers in département 75 last year
query {
  procurement(year: 2024, region: "75") { supplier { siren name } amountEur cpv procedureType }
}

# 3) Run a scenario and return accounting + rule checks
mutation {
  runScenario(input: { dsl: "<base64>" }) {
    id
    accounting { deficitPath debtPath }
    compliance { eu3pct eu60pct netExpenditure localBalance }
  }
}
```

### B. Macro kernel spec (more detail)

* **Inputs**: scenario shocks by COFOG and tax instruments; baseline GDP, employment, interest/growth projections; elasticities for automatic stabilizers.
* **Parameters**: IRFs per category (low/base/high); Okun‑type mapping from output to employment (elasticity ε\_Okun); revenue/spending elasticities to cycle.
* **Outputs**: ΔGDP, Δemployment, Δdeficit, Δdebt; fan charts (P10/P50/P90).
* **Storage**: IRFs serialized as JSON per category with horizon H; versioned with source and estimation notes.

### C. EU rule calculators (pseudo‑code)

```python
# Deficit reference check
for t in horizon:
  if deficit[t] / gdp[t] > 0.03:
    flags["eu3pct"][t] = "breach"

# Debt reference path (informative)
debt_ratio[t+1] = (debt_ratio[t]*(1+r[t]) + deficit[t]) / (1+g[t])

# Net expenditure rule (simplified placeholder)
net_exp_growth = growth(net_primary_expenditure_adj)
if net_exp_growth > reference_rate + tolerance:
  flags["netExpenditure"][t] = "above"
```

### D. Distributional outputs (OpenFisca contract)

**Request**

```json
{
  "baseline_year": 2026,
  "policy_deltas": [{"parameter":"ir.brackets.T3.rate","delta_bps":-50}],
  "sample": {"type":"synthetic_grid","by": ["decile","household_type","region"]}
}
```

**Response**

```json
{
  "metrics": {
    "decile": [{"d":1,"delta_net_income_pct":0.2}, ...],
    "gini_delta": -0.001,
    "poverty_rate_delta_pp": -0.05
  },
  "assumptions": {"elasticities":"v2024.1"}
}
```

### E. Glossary

* **AE/CP**: authorisations d’engagement / crédits de paiement.
* **APU**: administrations publiques; **APUC/APUL/ASSO**: central / local / social.
* **COFOG**: functional classification of government expenditure.
* **DECP**: données essentielles de la commande publique.
* **IRF**: impulse response function.
* **OpenFisca**: open taxation/benefit microsimulation framework.
* **PAP/RAP**: performance annexes to the budget; programme objectives and results.
* **ONDAM**: national cap on health insurance spending.
* **Équilibre réel**: legal local‑budget balance rule in France.

---

**End of brief.**
