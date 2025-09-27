# Administrative Lens Migration Plan

This document tracks the implementation work required to transition the `/build` workshop from COFOG majors to the administrative (mission/programme) lens.

## Phase 0 — Alignment (Complete via this document)

- [x] Confirm that the migration replaces COFOG masses with the administrative lens without exposing a runtime toggle.
- [x] Identify baseline data sources for mission-level aggregates (`state_budget_mission_*.csv`, PLF/PLR sidecars) and confirm they are available in the workspace.
- [x] Enumerate downstream consumers: LEGO baseline config, dbt warehouse models, GraphQL schema, builder UI, scenario engine resolution bookkeeping, policy catalog/intents, permalink compatibility, and automated tests.

## Phase 1 — Config & Warehouse Enhancements

- [ ] Extend `data/lego_pieces.json` to include mission identifiers and weights used to aggregate piece amounts by mission.
- [ ] Update `data/ux_labels.json` to surface administrative mission labels (code, display label, optional descriptions/examples).
- [ ] Add dbt staging columns for mission metadata (`stg_lego_pieces`, `stg_lego_baseline`) and propagate them into `dim_lego_pieces` / `fct_lego_baseline`.
- [ ] Provide automated checks ensuring piece mission weights sum to 1.0, potentially via dbt tests or Python validation.

## Phase 2 — API & GraphQL Updates

- [ ] Modify `services/api/data_loader.lego_pieces_with_baseline` to emit mission metadata alongside existing COFOG data.
- [ ] Introduce a `missionLabels` resolver in the GraphQL schema and update the SDL/runtime contract tests.
- [ ] Adjust the `buildPageQuery` to request mission information and update generated TypeScript definitions.
- [ ] Keep COFOG metadata available for other surfaces (`/explore`, macro kernel) while marking it secondary for `/build`.

## Phase 3 — Scenario Engine & Policy Content

- [ ] Add mission aggregation logic to the scenario engine (`run_scenario`) so resolution meters, ribbons, and pending calculations operate on mission IDs.
- [ ] Migrate policy levers (`services/api/policy_catalog.py`) and popular intents (`data/intents.json`) to reference mission codes.
- [ ] Ensure DSL targets use `mission.<code>` identifiers, adding compatibility to interpret legacy `cofog.*` targets when loading saved scenarios.
- [ ] Update relevant unit tests (`services/api/tests/test_workshop_api.py`, `test_lego.py`, scenario contract tests) to validate the mission lens.
- [ ] Prepare frontend components (`BuildPageClient`, treemap, panels) to consume mission data, while maintaining existing revenue workflows.

## Validation & Deployment Checklist (Phases 1–3)

- [ ] Regenerate affected dbt models and run `dbt test`.
- [ ] Execute backend pytest suites that cover LEGO and workshop functionality.
- [ ] Rebuild frontend GraphQL types and run targeted Storybook/Playwright snapshots if available.
- [ ] Verify share/permalink compatibility by loading scenarios created pre-migration.
- [ ] Confirm that the repo is clean and commits capture atomic milestones.

