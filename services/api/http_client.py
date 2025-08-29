from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .settings import get_settings


_settings = get_settings()


def _client() -> httpx.Client:
    return httpx.Client(timeout=_settings.http_timeout)


# -----------------------------
# Simple disk-backed JSON cache
# -----------------------------

@dataclass
class _CachedResponse:
    status_code: int
    _payload: Any

    def json(self) -> Any:  # mimic httpx.Response
        return self._payload

    def raise_for_status(self) -> None:
        # Only raise on non-2xx
        if not (200 <= self.status_code < 300):
            raise httpx.HTTPStatusError("Cached non-2xx response", request=None, response=None)


def _cache_enabled() -> bool:
    return str(os.getenv("HTTP_CACHE_ENABLED", "1")) not in ("0", "false", "False")


def _cache_dir() -> str:
    d = os.getenv("HTTP_CACHE_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", ".http_cache")))
    os.makedirs(d, exist_ok=True)
    return d


def _ttl_for_url(url: str) -> int:
    # Defaults can be overridden via env
    default_ttl = int(os.getenv("HTTP_CACHE_TTL_DEFAULT", "86400"))  # 1 day
    if "api.insee.fr" in url:
        return int(os.getenv("HTTP_CACHE_TTL_INSEE", "21600"))  # 6h
    if "eurostat" in url or "ec.europa.eu" in url:
        return int(os.getenv("HTTP_CACHE_TTL_EUROSTAT", "86400"))
    if "data.gouv.fr" in url:
        return int(os.getenv("HTTP_CACHE_TTL_DATAGOUV", "86400"))
    if "geo.api.gouv.fr" in url:
        return int(os.getenv("HTTP_CACHE_TTL_GEO", "604800"))  # 7d
    return default_ttl


def _cache_key(url: str, params: Dict[str, Any] | None) -> str:
    # Normalize params into a deterministic string; ignore auth headers at caller
    q = "&".join(
        f"{k}={params[k]}" for k in sorted(params.keys())
    ) if params else ""
    h = hashlib.sha256(f"{url}?{q}".encode("utf-8")).hexdigest()
    return h


def _read_cache(url: str, params: Dict[str, Any] | None) -> _CachedResponse | None:
    if not _cache_enabled():
        return None
    key = _cache_key(url, params)
    path = os.path.join(_cache_dir(), f"{key}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            obj = json.load(f)
        ts = float(obj.get("ts", 0))
        ttl = _ttl_for_url(url)
        if time.time() - ts > ttl:
            return None
        return _CachedResponse(status_code=int(obj.get("status_code", 200)), _payload=obj.get("data"))
    except Exception:
        return None


def _write_cache(url: str, params: Dict[str, Any] | None, status_code: int, payload: Any) -> None:
    if not _cache_enabled():
        return
    key = _cache_key(url, params)
    path = os.path.join(_cache_dir(), f"{key}.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"ts": time.time(), "status_code": status_code, "data": payload}, f)
    except Exception:
        # Best-effort cache; ignore failures
        return


@retry(wait=wait_exponential(multiplier=0.5, min=0.5, max=5), stop=stop_after_attempt(_settings.http_retries))
def get(url: str, headers: dict | None = None, params: dict | None = None, *, force_refresh: bool = False) -> httpx.Response | _CachedResponse:
    # Ignore Authorization header in cache key (tokens vary); only URL+params are used
    if not force_refresh:
        cached = _read_cache(url, params)
        if cached is not None:
            return cached
    with _client() as c:
        resp = c.get(url, headers=headers, params=params)
        resp.raise_for_status()
        # Cache JSON payloads
        try:
            payload = resp.json()
            _write_cache(url, params, resp.status_code, payload)
        except Exception:
            pass
        return resp


@retry(wait=wait_exponential(multiplier=0.5, min=0.5, max=5), stop=stop_after_attempt(_settings.http_retries))
def post(url: str, headers: dict | None = None, data: dict | None = None, auth: tuple[str, str] | None = None) -> httpx.Response:
    # Do not cache POST (tokens, mutations)
    with _client() as c:
        resp = c.post(url, headers=headers, data=data, auth=auth)
        resp.raise_for_status()
        return resp

