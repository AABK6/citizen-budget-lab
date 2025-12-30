# Admin Lens Migration Plan (ARCHIVED)

> Archived on **2025-12-30**.
>
> Current documentation: `docs/ADMIN_LENS.md`
>
> This file is preserved for historical context (original plan / checklist).

## Context

We initially computed allocations by COFOG (functional classification) and planned a dedicated ADMIN lens to allocate by State missions/programmes.

## Phase 0 -- Data Model (Completed)

- [x] Extend LEGO pieces with a mission mapping (weights).
- [x] Ensure the GraphQL schema supports `LensEnum.ADMIN` and mission-level labels.
- [x] Ensure allocations payload can be requested by lens.

## Phase 1 -- Backend aggregation (Completed)

- [x] Implement mission aggregation from LEGO piece mission weights.
- [x] Expose `missionLabels` metadata in the API.
- [x] Ensure the builder payload supports ADMIN lens.

## Phase 2 -- Frontend integration (Completed / follow-ups possible)

- [x] Add lens toggle in the builder UI.
- [x] Ensure treemap + allocation panels use the selected lens.
- [ ] (Optional) Add QA tooling and provenance surfacing per mission.
