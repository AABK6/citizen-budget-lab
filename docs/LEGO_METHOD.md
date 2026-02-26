LEGO Budget Methodology

Overview

This note documents how the LEGO “pieces” for expenditures and revenues are mapped to official aggregates, how beneficiary categories are derived, and how simple elasticities are used for revenue simulations in v0.1. It is intentionally transparent and conservative; parameters are versioned and easy to audit.

From MVP+ onward, the LEGO layer powers two synchronized lenses:
- Missions (Budget Playground, ADMIN lens): big administrative blocks with Budget Dials and pending state. COFOG remains the functional lens for alternate views.
- Named Reforms (Policy Workshop): hierarchical families → levers that compose and attribute onto missions by default (COFOG mappings stay available for the functional view).

Datasets & Scope

- Expenditures: Eurostat SDMX 2.1 XML (dissemination) `GOV_10A_EXP` for General Government (S13). We aggregate by COFOG (functional classification) and ESA transaction type (NA_ITEM) using series keys:
  - `A.MIO_EUR.S13.GF{MAJOR}.{NA_ITEM}.{geo}` (e.g., GF07.D632.FR for citycare in‑kind transfers; GF10.D62.FR for social benefits).
- Revenues: Eurostat SDMX 2.1 XML with two flows:
  - Taxes & social contributions: `GOV_10A_TAXAG` via `A.MIO_EUR.S13.{NA_ITEM}.{geo}` (e.g., D211 VAT; D51 income taxes; D29 other production taxes; D59A recurrent property taxes; D611/D612/D613 contributions).
  - Sales & fees: `GOV_10A_MAIN` via `A.MIO_EUR.S13.{P11|P12}.{geo}`.
- Interest: ESA D.41 is not exposed in these flows for our usage; we proxy from COFOG 01.7 (Public debt transactions) total using `GOV_10A_EXP` series `A.MIO_EUR.S13.GF0107.TE.{geo}`.
- GDP: Local series (`data/gdp_series.csv`) used for informational ratios and macro kernel scaling.
- Scope: S13 consolidated (central + local + social security) as the baseline for public‑facing comparisons. A “CENTRAL” view (État/LFI) is planned as a separate toggle.

See also: `api-points.md` (Eurostat — SDMX XML) for concrete flow and key examples.

Expenditure Mapping (COFOG × NA_ITEM)

- Each expenditure LEGO piece in `data/lego_pieces.json` has a mapping:
  - `mapping.cofog`: list of COFOG codes with weights (e.g., 09.1 for primary education).
  - `mapping.na_item`: list of ESA transaction categories with weights (e.g., D.1 wages, P.2 intermediate consumption, P.51g investment, D.62 social benefits, D.632 social transfers in kind).
  - `mapping.mission` (optional): administrative attribution to State missions (weights summing to 1.0). Used by the ADMIN lens.
- Computation (bucket distribution):
  - We collect all buckets (COFOG major × NA_ITEM) used by pieces, fetch each bucket once from `GOV_10A_EXP` via SDMX XML, then distribute the bucket’s total to pieces by normalized mapping weights (cofog weight × na_item weight). We sum across buckets per piece.
- Shares are computed across all expenditure pieces to aid visualization and distance‑to‑budget metrics.

Revenue Mapping (ESA NA_ITEM)

- Each revenue LEGO piece maps to ESA NA_ITEM codes in `mapping.esa` (e.g., D.211 for VAT, D.51_pit/D.51_cit split for PIT/CIT).
- We read SDMX XML:
  - `GOV_10A_TAXAG` for taxes and social contributions (D.211, D.51, D.29, D.59A, D.611/D.612/D.613, …).
  - `GOV_10A_MAIN` for sales/fees P.11/P.12.
- Splits applied in v0.1 (configurable via `data/revenue_splits.json`):
  - VAT D.211: standard vs reduced shares.
  - Income taxes D.51: PIT vs CIT shares.
  - Other production taxes D.29: wage tax, environment, fines, transfer taxes, remainder to generic D.29.
  - Property taxes D.59_prop maps to D.59A.
