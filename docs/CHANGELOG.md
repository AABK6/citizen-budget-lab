# Changelog (Docs + data-facing conventions)

This changelog records **documentation** and **data pipeline conventions** changes that impact reproducibility.

## 2025-12-30

- Clarified PLF 2026 "plafonds" pipeline:
  - dedicated warmer `warm_plf_2026_plafonds`,
  - `PLF_2026_PLAFONDS_URL` override,
  - deterministic fallback sample workbook for hermetic CI.
- Stopped duplicating full GraphQL SDL in `DEVELOPER_GUIDE.md`; canonical SDL lives in `graphql/schema.sdl.graphql`.
- Introduced `ADMIN_LENS.md` as the maintained documentation for the Missions (ADMIN) lens.
- Added archival conventions (`docs/archive/`).
- Applied conservative fiscal impact estimates for PLF/PLFSS 2026 amendment levers using `docs/French Budget Analyst Fiscal Impact.md`.
