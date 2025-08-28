# Citizen Budget Lab — Web

Minimal Next.js frontend to exercise the GraphQL API.

Run

- Start the API:

  uvicorn services.api.app:app --reload

- In this folder, install deps and run dev server:

  npm install
  npm run dev

- Visit http://localhost:3000

Environment

- Configure GraphQL endpoint via `NEXT_PUBLIC_GRAPHQL_URL` (defaults to `http://localhost:8000/graphql`).

Pages

- `/` — links to features
- `/explore` — allocation by mission (CP), year input
- `/procurement` — top suppliers by department code
- `/what-if` — paste YAML, run scenario, see accounting/compliance/macro

