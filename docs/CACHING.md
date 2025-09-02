Data Caching & Warmers

Overview

- The API includes two complementary caching layers:
  - HTTP GET cache: transparent on-disk cache for upstream APIs (INSEE, Eurostat, data.gouv, geo.api.gouv). Configured via env and stored under `data/.http_cache`.
  - Dataset warmers: explicit CLI that fetches and writes normalized snapshots under `data/cache/` for essential budgets and comparisons so the app doesn’t need live calls at runtime.

HTTP cache (transparent)

- Enabled by default. Env vars:
  - `HTTP_CACHE_ENABLED=1|0`
  - `HTTP_CACHE_DIR=data/.http_cache`
  - `HTTP_CACHE_TTL_DEFAULT=86400`, `HTTP_CACHE_TTL_INSEE=21600`, `HTTP_CACHE_TTL_EUROSTAT=86400`, `HTTP_CACHE_TTL_DATAGOUV=86400`, `HTTP_CACHE_TTL_GEO=604800`
- Deletes: remove files under `data/.http_cache`.

Warmers (explicit prefetch)

- Run from repo root using Python 3.11+ (virtualenv recommended):

  1) PLF/LFI mission-level credits via Opendatasoft (MEFSIN):

     python -m services.api.cache_warm plf \
       --base https://data.economie.gouv.fr \
       --dataset plf25-depenses-2025-selon-destination \
       --year 2025

     Output: `data/cache/state_budget_mission_2025.csv` (schema: year, mission_code, mission_label, programme_code, programme_label, cp_eur, ae_eur).

  2) Eurostat COFOG shares per country/year:

     python -m services.api.cache_warm eurostat-cofog --year 2026 --countries FR,DE,IT,ES

     Output: `data/cache/eu_cofog_shares_2026.json` with shares by COFOG code.

  3) LEGO baseline (Eurostat SDMX XML):

     make warm-eurostat YEAR=2026

     or end-to-end with summary and EU shares:

     make warm-all YEAR=2026 COUNTRIES=FR,DE,IT

     Output: `data/cache/lego_baseline_2026.json` with totals and per-piece amounts; `meta.warning` documents any fallbacks/proxies (e.g., debt interest from COFOG 01.7).

  4) Policy catalog (lever definitions):

     python -m services.api.cache_warm policy-catalog \
       --out data/cache/policy_levers.json \
       --version 2025-09-01

     Output: `data/cache/policy_levers.json` with `{ version, levers: [...] }` used to power the Reform Library and feasibility/conflict tags. Include a version stamp for cache invalidation.

Integration options

- Use these snapshots directly in the API by pointing readers to `data/cache/` when files exist, or keep them as warm materialized views while continuing to rely on the HTTP cache for ad-hoc queries.
- For production, schedule these warmers in CI/cron (daily/weekly) and publish the artifacts, or bake them into a container image for deterministic runtime.

Tips

- ODS dataset ids vary by vintage. Keep a small map of `year → dataset id/fields` in deploy configs and pass via CLI flags.
- For larger warmers (DECP procurement), scope by year/region and aggregate server-side to keep outputs compact.
- Always record vintage and query parameters in filenames and/or sidecar JSON to ensure reproducibility.

Share card cache

- Purpose: accelerate OG/social previews and embeds for popular scenarios.
- Strategy: cache rendered Share Card images (SVG/PNG) keyed by `scenarioId` and method/policy versions.
- Invalidation: on any of (i) methods/version bump, (ii) `policy_catalog.version` change, or (iii) scenario mutation. Keep a small TTL for long‑tail scenarios.
