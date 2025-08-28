from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .settings import get_settings


_settings = get_settings()


def _client() -> httpx.Client:
    return httpx.Client(timeout=_settings.http_timeout)


@retry(wait=wait_exponential(multiplier=0.5, min=0.5, max=5), stop=stop_after_attempt(_settings.http_retries))
def get(url: str, headers: dict | None = None, params: dict | None = None) -> httpx.Response:
    with _client() as c:
        resp = c.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return resp


@retry(wait=wait_exponential(multiplier=0.5, min=0.5, max=5), stop=stop_after_attempt(_settings.http_retries))
def post(url: str, headers: dict | None = None, data: dict | None = None, auth: tuple[str, str] | None = None) -> httpx.Response:
    with _client() as c:
        resp = c.post(url, headers=headers, data=data, auth=auth)
        resp.raise_for_status()
        return resp

