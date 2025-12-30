# ADMIN lens (State missions / "vue administrative")

The app supports multiple allocation lenses (functional vs administrative). In GraphQL this is exposed via `LensEnum` (ADMIN / COFOG / BENEFICIARY).

This document focuses on the ADMIN lens: allocations by State missions.

## 1) Data model

### 1.1 LEGO pieces -> missions

In `data/lego_pieces.json`, expenditure pieces can optionally carry a mission attribution under:

- `mapping.mission`: a dictionary `{ "<MISSION_CODE>": <weight> }` where weights sum to 1.0

This enables the server to compute mission allocations for a given year/basis by distributing each piece's baseline across missions.

### 1.2 Policy levers -> missions (optional)

Policy levers can carry a mission attribution separately from their COFOG attribution:

- `missionMapping` (JSON) for ADMIN lens attribution
- `massMapping` (JSON) for COFOG / functional attribution

The active lens determines which mapping is used for allocation displays.

## 2) API surface (GraphQL)

Canonical SDL is `graphql/schema.sdl.graphql`.

Key entry points:

- `allocation(year, basis, lens=ADMIN)` returns an `Allocation` with `lens` and `items`.
- `builderMasses(year, basis, lens, scope)` is the main treemap payload and supports multiple lenses.
- `missionLabels` provides label/description metadata for mission codes.

## 3) Operational notes

- When the warehouse is enabled (`WAREHOUSE_ENABLED=1`), allocations/baselines prefer dbt models.
- When it is disabled, the API falls back to warmed snapshots + static configuration files.

## 4) History

The original implementation plan is archived at `docs/archive/admin_lens_migration.md`.
