from services.api.app import create_app
from fastapi.testclient import TestClient


def test_cors_preflight_graphql_allows_localhost():
    app = create_app()
    client = TestClient(app)
    headers = {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    }
    r = client.options('/graphql', headers=headers)
    assert r.status_code in (200, 204)
    # FastAPI/Starlette should reflect the allowed origin
    assert r.headers.get('access-control-allow-origin') == 'http://localhost:3000'

