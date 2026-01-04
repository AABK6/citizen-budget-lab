# Implementation Plan: Revenue Drawer Alignment & Reform Cards

## Phase 1: Data Infrastructure & Research Pipeline [checkpoint: 82b3550]
- [x] Task: Audit `data/policy_levers.yaml` and `data/lego_pieces.json` to identify current revenue reforms and categories.
- [x] Task: Adapt `tools/research_policy.py` to handle revenue-specific search queries and data structures. [commit: 9600830]
- [x] Task: Execute the research pipeline for all revenue reforms to gather metadata, vigilance points, and source links. [commit: 342b02a]
- [x] Task: Update `data/policy_levers.yaml` with the newly researched metadata. [commit: 342b02a]
- [x] Task: Map revenue reforms to their parent categories in `data/lego_pieces.json` or `data/policy_levers.yaml` (using `target_revenue_category_id`). [commit: 342b02a]
- [x] Task: Refine `tools/research_policy.py` to support single-lever enrichment. [commit: 376052e]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Data Infrastructure & Research Pipeline' (Protocol in workflow.md) [checkpoint: 82b3550]

## Phase 2: Backend & API Enhancements
- [ ] Task: Verify GraphQL schema (`graphql/schema.sdl.graphql`) supports the new revenue reform metadata fields.
- [ ] Task: Update FastAPI resolvers in `services/api/` to ensure revenue reforms include the linked category information and rich metadata.
- [ ] Task: Write unit tests in `tests/` to verify the "Mesures disponibles" logic for revenues.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend & API Enhancements' (Protocol in workflow.md)

## Phase 3: Frontend UI/UX Alignment
- [ ] Task: Regenerate GraphQL types in the frontend (`npm run codegen`).
- [ ] Task: Update the Revenue Drawer component to use the same "Card" styling as the Expenses Drawer.
- [ ] Task: Implement the "Mesures disponibles" section in the Revenue Drawer, ensuring it correctly filters reforms based on the selected category.
- [ ] Task: Harmonize animations and toggle behaviors (Add/Remove) between both drawers.
- [ ] Task: Conduct a visual audit to ensure DSFR compliance and strict parity with the Expenses UI.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend UI/UX Alignment' (Protocol in workflow.md)

## Phase 4: Verification & Finalization
- [ ] Task: Run full end-to-end check: Select a revenue category -> View reforms -> Toggle reform -> Verify impact in summary charts.
- [ ] Task: Run project linting and type-checking (`npm run lint`, `tsc`, etc.).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification & Finalization' (Protocol in workflow.md)
