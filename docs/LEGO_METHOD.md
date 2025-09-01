LEGO Budget Methodology

Overview

This note documents how the LEGO “pieces” for expenditures and revenues are mapped to official aggregates, how beneficiary categories are derived, and how simple elasticities are used for revenue simulations in v0.1. It is intentionally transparent and conservative; parameters are versioned and easy to audit.

Datasets & Scope

- Expenditures: Eurostat SDMX‑JSON `gov_10a_exp` (General Government, S13), filtered to `unit = MIO_EUR`, `time = YYYY`, `geo = FR`. We aggregate by COFOG (functional classification) and ESA transaction type (na_item) using official dimensions exposed by Eurostat.
- Revenues: Eurostat SDMX‑JSON `gov_10a_main` (revenue aggregates by ESA na_item) with the same filters when available.
- GDP: Local series (`data/gdp_series.csv`) used for informational ratios and macro kernel scaling.
- Scope: S13 consolidated (central + local + social security) as the baseline for public‑facing comparisons. A “CENTRAL” view (État/LFI) is planned as a separate toggle.

Expenditure Mapping (COFOG × na_item)

- Each expenditure LEGO piece in `data/lego_pieces.json` has a mapping:
  - `mapping.cofog`: list of COFOG codes with weights that sum to 1.0 (e.g., 09.1 for primary education).
  - `mapping.na_item`: list of ESA transaction categories with weights (e.g., D.1 wages, P.2 intermediate consumption, P.51g investment, D.62 social benefits).
- The warmer computes the piece amount as:
  - amount(piece) = Σ_{cofog} Σ_{na_item} weight(cofog) × weight(na_item) × value(geo, time, unit, sector=S13, cofog99, na_item).
- Shares are computed across all expenditure pieces to aid visualization and distance‑to‑budget metrics.

Revenue Mapping (ESA na_item)

- Each revenue LEGO piece maps to ESA na_item codes in `mapping.esa` (e.g., D.211 for VAT, D.51_pit/D.51_cit split for PIT/CIT per config).
- The warmer reads `gov_10a_main` and sums values for the specified na_item codes (with weights when necessary) to produce `amount_eur` per revenue piece.
- `recettes_total_eur` in the baseline snapshot is the sum of these amounts. Shares are not computed in v0.1 but can be added similarly to expenditures later.

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

- Aggregation alignment: COFOG×na_item values in Eurostat reflect a functional view that does not map line‑by‑line to national nomenclatures (missions/programmes). This is by design for comparability; drill‑down to national lines remains possible in parallel UI.
- Data availability: `gov_10a_main` (revenues) may not expose every breakdown by na_item for all years/countries identically; the warmer is robust and annotates warnings in the snapshot.
- Elasticities: v0.1 uses simple constants for educational purposes. Future iterations can load ranges and show uncertainty bands.

Reproducibility

1) Define/adjust LEGO pieces and mappings in `data/lego_pieces.json`.
2) Warm the baseline snapshot for a given year:

   python -m services.api.cache_warm lego --year 2026

3) Inspect outputs under `data/cache/lego_baseline_2026.json` including `depenses_total_eur`, `recettes_total_eur`, and per‑piece amounts.
4) Query via GraphQL:

   query { legoBaseline(year: 2026) { year scope pib depensesTotal recettesTotal pieces { id type amountEur } } }

Versioning

- This document and the config are versioned in git; any change to mappings or elasticities should bump a minor version in `data/lego_pieces.json.version` and be noted in the changelog.

