# Citizen Budget Lab

**Citizen Budget Lab** is an interactive web application designed to democratize understanding of the French state budget. It aggregates public finance data, allowing users to explore spending and revenue, simulate budget scenarios ("what-if"), and visualize macroeconomic impacts.

## Project Structure

*   **`frontend/`**: Next.js application (TypeScript, React) for the user interface.
*   **`services/api/`**: Python FastAPI backend serving GraphQL endpoints. Handles data fetching, caching, and simulation logic.
*   **`warehouse/`**: dbt project (using DuckDB) that transforms raw data into semantic models for the API.
*   **`data/`**: Stores raw data snapshots, cache files, and configuration mappings (e.g., COFOG, LEGO pieces).
*   **`docs/`**: Detailed documentation including product specs, developer guides, and methodology notes.

## Quick Start

### 1. Prerequisites
*   Python 3.13+
*   Node.js 18+
*   Docker & Docker Compose (optional but recommended)
*   `dbt` (if working on the data warehouse)

### 2. Data "Warming" (Required First Step)
Before running the app, you must fetch the baseline data (Eurostat, PLF, etc.).
```bash
# Fetches data for the default simulation year (2026)
make warm-all YEAR=2026 COUNTRIES=FR,DE,IT
```

### 3. Running Locally (No Docker)

**Backend:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/api/requirements.txt
# Start the API on http://localhost:8000
uvicorn services.api.app:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
# Start the UI on http://localhost:3000
npm run dev
```

### 4. Running with Docker
```bash
docker compose up --build
```

## Key Commands & Workflows

*   **`make help`**: List all available Makefile commands.
*   **`make warm-eurostat`**: Fetch only Eurostat data (subset of `warm-all`).
*   **`make dbt-build`**: Run the dbt transformation pipeline (requires `dbt-install` first).
*   **`npm run codegen` (in `frontend/`)**: Regenerate GraphQL types from the schema.

## Development Context

*   **Documentation:** Always check `docs/` for deep dives.
    *   `docs/DEVELOPER_GUIDE.md`: Detailed setup, architecture, and CI/CD info.
    *   `docs/PRODUCT_SPEC.md`: Functional requirements and vision.
    *   `docs/LEGO_METHOD.md`: Explanation of the budget simulation methodology.
*   **Schema:** The canonical GraphQL schema is at `graphql/schema.sdl.graphql`.
*   **Environment:** Copy `.env.example` to `.env` to configure secrets (e.g., INSEE API keys).

## Conventions

*   **Data Integrity:** The project relies on a "warmer" pattern. Data is fetched, normalized, and cached on disk (`data/cache`) or in the warehouse (`data/warehouse.duckdb`).
*   **Simulation Logic:** The "LEGO" methodology decomposes the budget into functional blocks. Logic for these blocks is defined in `services/api/baselines.py` and `data/lego_pieces.json`.
*   **Testing:**
    *   Backend: `pytest`
    *   Frontend: `axe` accessibility checks in CI.
    *   Warehouse: `dbt test`
