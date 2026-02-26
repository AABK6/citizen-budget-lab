# Changelog (Docs + data-facing conventions)

This changelog records **documentation** and **data pipeline conventions** changes that impact reproducibility.

## 2026-02-26

- **APU hardening P2/P3 implementation (bridge + strict pipeline):**
  - Added versioned bridge table `data/reference/cofog_bridge_apu_2026.csv` and made it mandatory in `tools/build_voted_2026_aggregates.py`.
  - Added closure validator `tools/validate_apu_closure.py` (subsector/mass/COFOG conservation + anti-double-count guards) with report output `data/outputs/validation_report_2026.json`.
  - `tools/build_voted_2026_aggregates.py` now emits and enforces closure validation (`status=ok`) as part of the build.
  - Hardened warmer strict mode in `services/api/cache_warm.py`:
    - `STRICT_OFFICIAL=1` now fails on SDMX temporal fallback,
    - `STRICT_OFFICIAL=1` now fails on D.41 proxy via COFOG 01.7.
  - Added snapshot strict guard in `tools/build_snapshot.py`:
    - with `STRICT_OFFICIAL=1`, snapshot build fails if validation report is missing or not `ok`.
  - Added `SNAPSHOT_FAST` alias in `services/api/settings.py`, mapped to existing static baseline toggles (`LEGO_BASELINE_STATIC`, `MACRO_BASELINE_STATIC`) to keep one prod snapshot path.
  - Added strict operational runbook: `docs/BASELINE_2026_STRICT_RUNBOOK.md`.

- **APU hardening P0/P1 enforcement (strict official mode):**
  - Added strict official checks to `tools/apply_voted_2026_to_lego_baseline.py`:
    - forbid macro deficit closure in strict mode,
    - forbid uncovered expenditure residuals in strict mode,
    - require explicit source-tagged expenditure targets for every displayed treemap mass.
  - Added CLI switches `--strict-official` / `--no-strict-official` (default controlled by `STRICT_OFFICIAL`, defaulting to strict).
  - Recorded strict mode in overlay metadata under `meta.voted_2026_overlay.strict_official`.

- **APU targets structure made explicit by pillar:**
  - Updated `tools/build_voted_2026_aggregates.py` so `apu_2026_targets.json` now includes:
    - flat `targets.expenditure` / `targets.revenue` (backward compatible),
    - explicit `pillars.state|social|local` sections with expenditure/revenue rows,
    - `summary.by_pillar` totals/row counts.
  - Enforced APUL verified artifact presence: build now fails if `apul_2026_verified.csv` is missing or empty.

- **APUL verification artifact transparency:**
  - Updated `tools/verify_apul_2026.py` report output to include:
    - UTC verification timestamp,
    - per-URL source fetch checks (status and HTTP code).

- **Pipeline defaults hardened:**
  - `make verify-apul-2026` now runs with `--strict-links`.
  - `make warm-voted-2026-baseline` now uses strict APUL link checks and applies overlay with `--strict-official`.

## 2026-02-25

- **LFI 2026 enacted mission credits (CP) re-baselined with dual-source verification:**
  - Added `tools/verify_lfi_2026_state_b.py` to enforce strict equality between:
    - JO promulgated law `JORFTEXT000053508155` (ÉTAT B mission CP),
    - Assemblée nationale annex raw table `PRJLANR5L17BTA0227.raw` (ÉTAT B mission CP).
  - Added auditable reference table `data/reference/lfi_2026_etat_b_cp_verified.csv` (32 missions, JO vs annex, line refs, match flag).
  - Added report `docs/verification_lfi2026_missions.md` (32/32 matches).
  - Regenerated `warehouse/seeds/plf_2026_plafonds.csv` from the verified enacted CP values (source now cites both official URLs).

- **PLF 2026 ceilings pipeline hardened (official sources):**
  - Updated `DEFAULT_PLF_2026_URL` to the official Article 48 LOLF PDF (`https://www.budget.gouv.fr/documentation/file-download/30420`).
  - Triple-checked official publication endpoints and content-types (`30420` PDF, `30423` XLS annexe indicateurs, `31621` XLS "dépenses selon destination").
  - Added resilient PLF PDF parsing fallback (text extraction of Tableau 1bis) when table extraction is noisy.
  - Aligned extracted PLF mission labels with existing mission code keys (AA/AB/.../RD) to preserve current simulation typology and repartition behavior.
  - Regenerated `warehouse/seeds/plf_2026_plafonds.csv` with the full official 2026 mission table (32 rows).
- **Baseline calibration:**
  - Updated `data/baseline_deficit_debt.csv` 2026 deficit to `-151350000000` (EUR), consistent with the LFI 2026 public deficit target of 5.0% and the existing 2026 GDP baseline.
