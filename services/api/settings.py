from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


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
    # SDMX (dissemination) base for XML access (preferred for reliability)
    eurostat_sdmx_base: str = os.getenv(
        "EUROSTAT_SDMX_BASE",
        "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1",
    )
    eurostat_lang: str = os.getenv("EUROSTAT_LANG", "en")
    eurostat_cookie: str | None = os.getenv("EUROSTAT_COOKIE")

    # CORS (comma-separated list of origins)
    cors_allow_origins: str | None = os.getenv("CORS_ALLOW_ORIGINS")

    # Compliance parameters
    net_exp_reference_rate: float = float(os.getenv("NET_EXP_REFERENCE_RATE", "0.015"))

    # Warehouse / dbt
    warehouse_enabled: bool = os.getenv("WAREHOUSE_ENABLED", "1") not in ("0", "false", "False")
    warehouse_type: str = os.getenv("WAREHOUSE_TYPE", "duckdb")  # duckdb|postgres
    duckdb_path: str = os.getenv("WAREHOUSE_DUCKDB_PATH", os.path.join("data", "warehouse.duckdb"))
    pg_dsn: str | None = os.getenv("WAREHOUSE_PG_DSN")
    warehouse_cofog_override: bool = os.getenv("WAREHOUSE_COFOG_OVERRIDE", "0") in ("1", "true", "True")

    # Logging / Error reporting
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    sentry_dsn: str | None = os.getenv("SENTRY_DSN")

    # Feature flags / Perf toggles
    # Optional enrichment for procurement suppliers using INSEE SIRENE. Disable for benchmarks.
    procurement_enrich_sirene: bool = os.getenv("PROCUREMENT_ENRICH_SIRENE", "1") not in ("0", "false", "False")

    # Snapshot mode alias used for prod consistency. When set, it drives both static toggles.
    snapshot_fast: bool = _env_bool("SNAPSHOT_FAST", True)
    # Force LEGO baseline to use static JSON snapshot instead of warehouse when enabled.
    lego_baseline_static: bool = _env_bool(
        "LEGO_BASELINE_STATIC",
        _env_bool("SNAPSHOT_FAST", True),
    )
    macro_baseline_static: bool = _env_bool(
        "MACRO_BASELINE_STATIC",
        _env_bool("SNAPSHOT_FAST", _env_bool("LEGO_BASELINE_STATIC", True)),
    )

    # Macro kernel configuration (V2 prep): override IRF parameters JSON path
    macro_irfs_path: str | None = os.getenv("MACRO_IRFS_PATH")

    # Admin-only policy catalog editor (optional token)
    policy_catalog_admin_token: str | None = os.getenv("POLICY_CATALOG_ADMIN_TOKEN")

    # Local balance tolerance (EUR) when checking compliance for subsectors
    local_balance_tolerance_eur: float = float(os.getenv("LOCAL_BAL_TOLERANCE_EUR", "0"))

    # Voter preferences storage
    votes_store: str = os.getenv("VOTES_STORE", "file")  # file|sqlite|postgres
    # Guardrail: require Postgres in production-like runtimes (Cloud Run sets K_SERVICE).
    votes_require_postgres: bool = os.getenv(
        "VOTES_REQUIRE_POSTGRES",
        "1" if os.getenv("K_SERVICE") else "0",
    ) in ("1", "true", "True")
    votes_db_dsn: str | None = os.getenv("VOTES_DB_DSN")
    votes_db_pool_min: int = int(os.getenv("VOTES_DB_POOL_MIN", "1"))
    votes_db_pool_max: int = int(os.getenv("VOTES_DB_POOL_MAX", "5"))
    votes_db_pool_timeout: float = float(os.getenv("VOTES_DB_POOL_TIMEOUT", "30"))
    votes_db_pool_max_idle: float = float(os.getenv("VOTES_DB_POOL_MAX_IDLE", "300"))
    votes_db_pool_max_lifetime: float = float(os.getenv("VOTES_DB_POOL_MAX_LIFETIME", "1800"))
    votes_sqlite_path: str = os.getenv("VOTES_SQLITE_PATH", os.path.join("data", "cache", "votes.sqlite3"))
    votes_file_path: str = os.getenv("VOTES_FILE_PATH", os.path.join("data", "cache", "votes.json"))


def get_settings() -> Settings:
    # Load .env once at first import
    load_dotenv()
    return Settings()
