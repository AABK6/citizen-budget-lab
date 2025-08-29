from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    # INSEE (OAuth2 client credentials)
    insee_client_id: str | None = os.getenv("INSEE_CLIENT_ID")
    insee_client_secret: str | None = os.getenv("INSEE_CLIENT_SECRET")

    # Timeouts
    http_timeout: float = float(os.getenv("HTTP_TIMEOUT", "15"))
    http_retries: int = int(os.getenv("HTTP_RETRIES", "3"))

    # Eurostat
    eurostat_base: str = os.getenv(
        "EUROSTAT_BASE",
        "https://ec.europa.eu/eurostat/wdds/rest/data/v2.1/json",
    )
    eurostat_lang: str = os.getenv("EUROSTAT_LANG", "en")
    eurostat_cookie: str | None = os.getenv("EUROSTAT_COOKIE")

    # CORS (comma-separated list of origins)
    cors_allow_origins: str | None = os.getenv("CORS_ALLOW_ORIGINS")

    # Compliance parameters
    net_exp_reference_rate: float = float(os.getenv("NET_EXP_REFERENCE_RATE", "0.015"))


def get_settings() -> Settings:
    # Load .env once at first import
    load_dotenv()
    return Settings()