- **Testing:**
  - Added regression coverage for PDF text fallback extraction in `services/api/tests/test_plf_warmers.py`.
- **LFI/LFSS voted 2026 full baseline overlay:**
  - Added `tools/verify_lfi_2026_state_a.py` and `data/reference/lfi_2026_etat_a_aggregates_verified.csv` for ÉTAT A aggregate verification (recettes/solde).
  - Added `tools/verify_lfss_2026.py` plus:
    - `data/reference/lfss_2026_branch_equilibre_verified.csv`,
    - `data/reference/lfss_2026_asso_pct_verified.csv`,
    - `docs/verification_lfss2026.md`.
  - Added `tools/build_voted_2026_aggregates.py` -> `data/reference/voted_2026_aggregates.json`.
  - Added `tools/apply_voted_2026_to_lego_baseline.py` with a default `true_level` mode that applies absolute voted levels on covered blocks (while preserving simulation typology and mappings); `share_rebalance` remains available for comparability-only runs.
  - Added strict post-checks in overlay metadata (`meta.voted_2026_overlay.post_checks`) to assert convergence/match to targeted official totals.
  - Added `make warm-voted-2026-baseline` (fail-fast, now invoking `--mode true_level`) and switched default build snapshot year to 2026 in API/CLI/frontend defaults.

## 2026-01-02

- **Policy Catalog Harmonization:**
    - **Schema Evolution:** Upgraded the `policy_levers` schema to include `mission_mapping` (required), `multi_year_impact`, and `pushbacks`.
    - **Administrative Alignment:** Systematically updated all levers in `data/policy_levers.yaml` to ensure direct mapping to PLF Missions, resolving the functional/administrative lens discrepancy in the Workshop mode.
    - **Rich Metadata:** Added multi-year fiscal trajectories (2026-2030) and implementation risk notes ("pushbacks") to reforms.
- **Frontend Enhancements:**
    - **Reform Details:** Updated the Reform Drawer/Sidebar to display implementation risks and multi-year trajectories.
    - **Stability:** Fixed a critical race condition in scenario loading where the UI would fetch a stale DSL before the new scenario ID was fully propagated.
- **Tooling:** 
    - **Snapshot Generator:** Updated `tools/build_snapshot.py` to include the new metadata in precomputed build page snapshots.
    - **Testing:** Introduced Vitest and React Testing Library to the frontend for component-level TDD.
- **Policy Catalog (YAML):** Moved the reform catalog to `data/policy_levers.yaml` (schema: `schemas/policy_levers.schema.json`) with admin editor save support and CLI validation.
- **Dual Mapping:** Added explicit `cofog_mapping` + `mission_mapping` to levers; GraphQL now exposes `cofogMapping` / `missionMapping` while `massMapping` remains a COFOG alias for legacy clients. Admin treemap uses mission mappings by default with COFOG fallback where needed.
- **Docs Alignment:** Updated `DATA_MANIFEST.md`, `LEGO_METHOD.md`, and `PRODUCT_SPEC.md` to reflect mission-first treemap semantics and YAML catalog sourcing.

## 2026-01-01

- **Architecture Overhaul (Postgres Consolidation):**
  - **Votes & Scenarios:** Migrated persistence to PostgreSQL (Cloud SQL). Both voter intent and scenario definitions (DSL) are now stored in relational tables (`votes`, `scenarios`) to enable advanced analytics.
  - **Firestore Removed:** Deprecated the hybrid Firestore/Postgres mode to simplify the stack and eliminate connection issues.
  - **Stability:** Fixed a critical bug in the backend DSN configuration that caused 30s timeouts on Cloud Run.

- **Narrative & UI:**
  - **Session Extraordinaire:** Updated landing page and tutorial to reflect the "Special Law" context of January 2026 (5.0% deficit drift).
  - **Macro Trajectory:** Replaced the abstract "Resolution Meter" with a concrete 4-year projection chart (Deficit & Real Growth) in the scoreboard.
  - **Baselines:** Calibrated 2026-2030 macro baselines (GDP, Deficit) to match official "drift" scenarios (Banque de France / Gov) and removed unrealistic recovery artifacts.

## 2025-12-30

- Clarified PLF 2026 "plafonds" pipeline:
  - dedicated warmer `warm_plf_2026_plafonds`,
  - `PLF_2026_PLAFONDS_URL` override,
  - deterministic fallback sample workbook for hermetic CI.
- Stopped duplicating full GraphQL SDL in `DEVELOPER_GUIDE.md`; canonical SDL lives in `graphql/schema.sdl.graphql`.
- Introduced `ADMIN_LENS.md` as the maintained documentation for the Missions (ADMIN) lens.
- Added archival conventions (`docs/archive/`).
- Applied conservative fiscal impact estimates for PLF/PLFSS 2026 amendment levers using `docs/French Budget Analyst Fiscal Impact.md`.
