from fastapi import FastAPI
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

    graphql_app = GraphQLRouter(schema)
    app.include_router(graphql_app, prefix="/graphql")

    @app.get("/")
    def root():
        return {"status": "ok", "message": "Citizen Budget Lab API. Visit /graphql"}

    @app.get("/health")
    def health():
        return {"status": "healthy"}

    return app


app = create_app()

# Run with: uvicorn services.api.app:app --reload
