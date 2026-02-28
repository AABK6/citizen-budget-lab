# Live Vote Pipeline Suite (`budget-citoyen.fr`)

Suite exécutable pour valider en production le pipeline `build`:
- Frontend UI (Playwright) -> `/api/graphql`
- GraphQL runtime (`runScenario`, `submitVote`, `voteSummary`, `scenario`)
- Persistance Cloud SQL (`votes`, `vote_stats`, `scenarios`)
- Logs Cloud Run (warnings/erreurs `submitVote`)
- Charge en paliers (`5/20/50 VU` par défaut)

## 1) Prérequis

- Python 3.11+ avec dépendances API (`psycopg`, `httpx`) disponibles.
- Accès réseau aux endpoints prod.
- `gcloud` authentifié (pour checks logs Cloud Run).
- DSN lecture seule Cloud SQL pour votes:
  - `LIVE_TESTS_VOTES_DSN` (recommandé), ou
  - `VOTES_DB_DSN`.

Prérequis UI Playwright:
- `node` + `npm`.
- Installer Playwright (si absent):
  - `npm install -D playwright`
  - `npx playwright install chromium`

## 2) Exécution rapide (full suite)

```bash
export LIVE_TESTS_VOTES_DSN='postgresql://...'
python tools/live_tests/run_live_pipeline_suite.py
```

Sorties:
- `output/live-tests/<run_id>/report.json`
- `output/live-tests/<run_id>/sql_checks.json`
- `output/live-tests/<run_id>/logs_checks.json`
- `output/live-tests/<run_id>/load_checks.json`
- captures UI: `output/playwright/<run_id>/`

## 3) Exécution par phases

Sans UI:
```bash
python tools/live_tests/run_live_pipeline_suite.py --skip-ui
```

Sans charge:
```bash
python tools/live_tests/run_live_pipeline_suite.py --skip-load
```

Sans SQL/logs (mode externe uniquement):
```bash
python tools/live_tests/run_live_pipeline_suite.py --skip-sql --skip-logs
```

## 4) Paramètres importants

- `--run-id`: identifiant de campagne.
- `--respondent-prefix`: préfixe de tagging des votes test.
- `--load-stages`: format `VUxSECONDS,...` (ex: `5x120,20x180,50x300`).
- `--load-success-threshold`: défaut `0.995`.
- `--votes-dsn`: override DSN SQL read-only.
- `--gcp-project`, `--gcp-region`, `--gcp-service`: ciblage logs Cloud Run.
- `--ui-headed`: exécution Playwright non headless.

## 5) Scripts unitaires disponibles

Contrat + smoke GraphQL:
```bash
python tools/live_tests/live_graphql.py --graphql-url https://budget-citoyen.fr/api/graphql
```

Assertions SQL forensiques:
```bash
python tools/live_tests/live_sql_assertions.py \
  --respondent-prefix LIVE_E2E_20260227T120000Z_ \
  --scenario-id <scenario_id> \
  --dsn "$LIVE_TESTS_VOTES_DSN"
```

Assertions logs Cloud Run:
```bash
python tools/live_tests/live_log_assertions.py \
  --project reviewflow-nrciu \
  --service citizen-budget-api \
  --region europe-west1 \
  --start-iso 2026-02-27T10:00:00Z
```

Charge isolée `submitVote`:
```bash
python tools/live_tests/load_submit_vote.py \
  --graphql-url https://budget-citoyen.fr/api/graphql \
  --scenario-id <scenario_id> \
  --respondent-prefix LIVE_E2E_20260227T120000Z_ \
  --stages 5x120,20x180,50x300
```

UI Playwright isolé:
```bash
node tools/live_tests/ui_vote_capture.mjs \
  --base-url https://budget-citoyen.fr \
  --respondent-prefix LIVE_E2E_20260227T120000Z_ \
  --output output/live-tests/manual/ui_checks.json \
  --artifact-dir output/playwright/manual
```

## 6) Parcours utilisateur visibles + dump SQL exact

Runner complet (5 parcours humains, mode visible, videos/screenshots, dump SQL detaille):
```bash
export LIVE_TESTS_VOTES_DSN='postgresql://...'
python tools/live_tests/run_live_human_pipeline_audit.py \
  --journey-count 5 \
  --ui-headed
```

Sorties:
- `output/live-tests/<run_id>/report_human_pipeline.json`
- `output/live-tests/<run_id>/human_ui_checks.json`
- `output/live-tests/<run_id>/sql_write_dump.json`
- `output/live-tests/<run_id>/logs_checks.json`
- videos/screenshots: `output/playwright/<run_id>/human/`

UI humain isole:
```bash
node tools/live_tests/ui_human_journey_capture.mjs \
  --base-url https://budget-citoyen.fr \
  --run-id LIVE_HUMAN_MANUAL \
  --respondent-prefix LIVE_HUMAN_MANUAL_ \
  --journey-count 5 \
  --headed \
  --output output/live-tests/manual/human_ui_checks.json \
  --artifact-dir output/playwright/manual/human/screens \
  --video-dir output/playwright/manual/human/videos
```

Dump SQL exact isole:
```bash
python tools/live_tests/live_sql_write_dump.py \
  --dsn "$LIVE_TESTS_VOTES_DSN" \
  --respondent-prefix LIVE_HUMAN_MANUAL_ \
  --output output/live-tests/manual/sql_write_dump.json
```
