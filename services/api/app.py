from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from .schema import schema


def create_app() -> FastAPI:
    app = FastAPI(title="Citizen Budget Lab API", version="0.1.0")

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
