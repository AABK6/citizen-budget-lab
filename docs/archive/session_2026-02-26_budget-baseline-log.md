# Session Log — Baseline 2026/2027 and Treemap Methodology

Date: 2026-02-26  
Branch: `baseline-2027-snapshot-rollout`

## 1) User Questions and Requests (chronological recap)

This is the ordered recap of requests made during this chat session, condensed but exhaustive in intent:

1. Update baseline with the 2026 budget effectively voted by the Assemblée nationale.
2. Confirm branch context (`main`), ensure simulation is fully functional, fetch all data from official URLs and triple-check.
3. Keep APU scope (not only State budget), preserve current repartition keys, minimize code changes, work on a new branch.
4. Implement plan, then provide new value of each simulation block vs old one.
5. Investigate local crash/build issues and silent startup behavior.
6. Explain why local/testing values matched old production despite claimed data update.
7. Clarify hard-coded/snapshot behavior and whether reset/rebuild/regenerate is enough.
8. Clarify intended prod vs testing data pipeline (snapshot stability vs refresh capability).
9. Explain why voted 2026 data appeared equal to older proposal-based production values.
10. Validate whether enacted 2026 should differ from proposed 2026 and find why differences looked implausible.
11. Recheck all sources line-by-line using official docs/APIs; return absolutely verified voted 2026 values.
12. Extend robustness to all APU components beyond State: PLF, PLFSS, APUL-related effects.
13. Confirm whether build page source is Eurostat vs French budget docs; update all receipts/spending data needed.
14. Explain deficit level and mismatch vs public references; fix and recheck thoroughly.
15. Clarify why receipts were derived, and request direct voted ventilation by specific taxes when possible.
16. Reconcile discrepancy with official ~5% deficit mention; fix.
17. Give treemap diffs vs live website and commit changes.
18. Explain specific blocks (Education/Defense/Retraites) and full pipeline construction in simple terms.
19. Explain Eurostat vs COFOG vs voted parliamentary figures and why large differences happen.
20. Provide current and live values for Retraites; explain large (~50 MdEUR) gap.
21. Request explicit documentation + commit + methodology comparison with `main`.
22. Final instruction: document everything changed in this chat (including questions) and leave repo clean.

## 2) What Was Changed (code/data/docs)

The following workspace changes were made during this chat (tracked in current branch working tree and/or prior commits in this branch):

### 2.1 Verification and voted-data tooling

- Added official verification scripts:
  - `tools/verify_lfi_2026_state_b.py`
  - `tools/verify_lfi_2026_state_a.py`
  - `tools/verify_lfss_2026.py`
  - `tools/build_voted_2026_aggregates.py`
  - `tools/apply_voted_2026_to_lego_baseline.py`
- Added tests:
  - `tests/test_verify_lfi_2026_state_b.py`
  - `tests/test_verify_lfi_2026_state_a.py`
  - `tests/test_verify_lfss_2026.py`
  - `services/api/tests/test_plf_warmers.py` (PDF text fallback coverage)

### 2.2 Verified official reference datasets

- Added/generated reference files:
  - `data/reference/lfi_2026_etat_b_cp_verified.csv`
  - `data/reference/lfi_2026_etat_a_aggregates_verified.csv`
  - `data/reference/lfi_2026_etat_a_line_items_verified.csv`
  - `data/reference/lfss_2026_branch_equilibre_verified.csv`
  - `data/reference/lfss_2026_asso_pct_verified.csv`
  - `data/reference/voted_2026_aggregates.json`

### 2.3 Baseline and snapshot outputs

- Updated/added cache artifacts:
  - `data/cache/lego_baseline_2026.json` (+ meta updates)
  - `data/cache/build_page_2026.json` (+ meta updates)
  - `data/cache/lego_baseline_2027.json`
  - `data/cache/build_page_2027.json`
  - `data/cache/eu_cofog_shares_2027.json`

### 2.4 Pipeline and runtime behavior

