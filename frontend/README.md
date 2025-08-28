# Citizen Budget Lab — Frontend (MVP scaffold)

This is a minimal Next.js app to start implementing the MVP UI described in `BACKLOG.md` and `README_DEV.md`.

Prerequisites

- Node 18+
- API running at `http://localhost:8000/graphql` (see `README_DEV.md`)

Setup

- Copy `.env.local.example` to `.env.local` and adjust `NEXT_PUBLIC_GRAPHQL_URL` if needed.
- Install deps and run dev server:

  npm install
  npm run dev

Structure

- `app/` — App Router pages for Explore, Procurement, What‑if, Compare EU, Sources
- `components/` — Basic UI elements (tabs, table, inputs)
- `lib/graphql.ts` — Thin GraphQL fetcher using `fetch`
- `lib/i18n.tsx` — Minimal i18n context (EN/FR stub)

Next steps (Backlog alignment)

- Charts for Explore (sunburst/treemap) and cross‑lens toggle
- Map + filters for Procurement (MapLibre/Leaflet)
- Scenario builder UI and runScenario wiring
- EU compare charts and country selector
- Full i18n, a11y checks, tests (unit + e2e)

