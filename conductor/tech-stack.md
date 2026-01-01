# Tech Stack

## Frontend
*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, DSFR (Système de Design de l'État)
*   **Visualizations:** Recharts, Apache ECharts (for complex charts like Treemaps/Sankeys)
*   **API Client:** Apollo/GraphQL (via `graphql-codegen`)

## Backend
*   **Framework:** FastAPI (Asynchronous)
*   **Language:** Python 3.13+
*   **API Protocol:** GraphQL (Strawberry)
*   **Validation:** Pydantic v2
*   **Database/Storage:** DuckDB (for fast analytical queries), SQLAlchemy/PostgreSQL (for transactional data like votes)
*   **Testing:** Pytest, Pytest-asyncio

## Data Engineering
*   **Transformation:** dbt (Core)
*   **Data Format:** CSV, JSON, SDMX (Eurostat)
*   **Orchestration:** Makefile-based "warming" scripts

## Infrastructure & DevOps
*   **Containerization:** Docker, Docker Compose
*   **Cloud Provider:** Google Cloud Platform (GCP)
*   **Compute:** Cloud Run (Serverless)
*   **CI/CD:** GitHub Actions
