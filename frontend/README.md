# Citizen Budget Lab — Frontend (MVP scaffold)

This app uses the official French Government Design System (DSFR) for styling (fonts, colors, components) to align with impots.gouv.fr and economie.gouv.fr.

Prerequisites

- Node 18+
- API running at `http://localhost:8000/graphql` (see `README_DEV.md`)

Setup

- Copy `.env.local.example` to `.env.local` and adjust `NEXT_PUBLIC_GRAPHQL_URL` if needed.
- Install deps and run dev server:

  npm install
  npm run dev

The UI supports light/dark themes. Use the theme button in the header; preference is stored locally and reflected via `data-fr-theme`.

Structure

- `app/` — App Router pages for Explore, Procurement, What‑if, Compare EU, Sources
- `components/` — UI elements using DSFR classes (nav, table, inputs, theme toggle)
- `lib/graphql.ts` — Thin GraphQL fetcher using `fetch`
- `lib/i18n.tsx` — Minimal i18n context (EN/FR stub)

Next steps (Backlog alignment)

- Charts for Explore (sunburst/treemap) and cross‑lens toggle
- Map + filters for Procurement (MapLibre/Leaflet)
- Scenario builder UI and runScenario wiring
- EU compare charts and country selector
- Full i18n, a11y checks, tests (unit + e2e)
- Optional: replace custom wrappers with `@gouvfr/dsfr-react` for richer components.

Testing

- Accessibility (axe): with the dev server running on :3000, run:

  npm run test:a11y

- Smoke (fetch): with the dev server running, run:

  npm run test:smoke
