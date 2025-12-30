# Documentation

This folder contains the technical + functional documentation for **Citizen Budget Lab**.

If you prefer French navigation, start from **`TABLE_DES_MATIERES.md`**.

## Current docs (maintained)

- `PRODUCT_SPEC.md` - product vision and macro roadmap
- `DEVELOPER_GUIDE.md` - install/run, architecture notes, CI/CD pointers
- `DATA_MANIFEST.md` - data inventory + pipelines (warmers, dbt, seeds)
- `LEGO_METHOD.md` - budget decomposition model + macro/deficit logic
- `ADMIN_LENS.md` - "ADMIN / missions" lens: mappings, data, API behavior
- `REFACTOR_PLAN.md` - warehouse/dbt refactor log (living technical plan)

## Archives

Historical / obsolete documents live under `docs/archive/`.
See `docs/archive/README.md`.

## Editing rules

1. Prefer **linking** to canonical sources in the repo (e.g., `graphql/schema.sdl.graphql`) rather than duplicating long code blocks.
2. If you must include a snippet, keep it minimal and explain where the source of truth lives.
3. When updating baseline data manually (e.g., adopted PLF/PLFSS), record:
   - what changed,
   - which sources were used,
   - and the exact date,
   in `docs/CHANGELOG.md` + relevant sections of `DATA_MANIFEST.md`.
