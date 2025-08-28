from __future__ import annotations

import base64
from typing import List, Optional

import strawberry
from strawberry.scalars import JSON

from .data_loader import allocation_by_mission, allocation_by_cofog, procurement_top_suppliers, run_scenario
from .models import Basis
from .clients import insee as insee_client
from .clients import data_gouv as datagouv_client
from .clients import geo as geo_client


@strawberry.type
class MissionAllocationType:
    code: str
    label: str
    amountEur: float
    share: float


@strawberry.type
class AllocationType:
    mission: List[MissionAllocationType]
    cofog: List[MissionAllocationType] | None = None


@strawberry.type
class SupplierType:
    siren: str
    name: str


@strawberry.type
class ProcurementItemType:
    supplier: SupplierType
    amountEur: float
    cpv: Optional[str]
    procedureType: Optional[str]


@strawberry.type
class AccountingType:
    deficitPath: List[float]
    debtPath: List[float]


@strawberry.type
class ComplianceType:
    eu3pct: List[str]
    eu60pct: List[str]
    netExpenditure: List[str]
    localBalance: List[str]


@strawberry.type
class MacroType:
    deltaGDP: list[float]
    deltaEmployment: list[float]
    deltaDeficit: list[float]
    assumptions: JSON


@strawberry.type
class RunScenarioPayload:
    id: str
    accounting: AccountingType
    compliance: ComplianceType
    macro: "MacroType"


import enum


@strawberry.enum
class BasisEnum(str, enum.Enum):
    CP = "CP"
    AE = "AE"


@strawberry.enum
class LensEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    COFOG = "COFOG"


@strawberry.input
class RunScenarioInput:
    dsl: str  # base64-encoded YAML


@strawberry.type
class Query:
    @strawberry.field
    def allocation(self, year: int, basis: BasisEnum = BasisEnum.CP, lens: LensEnum = LensEnum.ADMIN) -> AllocationType:
        if lens == LensEnum.ADMIN:
            alloc = allocation_by_mission(year, Basis(basis.value))
            return AllocationType(
                mission=[
                    MissionAllocationType(code=m.code, label=m.label, amountEur=m.amount_eur, share=m.share)
                    for m in alloc.mission
                ]
            )
        else:
            items = allocation_by_cofog(year, Basis(basis.value))
            return AllocationType(
                mission=[],
                cofog=[
                    MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
                    for i in items
                ],
            )

    @strawberry.field
    def procurement(self, year: int, region: str) -> List[ProcurementItemType]:
        items = procurement_top_suppliers(year, region)
        return [
            ProcurementItemType(
                supplier=SupplierType(siren=i.supplier.siren, name=i.supplier.name),
                amountEur=i.amount_eur,
                cpv=i.cpv,
                procedureType=i.procedure_type,
            )
            for i in items
        ]

    # Official APIs
    @strawberry.field
    def sirene(self, siren: str) -> JSON:
        """Lookup basic company info by SIREN via INSEE SIRENE API."""
        return insee_client.sirene_by_siren(siren)

    @strawberry.field
    def inseeSeries(self, dataset: str, series: List[str], sinceYear: int | None = None) -> JSON:  # noqa: N802
        """Fetch INSEE BDM series."""
        since = str(sinceYear) if sinceYear else None
        return insee_client.bdm_series(dataset, series, since)

    @strawberry.field
    def dataGouvSearch(self, query: str, pageSize: int = 5) -> JSON:  # noqa: N802
        return datagouv_client.search_datasets(query, page_size=pageSize)

    @strawberry.field
    def communes(self, department: str) -> JSON:
        return geo_client.communes_by_departement(department)


@strawberry.type
class Mutation:
    @strawberry.mutation
    def runScenario(self, input: RunScenarioInput) -> RunScenarioPayload:  # noqa: N802
        sid, acc, comp, macro = run_scenario(input.dsl)
        return RunScenarioPayload(
            id=sid,
            accounting=AccountingType(deficitPath=acc.deficit_path, debtPath=acc.debt_path),
            compliance=ComplianceType(
                eu3pct=comp.eu3pct,
                eu60pct=comp.eu60pct,
                netExpenditure=comp.net_expenditure,
                localBalance=comp.local_balance,
            ),
            macro=MacroType(
                deltaGDP=macro.delta_gdp,
                deltaEmployment=macro.delta_employment,
                deltaDeficit=macro.delta_deficit,
                assumptions={k: v for k, v in macro.assumptions.items()},
            ),
        )


schema = strawberry.Schema(query=Query, mutation=Mutation)
