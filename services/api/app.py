import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from .schema import schema
from .settings import get_settings


def create_app() -> FastAPI:
    app = FastAPI(title="Citizen Budget Lab API", version="0.1.0")

    # CORS for local frontend dev (configurable via env CORS_ALLOW_ORIGINS)
    settings = get_settings()
    origins_raw = (settings.cors_allow_origins or "http://localhost:3000,http://127.0.0.1:3000").split(",")
    origins = [o.strip() for o in origins_raw if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Logging setup
    logging.basicConfig(level=getattr(logging, (settings.log_level or 'INFO').upper(), logging.INFO))
    logger = logging.getLogger("cbl-api")

    # Sentry (optional)
    if settings.sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.0)
            logger.info("Sentry initialized")
        except Exception as e:  # pragma: no cover
            logger.warning("Sentry init failed: %s", e)

    # Request logging middleware
    @app.middleware("http")
    async def _log_requests(request: Request, call_next):  # noqa: ANN001
        start = time.perf_counter()
        try:
            response = await call_next(request)
            return response
        finally:
            dur_ms = (time.perf_counter() - start) * 1000.0
            logger.info("%s %s -> %s in %.1fms", request.method, request.url.path, getattr(request, 'state', {}), dur_ms)

    graphql_app = GraphQLRouter(schema)
    app.include_router(graphql_app, prefix="/graphql")

    @app.get("/")
    def root():
        return {"status": "ok", "message": "Citizen Budget Lab API. Visit /graphql"}

    @app.get("/health")
    def health():
        # Include warehouse readiness info without failing the overall health
        try:
            from .warehouse_client import warehouse_status  # lazy import to avoid duckdb import at app import time
            wh = warehouse_status()
        except Exception:  # pragma: no cover
            wh = {"enabled": False, "available": False, "ready": False, "missing": []}
        return {"status": "healthy", "warehouse": wh}

    @app.get("/health/full")
    def health_full():
        # Warehouse status + row counts + dbt version if available
        try:
            from .warehouse_client import warehouse_status, table_counts  # lazy import
            wh = warehouse_status()
            counts = table_counts([
                "stg_state_budget_lines",
                "fct_admin_by_mission",
                "fct_admin_by_cofog",
                "vw_procurement_contracts",
                "fct_procurement_suppliers",
            ])
        except Exception:  # pragma: no cover
            wh = {"enabled": False, "available": False, "ready": False, "missing": []}
            counts = {}

        dbt_ver = None
        try:  # Prefer Python package
            import dbt

            dbt_ver = getattr(dbt, "__version__", None)
        except Exception:
            dbt_ver = None

        return {
            "status": "healthy",
            "warehouse": wh,
            "rows": counts,
            "dbt": {"version": dbt_ver},
        }

    return app


app = create_app()

# Run with: uvicorn services.api.app:app --reload
