LEGO Budget Methodology

Overview

This note documents how the LEGO “pieces” for expenditures and revenues are mapped to official aggregates, how beneficiary categories are derived, and how simple elasticities are used for revenue simulations in v0.1. It is intentionally transparent and conservative; parameters are versioned and easy to audit.

Datasets & Scope

- Expenditures: Eurostat SDMX 2.1 XML (dissemination) `GOV_10A_EXP` for General Government (S13). We aggregate by COFOG (functional classification) and ESA transaction type (NA_ITEM) using series keys:
  - `A.MIO_EUR.S13.GF{MAJOR}.{NA_ITEM}.{geo}` (e.g., GF07.D632.FR for citycare in‑kind transfers; GF10.D62.FR for social benefits).
- Revenues: Eurostat SDMX 2.1 XML with two flows:
  - Taxes & social contributions: `GOV_10A_TAXAG` via `A.MIO_EUR.S13.{NA_ITEM}.{geo}` (e.g., D211 VAT; D51 income taxes; D29 other production taxes; D59A recurrent property taxes; D611/D612/D613 contributions).
  - Sales & fees: `GOV_10A_MAIN` via `A.MIO_EUR.S13.{P11|P12}.{geo}`.
- Interest: ESA D.41 is not exposed in these flows for our usage; we proxy from COFOG 01.7 (Public debt transactions) total using `GOV_10A_EXP` series `A.MIO_EUR.S13.GF0107.TE.{geo}`.
- GDP: Local series (`data/gdp_series.csv`) used for informational ratios and macro kernel scaling.
- Scope: S13 consolidated (central + local + social security) as the baseline for public‑facing comparisons. A “CENTRAL” view (État/LFI) is planned as a separate toggle.

Expenditure Mapping (COFOG × NA_ITEM)

- Each expenditure LEGO piece in `data/lego_pieces.json` has a mapping:
  - `mapping.cofog`: list of COFOG codes with weights (e.g., 09.1 for primary education).
  - `mapping.na_item`: list of ESA transaction categories with weights (e.g., D.1 wages, P.2 intermediate consumption, P.51g investment, D.62 social benefits, D.632 social transfers in kind).
- Computation (bucket distribution):
  - We collect all buckets (COFOG major × NA_ITEM) used by pieces, fetch each bucket once from `GOV_10A_EXP` via SDMX XML, then distribute the bucket’s total to pieces by normalized mapping weights (cofog weight × na_item weight). We sum across buckets per piece.
- Shares are computed across all expenditure pieces to aid visualization and distance‑to‑budget metrics.

Revenue Mapping (ESA NA_ITEM)

- Each revenue LEGO piece maps to ESA NA_ITEM codes in `mapping.esa` (e.g., D.211 for VAT, D.51_pit/D.51_cit split for PIT/CIT).
- We read SDMX XML:
  - `GOV_10A_TAXAG` for taxes and social contributions (D.211, D.51, D.29, D.59A, D.611/D.612/D.613, …).
  - `GOV_10A_MAIN` for sales/fees P.11/P.12.
- Splits applied in v0.1 (documented constants):
  - VAT D.211: 70% standard vs 30% reduced.
  - Income taxes D.51: 60% PIT vs 40% CIT.
  - Other production taxes D.29: 14% wage tax, 10% environment, 2% fines, 24% transfer taxes, remainder to generic D.29.
  - Property taxes D.59_prop maps to D.59A.
- Some series (e.g., D.4 public income, D.7 transfers received) are left at 0 until the proper flow/mapping is added to avoid double counting.
- `recettes_total_eur` is the sum of revenue piece amounts. Shares are not computed yet (can be added similar to expenditures).

Beneficiary Categories

- For pedagogical clarity, each piece has implicit beneficiary weights in the config:
  - `households` (e.g., D.62 social benefits, D.1 public wages as household income),
  - `enterprises` (e.g., D.3 subsidies, P.2 purchases),
  - `collective` (e.g., P.51g public investment and residual public services).
- The beneficiary lens aggregates expenditure pieces using these weights to derive three categories (Households, Enterprises, Collective). This is a simplified attribution documented here to remain transparent.

Revenue Elasticities (v0.1)

- Simulating revenue changes with percentage deltas uses a simple elasticity parameter per piece:
  - In `lego_pieces.json`, `elasticity.value` indicates how a 1% “rate‑like” change translates into a % revenue change (e.g., VAT 1.0, PIT 0.9, CIT 0.8, excises 0.8–0.9). These are placeholders and documented here as such.
  - Mechanics: for a piece baseline amount R, a delta_pct of +x with elasticity e produces an accounting delta of −(x/100) × R × e in the deficit (higher revenue reduces deficit). Decreases invert the sign.
- Boundaries and more realistic behavioral responses can be added in future versions; we keep v0.1 conservative and explicit.

Locks & Bounds

- Some pieces may be locked by default (e.g., `debt_interest`) via `policy.locked_default: true` in the config to avoid unrealistic toggles for general users.
- Optional per‑piece bounds can be introduced (e.g., maximum ±% change for a “simple mode”).

Limitations & Caveats

- Aggregation alignment: COFOG×NA_ITEM reflects a functional view that does not map line‑by‑line to national nomenclatures.
- Data availability & proxies:
  - Some NA_ITEM codes (e.g., D.41) are not exposed in the flows we use; `debt_interest` is proxied from COFOG 01.7 TE.
  - Some revenue lines (e.g., D.4, D.7) may require additional flows and are currently left at 0.
  - For series with no Obs in the requested year, we fall back to the last available observation.
- Elasticities: v0.1 uses simple constants for educational purposes. Future iterations can load ranges and show uncertainty bands.

Reproducibility

1) Define/adjust LEGO pieces and mappings in `data/lego_pieces.json`.
2) Warm the baseline snapshot for a given year (Makefile helpers):

   make warm-all YEAR=2026 COUNTRIES=FR,DE,IT

   or just the LEGO baseline:

   make warm-eurostat YEAR=2026

   (Under the hood: SDMX XML calls to `GOV_10A_EXP`, `GOV_10A_TAXAG`, and `GOV_10A_MAIN`. Env: `EUROSTAT_SDMX_BASE` and optional `EUROSTAT_COOKIE`.)

3) Inspect outputs under `data/cache/lego_baseline_2026.json` including `depenses_total_eur`, `recettes_total_eur`, and per‑piece amounts; see `meta.warning` for any fallbacks/proxies.
4) Query via GraphQL:

   query { legoBaseline(year: 2026) { year scope pib depensesTotal recettesTotal pieces { id type amountEur } } }

Versioning

- This document and the config are versioned in git; any change to mappings or elasticities should bump a minor version in `data/lego_pieces.json.version` and be noted in the changelog.