- Make targets expanded for reproducible verification/build chain:
  - `Makefile` (`verify-lfi-2026`, `verify-lfi-2026-state-a`, `verify-lfss-2026`, `build-voted-2026-aggregates`, `warm-voted-2026-baseline`)
- Warmers hardened:
  - `services/api/cache_warm.py` (official PLF source update, robust PDF/XLS parsing fallback, additional baseline revenue handling)
- Build page data-source toggle added:
  - `frontend/app/build/BuildPageClient.tsx` (`NEXT_PUBLIC_BUILD_SNAPSHOT=0` forces live GraphQL instead of snapshot)
- Frontend/runtime config adjustments:
  - `frontend/next.config.js`
  - `frontend/next-env.d.ts`
  - `frontend/package.json`
  - `frontend/package-lock.json`

### 2.5 Warehouse/manifest alignment

- Updated dbt ingestion pattern and baseline staging:
  - `warehouse/dbt_project.yml`
  - `warehouse/models/staging/stg_lego_baseline.sql`

### 2.6 Documentation updates already performed

- `docs/CHANGELOG.md`
- `docs/DATA_MANIFEST.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/archive/treemap_diff_vs_live_2026.md`
- `docs/archive/verification_lfi2026_missions.md`
- `docs/archive/verification_lfi2026_state_a.md`
- `docs/archive/verification_lfss2026.md`

## 3) Key Investigations Performed During Chat

### 3.1 Build/source behavior

- Verified `/build` can be served from snapshot first (fast/stable) unless explicitly disabled.
- Confirmed this can mask live-data changes locally if snapshot is stale.

### 3.2 Local vs live treemap comparison

- Compared current branch values against `budget-citoyen.fr` GraphQL for year 2026.
- Confirmed large allocation differences across many masses, not only `M_PENSIONS`.

### 3.3 Retraites discrepancy (critical finding)

Observed values:
- Local branch (`M_PENSIONS`, 2026): `316,467,878,084 EUR`
- Live (`M_PENSIONS`, 2026): `366,695,000,000 EUR`
- Gap: `-50,227,121,916 EUR`

Investigation result:
- Local branch computes pensions with voted overlay anchors (notably LFSS `vieillesse` + mission `RB` in current mapping).
- Live value reflects prior baseline methodology with different classification/perimeter.
- Additional major pension-related voted perimeter (notably CAS pensions-scale amounts) is not aligned one-to-one in the same current block construction, creating a large apparent gap.

## 4) Methodology Difference vs `main`

Comparison target: `main` (commit `e1dbe17`) vs this branch work.

### 4.1 In `main` (baseline behavior)

- Core baseline is primarily Eurostat-driven for LEGO/APU.
- No full enacted 2026 voted overlay chain (LFI+LFSS verified bundle + true-level rebalance) integrated end-to-end.
- Build page snapshot behavior is simpler and less explicit in toggling live-vs-snapshot refresh during tests.

### 4.2 In this branch (current methodology)

- Added a full voted-data verification pipeline from official legal/assembly sources.
- Added consolidated voted bundle and overlay step to re-anchor baseline on enacted levels while preserving simulation typology keys.
- Added explicit build snapshot toggle for local/testing refresh workflow.
- Added stronger parser/warmer robustness and documentation of provenance.

### 4.3 Practical consequence

- Yes, there is a methodology difference vs `main`: this branch introduces an enacted-law overlay and verification workflow that does not exist in `main` in equivalent depth.
- Therefore treemap block values can diverge significantly from current production if production still runs the pre-overlay methodology/data snapshot.

## 5) Open Points Logged During Session

1. Pensions block reconciliation needs explicit perimeter policy (include/exclude CAS pensions component in same block, with documented rule).
2. Live production appears to use older snapshot/methodology for 2026 values.
3. Snapshot refresh process must be explicit in deployment checklist to avoid stale comparisons during QA.

## 6) End-of-Session Requirement

User requested:
- Full session documentation of asks + changes + methodology comparison.
- Clean repository state.

This file is created to satisfy that documentation requirement before final cleanup/commit.