- Some series (e.g., D.4 public income, D.7 transfers received) are left at 0 until the proper flow/mapping is added to avoid double counting.
- `recettes_total_eur` is the sum of revenue piece amounts. Shares are not computed yet (can be added similar to expenditures).

Beneficiary Categories

- For pedagogical clarity, each piece has implicit beneficiary weights in the config:
  - `households` (e.g., D.62 social benefits, D.1 public wages as household income),
  - `enterprises` (e.g., D.3 subsidies, P.2 purchases),
  - `collective` (e.g., P.51g public investment and residual public services).
 - The beneficiary lens aggregates expenditure pieces using these weights to derive three categories (Households, Enterprises, Collective). This is a simplified attribution documented here to remain transparent.
 - Implementation: weights live under `beneficiaries: { households: x, enterprises: y, collective: z }` in `lego_pieces.json` and are normalized to 1.0 per piece. For pieces lacking explicit weights, a default heuristic can map ESA items to beneficiaries (e.g., D.62→households, D.3/P.2→enterprises, P.51g→collective). The final lens is a simple weighted sum across pieces.

Policy Levers → COFOG & Mission Attribution (V1)

- Each Policy Lever is defined with a fixed, pre-estimated impact (`fixed_impact_eur`) and rich metadata for multi-year trajectories and implementation risks.
  - `family`: high-level grouping (PENSIONS, TAXES, HEALTH, etc.).
  - `mission_mapping`: (Required) defines how the lever attributes to administrative missions.
  - `cofog_mapping`: defines how the lever attributes to COFOG masses (functional view).
  - `multi_year_impact`: explicit impact values per year (2026–2030) allowing for ramp-up or phase-out simulation.
  - `pushbacks`: structured risk notes describing legal, political, or social hurdles.
  - `feasibility`: tags `{ law: bool, adminLagMonths: int, notes: string }`.
  - `conflicts_with`: list of lever ids to guard double counting.
- Depending on the lens, a lever attributes its delta onto missions (ADMIN lens) or COFOG (functional lens). The engine handles multi-year trajectories by applying the `multi_year_impact` schedule to the relevant years in the horizon.
- Applying a lever produces a `PolicyEffect` with:
  - `delta_eur`: the accounting impact at horizon (or year-specific).
  - `multi_year_trajectory`: the path of deltas over the horizon.
  - `mass_attribution`: how the delta paints across the active lens.
  - `risk_notes`: derived from `pushbacks`.

Revenue Elasticities (v0.1)

- Simulating revenue changes with percentage deltas uses a simple elasticity parameter per piece:
  - In `lego_pieces.json`, `elasticity.value` indicates how a 1% “rate‑like” change translates into a % revenue change (e.g., VAT 1.0, PIT 0.9, CIT 0.8, excises 0.8–0.9). These are placeholders and documented here as such.
  - Mechanics: for a piece baseline amount R, a delta_pct of +x with elasticity e produces an accounting delta of −(x/100) × R × e in the deficit (higher revenue reduces deficit). Decreases invert the sign.
- Boundaries and more realistic behavioral responses can be added in future versions; we keep v0.1 conservative and explicit.

Locks & Bounds

- Some pieces may be locked by default (e.g., `debt_interest`) via `policy.locked_default: true` in the config to avoid unrealistic toggles for general users.
- Optional per‑piece bounds can be introduced (e.g., maximum ±% change for a “simple mode”).
 - Schema (example keys):
   - `policy`: { `locked_default`: boolean, `bounds_pct`: { `min`: number, `max`: number }, `bounds_amount_eur`?: { `min`: number, `max`: number } }
   - UI enforces these bounds and returns descriptive validation errors from the API when exceeded.
 - UI reflection: locks/bounds appear as badges on the Shelf and disable/limit the **BudgetDial** range.

Conflict & Overlap Checks (guardrails)

- Objective: avoid double counting when two levers modify the same base (e.g., remove a subsidy and also tax the same base change).
- Mechanism:
  - Declare `conflicts_with` at the lever level; the API validates sets on `runScenario` and emits descriptive errors/warnings.
  - The client shows a `ConflictNudge` linking to conflicting controls; users can override only when the engine supports explicit offsetting logic.

Uncertainty Bands & Assumption Chips

