from __future__ import annotations

"""
Baseline data providers for macro series used by the simulation and summaries.

Currently wraps internal helpers in data_loader to provide a single import path
for GDP and baseline deficit/debt series. This module is a stepping stone to a
warehouse-backed source in the future.
"""

from typing import Dict, Tuple

from .settings import get_settings


def _use_warehouse_macro_series() -> bool:
    try:
        settings = get_settings()
        return bool(settings.warehouse_enabled and not settings.macro_baseline_static)
    except Exception:
        return False


def gdp_series() -> Dict[int, float]:
    # Prefer warehouse (dbt) when available unless explicitly disabled
    if _use_warehouse_macro_series():
        try:
            from . import warehouse_client as wh
            if wh.warehouse_available():
                con = wh._connect_duckdb()
                rel = wh._qual_name(con, "stg_macro_gdp")
                rows = con.execute(f"select year, gdp_eur from {rel}").fetchall()
                out: Dict[int, float] = {}
                for y, v in rows:
                    try:
                        out[int(y)] = float(v or 0.0)
                    except Exception:
                        continue
                if out:
                    return out
        except Exception:
            pass
    from .data_loader import _read_gdp_series  # lazy import to avoid cycles
    return _read_gdp_series()


def def_debt_series() -> Dict[int, Tuple[float, float]]:
    # Prefer warehouse (dbt) when available unless explicitly disabled
    if _use_warehouse_macro_series():
        try:
            from . import warehouse_client as wh
            if wh.warehouse_available():
                con = wh._connect_duckdb()
                rel = wh._qual_name(con, "stg_baseline_def_debt")
                rows = con.execute(f"select year, deficit_eur, debt_eur from {rel}").fetchall()
                out: Dict[int, Tuple[float, float]] = {}
                for y, d, b in rows:
                    try:
                        out[int(y)] = (float(d or 0.0), float(b or 0.0))
                    except Exception:
                        continue
                if out:
                    return out
        except Exception:
            pass
    from .data_loader import _read_baseline_def_debt  # lazy import
    return _read_baseline_def_debt()


def year_gdp(year: int) -> float:
    return float(gdp_series().get(int(year), 0.0) or 0.0)


def year_def_debt(year: int) -> Tuple[float, float]:
    return def_debt_series().get(int(year), (0.0, 0.0))
