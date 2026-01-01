import json
import logging
import os
import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    # Simple in-memory metrics
    app.state.metrics = {"req_count": {}, "latency_sum_ms": {}}

    @app.middleware("http")
    async def _log_requests(request: Request, call_next):  # noqa: ANN001
        start = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
            return response
        finally:
            dur_ms = (time.perf_counter() - start) * 1000.0
            status = getattr(response, "status_code", None)
            logger.info("%s %s -> %s in %.1fms", request.method, request.url.path, status, dur_ms)
            try:
                path = str(request.url.path)
                mc = app.state.metrics["req_count"]
                ms = app.state.metrics["latency_sum_ms"]
                mc[path] = mc.get(path, 0) + 1
                ms[path] = ms.get(path, 0.0) + float(dur_ms)
            except Exception:
                pass

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

    @app.get("/build-snapshot")
    def build_snapshot(year: int = 2026) -> Response:
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
        path = os.path.join(data_dir, "cache", f"build_page_{year}.json")
        if not os.path.exists(path):
            return JSONResponse(status_code=404, content={"error": "snapshot not found"})
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        response = JSONResponse(content=payload)
        response.headers["Cache-Control"] = "public, max-age=300"
        return response

    def _policy_admin_allowed(req: Request) -> bool:
        token = settings.policy_catalog_admin_token
        if token and req.headers.get("x-admin-token") != token:
            return False
        return True

    @app.get("/admin/policy-catalog")
    def policy_catalog_yaml(request: Request) -> Response:
        if not _policy_admin_allowed(request):
            return Response(status_code=403)
        from . import policy_catalog as pol

        try:
            payload = pol.read_policy_catalog_text()
        except FileNotFoundError:
            return JSONResponse(status_code=404, content={"error": "policy catalog not found"})
        return Response(content=payload, media_type="text/yaml")

    @app.post("/admin/policy-catalog/validate")
    async def policy_catalog_validate(request: Request) -> Response:
        if not _policy_admin_allowed(request):
            return Response(status_code=403)
        try:
            payload = await request.json()
        except Exception:
            return JSONResponse(status_code=400, content={"ok": False, "errors": ["Invalid JSON body"]})
        yaml_text = payload.get("yaml") if isinstance(payload, dict) else None
        if not isinstance(yaml_text, str):
            return JSONResponse(status_code=400, content={"ok": False, "errors": ["Missing 'yaml' string"]})
        from . import policy_catalog as pol

        errors = pol.validate_policy_catalog_text(yaml_text)
        return JSONResponse(content={"ok": len(errors) == 0, "errors": errors})

    @app.put("/admin/policy-catalog")
    async def policy_catalog_save(request: Request) -> Response:
        if not _policy_admin_allowed(request):
            return Response(status_code=403)
        try:
            payload = await request.json()
        except Exception:
            return JSONResponse(status_code=400, content={"ok": False, "errors": ["Invalid JSON body"]})
        yaml_text = payload.get("yaml") if isinstance(payload, dict) else None
        if not isinstance(yaml_text, str):
            return JSONResponse(status_code=400, content={"ok": False, "errors": ["Missing 'yaml' string"]})
        from . import policy_catalog as pol

        errors = pol.validate_policy_catalog_text(yaml_text)
        if errors:
            return JSONResponse(status_code=400, content={"ok": False, "errors": errors})
        try:
            info = pol.write_policy_catalog_text(yaml_text)
        except Exception as exc:
            return JSONResponse(status_code=500, content={"ok": False, "errors": [str(exc)]})
        return JSONResponse(content={"ok": True, **info})

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

    @app.get("/metrics")
    def metrics() -> Response:
        lines: list[str] = []
        try:
            mc = app.state.metrics["req_count"]
            ms = app.state.metrics["latency_sum_ms"]
            for path, cnt in mc.items():
                lines.append(f"cbl_request_count{{path=\"{path}\"}} {int(cnt)}")
                if cnt > 0:
                    avg = (ms.get(path, 0.0) / float(cnt))
                    lines.append(f"cbl_request_latency_ms_avg{{path=\"{path}\"}} {avg:.3f}")
        except Exception:
            pass
        body = "\n".join(lines) + "\n"
        return Response(content=body, media_type="text/plain; version=0.0.4")

    @app.on_event("shutdown")
    def _shutdown() -> None:
        try:
            from .votes_store import close_vote_store

            close_vote_store()
        except Exception:
            pass

    return app


app = create_app()

# Run with: uvicorn services.api.app:app --reload
