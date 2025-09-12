from __future__ import annotations

"""
Baseline data providers for macro series used by the simulation and summaries.

Currently wraps internal helpers in data_loader to provide a single import path
for GDP and baseline deficit/debt series. This module is a stepping stone to a
warehouse-backed source in the future.
"""

from typing import Dict, Tuple


def gdp_series() -> Dict[int, float]:
    from .data_loader import _read_gdp_series  # lazy import to avoid cycles

    return _read_gdp_series()


def def_debt_series() -> Dict[int, Tuple[float, float]]:
    from .data_loader import _read_baseline_def_debt  # lazy import

    return _read_baseline_def_debt()


def year_gdp(year: int) -> float:
    return float(gdp_series().get(int(year), 0.0) or 0.0)


def year_def_debt(year: int) -> Tuple[float, float]:
    return def_debt_series().get(int(year), (0.0, 0.0))

