Secrets & Environment Variables

Overview

- The API clients use environment variables for credentials and configuration. Do not commit secrets to the repo. Use a `.env` file locally (git‑ignored) and GitHub Actions secrets in CI.

Required

- INSEE (Sirene & BDM):
  - `INSEE_CLIENT_ID` — your OAuth client ID (a.k.a. Consumer Key)
  - `INSEE_CLIENT_SECRET` — your OAuth client secret

Optional

- Eurostat REST cookie:
  - `EUROSTAT_COOKIE` — some Eurostat endpoints may require a cookie; copy from a browser session if you encounter 404/403 and set it here for the cache warmer and resolvers.
- HTTP cache configuration (defaults work out of the box):
  - `HTTP_CACHE_ENABLED`, `HTTP_CACHE_DIR`, `HTTP_CACHE_TTL_*`

Local setup

1) Copy `.env.example` to `.env` and fill in values:

   cp .env.example .env
   # edit .env and add INSEE keys

2) Alternatively, export per‑session (PowerShell):

   $env:INSEE_CLIENT_ID = "<your id>"
   $env:INSEE_CLIENT_SECRET = "<your secret>"

GitHub Actions (CI)

- Add repository secrets so workflows can access INSEE:
  1. Settings → Secrets and variables → Actions → New repository secret
  2. Create `INSEE_CLIENT_ID` and `INSEE_CLIENT_SECRET` with your values
  3. The workflow `.github/workflows/insee_smoke.yml` already references these secrets.

Notes

- Access tokens are short‑lived; the code requests tokens on demand using client credentials. Do not store access tokens in `.env`.
- `.env` and `.env.*` files are git‑ignored in this repo.

