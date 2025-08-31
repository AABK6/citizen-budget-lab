from __future__ import annotations

import base64
from typing import List, Optional

import strawberry
from strawberry.scalars import JSON

from .data_loader import (
    allocation_by_mission,
    allocation_by_cofog,
    procurement_top_suppliers,
    run_scenario,
    list_sources,
)
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
    locationCode: Optional[str]
    sourceUrl: Optional[str]


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


@strawberry.type
class SourceType:
    id: str
    datasetName: str
    url: str
    license: str
    refreshCadence: str
    vintage: str


import enum


@strawberry.enum
class BasisEnum(str, enum.Enum):
    CP = "CP"
    AE = "AE"


@strawberry.enum
class LensEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    COFOG = "COFOG"


@strawberry.type
class EUCountryCofogType:
    country: str
    code: str
    label: str
    amountEur: float
    share: float


@strawberry.type
class FiscalPathType:
    years: List[int]
    deficitRatio: List[float]
    debtRatio: List[float]


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
    def procurement(
        self,
        year: int,
        region: str,
        cpvPrefix: Optional[str] = None,  # noqa: N803
        procedureType: Optional[str] = None,
        minAmountEur: Optional[float] = None,
        maxAmountEur: Optional[float] = None,
    ) -> List[ProcurementItemType]:
        items = procurement_top_suppliers(
            year,
            region,
            cpv_prefix=cpvPrefix,
            procedure_type=procedureType,
            min_amount_eur=minAmountEur,
            max_amount_eur=maxAmountEur,
        )
        return [
            ProcurementItemType(
                supplier=SupplierType(siren=i.supplier.siren, name=i.supplier.name),
                amountEur=i.amount_eur,
                cpv=i.cpv,
                procedureType=i.procedure_type,
                locationCode=getattr(i, "location_code", None),
                sourceUrl=getattr(i, "source_url", None),
            )
            for i in items
        ]

    @strawberry.field
    def sources(self) -> List[SourceType]:
        items = list_sources()
        return [
            SourceType(
                id=i.id,
                datasetName=i.dataset_name,
                url=i.url,
                license=i.license,
                refreshCadence=i.refresh_cadence,
                vintage=i.vintage,
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

    @strawberry.field
    def commune(self, code: str) -> JSON:
        """Lookup a commune by INSEE code (geo.api.gouv.fr)."""
        return geo_client.commune_by_code(code)

    # V1 stubs (EU comparisons)
    @strawberry.field
    def euCofogCompare(self, year: int, countries: List[str], level: int = 1) -> List[EUCountryCofogType]:  # noqa: N802
        # Try warmed cache first if present, then Eurostat live fetch; on failure, fall back to local FR mapping
        import os
        import json
        from .data_loader import DATA_DIR  # type: ignore

        # 1) Warmed cache path
        cache_path = os.path.join(DATA_DIR, "cache", f"eu_cofog_shares_{year}.json")
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    js = json.load(f)
                out: List[EUCountryCofogType] = []
                for c in countries:
                    arr = js.get(c.upper()) or js.get(c) or []
                    for ent in arr:
                        out.append(
                            EUCountryCofogType(
                                country=c,
                                code=str(ent.get("code")),
                                label=str(ent.get("label")),
                                amountEur=0.0,
                                share=float(ent.get("share") or 0.0),
                            )
                        )
                if out:
                    return out
            except Exception:
                pass

        # 2) Eurostat live fetch with HTTP caching layer
        try:
            from .clients import eurostat as eu

            js = eu.fetch("gov_10a_exp", {"time": str(year), "unit": "MIO_EUR", "sector": "S13"})
            out: List[EUCountryCofogType] = []
            for c in countries:
                shares = eu.cofog_shares(js, year=year, geo=c)
                for code, label, share in shares:
                    out.append(
                        EUCountryCofogType(
                            country=c,
                            code=code,
                            label=label,
                            amountEur=0.0,  # share-only compare for now
                            share=share,
                        )
                    )
            if out:
                return out
        except Exception:
            pass

        # 3) Fallback: reuse France COFOG shares from local sample for all requested countries
        items = allocation_by_cofog(year, Basis("CP"))
        out: List[EUCountryCofogType] = []
        for c in countries:
            for i in items:
                out.append(
                    EUCountryCofogType(
                        country=c,
                        code=i.code,
                        label=i.label,
                        amountEur=i.amount_eur,
                        share=i.share,
                    )
                )
        return out

    @strawberry.field
    def euFiscalPath(self, country: str, years: List[int]) -> FiscalPathType:  # noqa: N802
        # Placeholder: return zeros for non-FR; simple flat path for FR
        if country.upper() != "FR":
            return FiscalPathType(years=years, deficitRatio=[0.0] * len(years), debtRatio=[0.0] * len(years))
        # Use baseline files to approximate ratios for requested years if present
        from .data_loader import _read_gdp_series, _read_baseline_def_debt  # type: ignore

        gdp = _read_gdp_series()
        base = _read_baseline_def_debt()
        def_ratios: List[float] = []
        debt_ratios: List[float] = []
        for y in years:
            bd = base.get(y, (0.0, 0.0))
            gy = gdp.get(y, 1.0)
            def_ratios.append(bd[0] / gy if gy else 0.0)
            debt_ratios.append(bd[1] / gy if gy else 0.0)
        return FiscalPathType(years=years, deficitRatio=def_ratios, debtRatio=debt_ratios)


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

    # In-memory scenario metadata store
    @strawberry.mutation
    def saveScenario(self, id: str, title: Optional[str] = None, description: Optional[str] = None) -> bool:  # noqa: N802
        from .store import scenario_store

        scenario_store[id] = {"title": title or "", "description": description or ""}
        return True

    @strawberry.mutation
    def deleteScenario(self, id: str) -> bool:  # noqa: N802
        from .store import scenario_store

        if id in scenario_store:
            del scenario_store[id]
            return True
        return False


schema = strawberry.Schema(query=Query, mutation=Mutation)
