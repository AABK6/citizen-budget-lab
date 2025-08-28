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


def get_settings() -> Settings:
    # Load .env once at first import
    load_dotenv()
    return Settings()
