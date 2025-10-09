from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Dict


class Basis(str, Enum):
    CP = "CP"
    AE = "AE"


@dataclass
class MissionAllocation:
    code: str
    label: str
    amount_eur: float
    share: float


@dataclass
class Allocation:
    mission: List[MissionAllocation]


@dataclass
class Supplier:
    siren: str
    name: str


@dataclass
class ProcurementItem:
    supplier: Supplier
    amount_eur: float
    cpv: Optional[str]
    procedure_type: Optional[str]
    location_code: Optional[str] = None
    source_url: Optional[str] = None
    naf: Optional[str] = None
    company_size: Optional[str] = None


@dataclass
class Accounting:
    deficit_path: List[float]
    debt_path: List[float]
    commitments_path: Optional[List[float]] = None
    deficit_delta_path: Optional[List[float]] = None
    debt_delta_path: Optional[List[float]] = None
    baseline_deficit_path: Optional[List[float]] = None
    baseline_debt_path: Optional[List[float]] = None
    gdp_path: Optional[List[float]] = None
    deficit_ratio_path: Optional[List[float]] = None
    baseline_deficit_ratio_path: Optional[List[float]] = None
    debt_ratio_path: Optional[List[float]] = None
    baseline_debt_ratio_path: Optional[List[float]] = None


@dataclass
class Compliance:
    eu3pct: List[str]
    eu60pct: List[str]
    net_expenditure: List[str]
    local_balance: List[str]


@dataclass
class RunScenarioResult:
    id: str
    accounting: Accounting
    compliance: Compliance


@dataclass
class MacroResult:
    delta_gdp: List[float]
    delta_employment: List[float]
    delta_deficit: List[float]
    assumptions: Dict[str, float]


@dataclass
class DistributionResult:
    decile_delta_net_income_pct: List[float]
    gini_delta: float
    poverty_rate_delta_pp: float


@dataclass
class Source:
    id: str
    dataset_name: str
    url: str
    license: str
    refresh_cadence: str
    vintage: str
