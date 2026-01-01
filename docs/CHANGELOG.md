# Changelog (Docs + data-facing conventions)

This changelog records **documentation** and **data pipeline conventions** changes that impact reproducibility.

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