- Keep elasticities conservative; attach bands to lever families (e.g., procurement cancellations → risk notes; pensions indexation → fan bounds). Display assumption chips near each impact: “Multiplier 0.3–0.8”, “Compliance −0.1–0.3pp”.

From Mission Goals to Policy Mixes

- The Policy Workshop computes progress to a mission target by summing `specified_delta_eur` from applied levers mapped to that mission. The global **Resolution Meter** reports `overall_pct = sum(specified)/sum(target)` across missions, while the UI keeps unresolved missions visibly striped.

Distance‑to‑budget Metric

- Purpose: provide a single “distance” score between a user’s composition and the baseline to guide exploration and comparison.
- Definition (v0): combine an L1 share delta and a cosine similarity term over the expenditure share vector s (by piece) vs baseline b.
  - L1 term: `L1 = sum_i |s_i - b_i|`
  - Cosine term: `cos = 1 - (s·b)/(|s||b|)`
  - Score: `score = 0.5 * L1 + 0.5 * cos` (weights configurable). Exposed via `legoDistance.score` and returned as `distanceScore` in `runScenario`.
  - Notes: use shares over total expenditures for comparability; revenue‑only changes do not affect this score.

Limitations & Caveats

- Aggregation alignment: COFOG×NA_ITEM reflects a functional view that does not map line‑by‑line to national nomenclatures.
- Known Limitations:
  - Interest (D.41) not exposed in the above flows for our usage; we proxy from COFOG 01.7 TE (`GOV_10A_EXP`).
  - Public income (D.4) and transfers received (D.7) may require additional flows; currently left at 0 to avoid double counting.
  - If `time=YYYY` has no Obs for a series, we fall back to the last available observation.
- Elasticities: v0.1 uses simple constants for educational purposes. Future iterations can load ranges and show uncertainty bands.

Reproducibility

1) Define/adjust LEGO pieces and mappings in `data/lego_pieces.json`.
2) Warm the baseline snapshot for a given year (Makefile helpers):

   make warm-all YEAR=2026 COUNTRIES=FR,DE,IT

   or just the LEGO baseline:

   make warm-eurostat YEAR=2026

   (Under the hood: SDMX XML calls to `GOV_10A_EXP`, `GOV_10A_TAXAG`, and `GOV_10A_MAIN`. Env: `EUROSTAT_SDMX_BASE` and optional `EUROSTAT_COOKIE`.)

   *> Note: The 2026 baseline was manually updated on 2025-12-30 to reflect the official PLF/PLFSS 2026 figures, overriding the Eurostat warmer output until official statistics are available.*

3) Inspect outputs under `data/cache/lego_baseline_2026.json` including `depenses_total_eur`, `recettes_total_eur`, and per‑piece amounts; see `meta.warning` for any fallbacks/proxies.
   - When voted overlays are applied, inspect `meta.voted_2026_overlay.quality` for source-coverage, sentinel block checks, explicit residual adjustments, and double-count risk signals.
4) Query via GraphQL:

   query { legoBaseline(year: 2026) { year scope pib depensesTotal recettesTotal pieces { id type amountEur } } }

Consistency & Validation

- We target piece sums to match S13 totals within a small tolerance; the summary tool reports both values.
- Mapping weights are expected to sum to 1 per (COFOG major × NA_ITEM) bucket across pieces that reference it.
- Revenue splits are sourced from `data/revenue_splits.json` and can be audited alongside the baseline snapshot.
 - Lever attribution: sum of `mass_attribution` across masses equals the lever’s `delta_eur` (within tolerance); conflicts are rejected unless explicitly offset.
- Scenario engine outputs now include `baselineDeficitPath` / `baselineDebtPath` alongside their delta counterparts. The UI and analytics combine these to show absolute levels, while keeping deltas explicit for attribution exercises.

Versioning

- This document and the config are versioned in git; any change to mappings or elasticities should bump a minor version in `data/lego_pieces.json.version` and be noted in the changelog.
- Any manual edits (e.g., baseline override for adopted budgets) must be documented in `docs/CHANGELOG.md` and referenced in `DATA_MANIFEST.md`.
 - Add a `policy_catalog.version` and include it in share‑card permalinks to ensure reproducibility; invalidate OG caches when this changes.
