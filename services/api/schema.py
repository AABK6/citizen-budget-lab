from __future__ import annotations

import base64
from typing import List, Optional

import strawberry
from strawberry.scalars import JSON

from .data_loader import (
    allocation_by_mission,
    allocation_by_cofog,
    allocation_by_apu,
    allocation_by_beneficiary,
    procurement_top_suppliers,
    run_scenario,
    list_sources,
    lego_pieces_with_baseline,
    load_lego_baseline,
    lego_distance_from_dsl,
)
from .models import Basis, MissionAllocation
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
    beneficiary: List[MissionAllocationType] | None = None
    apu: List[MissionAllocationType] | None = None


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
    naf: Optional[str]
    companySize: Optional[str]


@strawberry.type
class AccountingType:
    deficitPath: List[float]
    debtPath: List[float]
    commitmentsPath: Optional[List[float]] = None
    deficitDeltaPath: Optional[List[float]] = None
    debtDeltaPath: Optional[List[float]] = None
    baselineDeficitPath: Optional[List[float]] = None
    baselineDebtPath: Optional[List[float]] = None
    gdpPath: Optional[List[float]] = None
    deficitRatioPath: Optional[List[float]] = None
    baselineDeficitRatioPath: Optional[List[float]] = None
    debtRatioPath: Optional[List[float]] = None
    baselineDebtRatioPath: Optional[List[float]] = None


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
    id: strawberry.ID
    scenarioId: strawberry.ID
    accounting: AccountingType
    compliance: ComplianceType
    macro: "MacroType"
    resolution: "ResolutionType | None" = None
    warnings: List[str] | None = None
    # Expose the canonical DSL (base64) for permalink retrieval in UI
    dsl: Optional[str] = None


@strawberry.type
class VoteSummaryType:
    scenarioId: strawberry.ID
    votes: int
    lastVoteTs: float | None = None


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
    BENEFICIARY = "BENEFICIARY"
    APU = "APU"


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


@strawberry.type
class ShareSummaryType:
    title: str
    deficit: float
    debtDeltaPct: float
    highlight: str
    resolutionPct: float
    masses: JSON
    eu3: str
    eu60: str


@strawberry.input
class RunScenarioInput:
    dsl: str  # base64-encoded YAML
    lens: LensEnum | None = None

@strawberry.input
class MassSplitInput:
    pieceId: str
    amountEur: float

@strawberry.input
class SpecifyMassInput:
    dsl: str
    massId: str
    targetDeltaEur: float
    splits: list[MassSplitInput]

@strawberry.type
class SpecifyErrorType:
    code: str
    message: str
    pieceId: str | None = None

@strawberry.type
class SpecifyMassPayload:
    ok: bool
    errors: list[SpecifyErrorType]
    resolution: ResolutionType
    dsl: str


@strawberry.type
class MissionWeightType:
    code: str
    weight: float


@strawberry.type
class LegoPieceType:
    id: str
    label: str
    type: str
    description: str | None
    amountEur: float | None
    share: float | None
    cofogMajors: list[str]
    missions: list[MissionWeightType]
    beneficiaries: JSON
    examples: list[str]
    sources: list[str]
    locked: bool


@strawberry.type
class CofogWeightType:
    code: str
    weight: float


@strawberry.type
class NaItemWeightType:
    code: str
    weight: float


@strawberry.type
class ExplainPieceType:
    id: str
    label: str
    description: Optional[str]
    examples: list[str]
    beneficiaries: JSON
    cofog: list[CofogWeightType]
    naItems: list[NaItemWeightType]
    baselineAmountEur: Optional[float]
    baselineShare: Optional[float]
    lockedDefault: bool
    boundsPct: JSON
    boundsAmountEur: JSON
    elasticity: JSON
    sources: list[str]


@strawberry.enum
class ScopeEnum(str, enum.Enum):
    S13 = "S13"
    CENTRAL = "CENTRAL"


@strawberry.type
class LegoBaselineType:
    year: int
    scope: ScopeEnum
    pib: float
    depensesTotal: float
    recettesTotal: float
    pieces: list[LegoPieceType]


@strawberry.type
class DistanceByPieceType:
    id: str
    shareDelta: float


@strawberry.type
class DistanceType:
    score: float
    byPiece: list[DistanceByPieceType]


@strawberry.type
class MassTargetType:
    massId: str
    targetDeltaEur: float
    specifiedDeltaEur: float
    cpTargetDeltaEur: Optional[float] = None
    cpSpecifiedDeltaEur: Optional[float] = None
    cpDeltaEur: Optional[float] = None
    unspecifiedCpDeltaEur: Optional[float] = None


@strawberry.type
class BuilderMassType:
    massId: str
    amountEur: float
    share: float


@strawberry.type
class ResolutionType:
    overallPct: float
    byMass: list[MassTargetType]
    lens: LensEnum


@strawberry.enum
class PolicyFamilyEnum(str, enum.Enum):
    PENSIONS = "PENSIONS"
    TAXES = "TAXES"
    TAX_EXPENDITURES = "TAX_EXPENDITURES"
    HEALTH = "HEALTH"
    DEFENSE = "DEFENSE"
    STAFFING = "STAFFING"
    SUBSIDIES = "SUBSIDIES"
    CLIMATE = "CLIMATE"
    SOCIAL_SECURITY = "SOCIAL_SECURITY"
    PROCUREMENT = "PROCUREMENT"
    OPERATIONS = "OPERATIONS"
    OTHER = "OTHER"


@strawberry.enum
class BudgetSideEnum(str, enum.Enum):
    SPENDING = "SPENDING"
    REVENUE = "REVENUE"
    BOTH = "BOTH"


@strawberry.type
class ImpactStructType:
    householdsImpacted: int | None = None
    decile1ImpactEur: float | None = None
    decile10ImpactEur: float | None = None
    gdpImpactPct: float | None = None
    jobsImpactCount: int | None = None

@strawberry.type
class PolicyLeverType:
    id: str
    family: PolicyFamilyEnum
    budgetSide: BudgetSideEnum
    majorAmendment: bool | None = None
    label: str
    description: str | None
    paramsSchema: JSON
    fixedImpactEur: float | None = None
    feasibility: JSON
    conflictsWith: list[str]
    sources: list[str]
    shortLabel: str | None = None
    popularity: float | None = None
    massMapping: JSON | None = None
    missionMapping: JSON | None = None
    impact: ImpactStructType | None = None


@strawberry.type
class BudgetBaselineMissionType:
    missionCode: str
    missionLabel: str
    cp2025Eur: float
    plf2026CeilingEur: float
    ceilingDeltaEur: float
    ceilingDeltaPct: float | None
    revenueAdjustmentEur: float
    totalRevenueChangeEur: float
    revenueGrowthMultiplier: float
    gdpGrowthPct: float
    inflationPct: float
    unemploymentRatePct: float
    netFiscalSpaceEur: float


@strawberry.type
class MassLabelType:
    id: str
    displayLabel: str
    description: str | None
    examples: list[str]
    synonyms: list[str]
    color: str | None = None
    icon: str | None = None


@strawberry.type
class MissionLabelType:
    id: str
    displayLabel: str
    description: str | None
    examples: list[str]
    synonyms: list[str]
    color: str | None = None
    icon: str | None = None


@strawberry.type
class IntentType:
    id: str
    label: str
    emoji: str | None
    massId: str
    seed: JSON
    popularity: float
    tags: list[str]


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
        elif lens == LensEnum.COFOG:
            from .settings import get_settings  # lazy import
            from . import warehouse_client as _wh  # lazy import to avoid cycles

            settings = get_settings()
            wh_items = allocation_by_cofog(year, Basis(basis.value))
            use_override = bool(settings.warehouse_cofog_override)
            reliable = False
            if wh_items and not use_override:
                try:
                    reliable = _wh.cofog_mapping_reliable(year, Basis(basis.value))
                except Exception:
                    reliable = False

            use_wh = bool(wh_items) and (use_override or reliable)

            if use_wh:
                return AllocationType(
                    mission=[],
                    cofog=[
                        MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
                        for i in wh_items
                    ],
                )

            warmed: list[MissionAllocation] = []
            try:
                from .data_loader import allocation_by_cofog_s13  # type: ignore

                warmed = allocation_by_cofog_s13(year)
            except Exception:
                warmed = []

            if warmed:
                total_share = sum(i.share for i in warmed) or 1.0
                total_admin = sum(i.amount_eur for i in wh_items) if wh_items else 0.0
                normalized = []
                for entry in warmed:
                    share = entry.share / total_share if total_share else 0.0
                    amount = entry.amount_eur
                    if wh_items and total_admin > 0:
                        amount = share * total_admin
                    normalized.append(
                        MissionAllocationType(code=entry.code, label=entry.label, amountEur=amount, share=share)
                    )
                return AllocationType(mission=[], cofog=normalized)

            # Fall back to whatever warehouse returned, even if marked unreliable (better than empty)
            if wh_items:
                return AllocationType(
                    mission=[],
                    cofog=[
                        MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
                        for i in wh_items
                    ],
                )

            return AllocationType(mission=[], cofog=[])
        elif lens == LensEnum.APU:
            items = allocation_by_apu(year, Basis(basis.value))
            return AllocationType(
                mission=[],
                apu=[
                    MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
                    for i in items
                ],
            )
        else:  # BENEFICIARY
            items = allocation_by_beneficiary(year)
            return AllocationType(
                mission=[],
                beneficiary=[
                    MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
                    for i in items
                ],
            )

    @strawberry.field
    def allocationProgramme(self, year: int, basis: BasisEnum = BasisEnum.CP, missionCode: str = "") -> list[MissionAllocationType]:  # noqa: N802
        from .data_loader import allocation_by_programme as _by_prog  # type: ignore

        items = _by_prog(year, Basis(basis.value), missionCode)
        return [
            MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
            for i in items
        ]

    @strawberry.field
    def cofogSubfunctions(self, year: int, country: str = "FR", major: str = "07") -> list[MissionAllocationType]:  # noqa: N802
        from .data_loader import allocation_by_cofog_subfunctions as _by_sub  # type: ignore

        items = _by_sub(year, country, major)
        return [
            MissionAllocationType(code=i.code, label=i.label, amountEur=i.amount_eur, share=i.share)
            for i in items
        ]

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
                naf=getattr(i, "naf", None),
                companySize=getattr(i, "company_size", None),
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

    @strawberry.field
    def legoPieces(self, year: int, scope: ScopeEnum = ScopeEnum.S13) -> list[LegoPieceType]:
        items = lego_pieces_with_baseline(year, scope.value)
        return [
            LegoPieceType(
                id=i["id"],
                label=i.get("label") or i["id"],
                type=i.get("type") or "expenditure",
                description=i.get("description"),
                amountEur=i.get("amount_eur"),
                share=i.get("share"),
                cofogMajors=[str(x) for x in (i.get("cofog_majors") or [])],
                missions=[
                    MissionWeightType(code=str(m.get("code")), weight=float(m.get("weight", 0.0)))
                    for m in (i.get("missions") or [])
                    if m.get("code")
                ],
                beneficiaries=i.get("beneficiaries") or {},
                examples=list(i.get("examples") or []),
                sources=list(i.get("sources") or []),
                locked=bool(i.get("locked", False)),
            )
            for i in items
        ]

    @strawberry.field
    def savedScenarios(self) -> JSON:  # noqa: N802
        """List saved scenarios with basic metadata (id, title, description)."""
        try:
            from .store import scenario_store

            out = []
            for sid, meta in scenario_store.items():
                out.append({
                    "id": sid,
                    "title": meta.get("title") or "",
                    "description": meta.get("description") or "",
                })
            return out
        except Exception:
            return []

    @strawberry.field
    def explainPiece(self, id: str, year: int, scope: ScopeEnum = ScopeEnum.S13) -> ExplainPieceType:  # noqa: N802
        """Explain a LEGO piece: mapping, bounds, baseline, beneficiaries, sources."""
        from .data_loader import load_lego_config as _cfg, lego_pieces_with_baseline as _lp

        cfg = _cfg() or {}
        by_id = {str(p.get("id")): p for p in (cfg.get("pieces") or [])}
        p = by_id.get(id)
        if not p:
            # Return an empty shell to avoid errors
            return ExplainPieceType(
                id=id,
                label=id,
                description=None,
                examples=[],
                beneficiaries={},
                cofog=[],
                naItems=[],
                baselineAmountEur=None,
                baselineShare=None,
                lockedDefault=False,
                boundsPct={},
                boundsAmountEur={},
                elasticity={},
                sources=[],
            )
        mapping = p.get("mapping") or {}
        cof = []
        for ent in (mapping.get("cofog") or []):
            try:
                cof.append(CofogWeightType(code=str(ent.get("code")), weight=float(ent.get("weight", 1.0))))
            except Exception:
                continue
        nai = []
        for ent in (mapping.get("na_item") or []):
            try:
                nai.append(NaItemWeightType(code=str(ent.get("code")), weight=float(ent.get("weight", 1.0))))
            except Exception:
                continue
        pol = p.get("policy") or {}
        locked = bool(pol.get("locked_default", False))
        bounds_pct = pol.get("bounds_pct") or {}
        bounds_amt = pol.get("bounds_amount_eur") or {}
        elasticity = p.get("elasticity") or {}
        # Baseline amount/share from warmed baseline
        baseline_amt = None
        baseline_share = None
        try:
            for it in _lp(year, scope.value):
                if str(it.get("id")) == id:
                    baseline_amt = it.get("amount_eur")
                    baseline_share = it.get("share")
                    break
        except Exception:
            pass
        return ExplainPieceType(
            id=id,
            label=str(p.get("label") or id),
            description=str(p.get("description") or ""),
            examples=[str(x) for x in (p.get("examples") or [])],
            beneficiaries=p.get("beneficiaries") or {},
            cofog=cof,
            naItems=nai,
            baselineAmountEur=(float(baseline_amt) if isinstance(baseline_amt, (int, float)) else None),
            baselineShare=(float(baseline_share) if isinstance(baseline_share, (int, float)) else None),
            lockedDefault=locked,
            boundsPct=bounds_pct,
            boundsAmountEur=bounds_amt,
            elasticity=elasticity,
            sources=[str(x) for x in (p.get("sources") or [])],
        )

    @strawberry.field
    def legoBaseline(self, year: int, scope: ScopeEnum = ScopeEnum.S13) -> LegoBaselineType:  # noqa: N802
        # Prefer warehouse, fallback to warmed JSON
        bl: dict
        try:
            from . import warehouse_client as _wh
            try:
                from .settings import get_settings as _get_settings  # lazy import

                use_static = _get_settings().lego_baseline_static
            except Exception:
                use_static = False

            if not use_static and _wh.warehouse_available():
                wh_bl = _wh.lego_baseline(year)
                if isinstance(wh_bl, dict) and wh_bl.get("pieces"):
                    # Compute totals by type
                    dep = 0.0
                    rec = 0.0
                    pieces = []
                    for ent in wh_bl.get("pieces", []):
                        pid = str(ent.get("id"))
                        typ = str(ent.get("type") or "expenditure")
                        amt = ent.get("amount_eur")
                        if isinstance(amt, (int, float)):
                            if typ == "expenditure":
                                dep += float(amt)
                            elif typ == "revenue":
                                rec += float(amt)
                        pieces.append(
                            LegoPieceType(
                                id=pid,
                                label=str(ent.get("label") or pid),
                                type=typ,
                                description=ent.get("description"),
                                amountEur=(float(amt) if isinstance(amt, (int, float)) else None),
                                share=(float(ent.get("share")) if isinstance(ent.get("share"), (int, float)) else None),
                                cofogMajors=[],
                                missions=[
                                    MissionWeightType(code=str(m.get("code")), weight=float(m.get("weight", 0.0)))
                                    for m in (ent.get("missions") or [])
                                    if isinstance(m, dict) and m.get("code")
                                ],
                                beneficiaries={},
                                examples=[],
                                sources=[],
                                locked=False,
                            )
                        )
                    return LegoBaselineType(
                        year=int(wh_bl.get("year", year)),
                        scope=scope,  # warehouse baseline does not carry scope; assume requested
                        pib=0.0,
                        depensesTotal=float(dep),
                        recettesTotal=float(rec),
                        pieces=pieces,
                    )
        except Exception:
            pass

        bl = load_lego_baseline(year) or {}
        # If scope mismatches, we still return what we have; clients can detect gaps
        dep_total = 0.0
        rec_total = 0.0
        pieces: list[LegoPieceType] = []
        for ent in bl.get("pieces", []):
            amount = ent.get("amount_eur")
            piece_type = str(ent.get("type"))
            if isinstance(amount, (int, float)):
                if piece_type == "expenditure":
                    dep_total += float(amount)
                elif piece_type == "revenue":
                    rec_total += float(amount)
            pieces.append(
                LegoPieceType(
                    id=str(ent.get("id")),
                    label=str(ent.get("id")),
                    type=piece_type,
                    description=ent.get("description"),
                    amountEur=(float(amount) if isinstance(amount, (int, float)) else None),
                    share=(float(ent.get("share")) if isinstance(ent.get("share"), (int, float)) else None),
                    cofogMajors=[],
                    missions=[
                        MissionWeightType(code=str(m.get("code")), weight=float(m.get("weight", 0.0)))
                        for m in (ent.get("missions") or [])
                        if isinstance(m, dict) and m.get("code")
                    ],
                    beneficiaries={},
                    examples=[],
                    sources=[],
                    locked=False,
                )
            )
        return LegoBaselineType(
            year=int(bl.get("year", year)),
            scope=ScopeEnum(str(bl.get("scope", scope.value))),
            pib=float(bl.get("pib_eur", 0.0)),
            depensesTotal=float(bl.get("depenses_total_eur", dep_total)),
            recettesTotal=float(bl.get("recettes_total_eur", rec_total)),
            pieces=pieces,
        )

    @strawberry.field
    def builderMasses(self, year: int, lens: LensEnum = LensEnum.ADMIN) -> list[BuilderMassType]:  # noqa: N802
        from .data_loader import builder_mass_allocation as _builder_mass

        if lens == LensEnum.COFOG:
            lens_key = "COFOG"
        else:
            lens_key = "MISSION"
        alloc = _builder_mass(year, lens_key)
        out: list[BuilderMassType] = []
        for ent in alloc:
            out.append(
                BuilderMassType(
                    massId=str(ent.get("massId")),
                    amountEur=float(ent.get("amountEur", 0.0)),
                    share=float(ent.get("share", 0.0)),
                )
            )
        return out

    @strawberry.field
    def legoDistance(self, year: int, dsl: str, scope: ScopeEnum = ScopeEnum.S13) -> DistanceType:  # noqa: N802
        res = lego_distance_from_dsl(year, dsl, scope.value)
        return DistanceType(
            score=float(res.get("score", 0.0)),
            byPiece=[
                DistanceByPieceType(id=str(e.get("id")), shareDelta=float(e.get("shareDelta", 0.0)))
                for e in res.get("byPiece", [])
            ],
        )

    # V1: Policy Workshop catalog (stub)
    @strawberry.field
    def policyLevers(self, family: "PolicyFamilyEnum | None" = None, search: str | None = None) -> list["PolicyLeverType"]:  # noqa: N802
        from . import policy_catalog as pol

        fam = family.value if family else None
        items = pol.list_policy_levers(fam, search)
        out: list[PolicyLeverType] = []
        for it in items:
            out.append(
                PolicyLeverType(
                    id=str(it.get("id")),
                    family=PolicyFamilyEnum(str(it.get("family", "OTHER"))),
                    budgetSide=BudgetSideEnum(str(it.get("budget_side", "SPENDING"))),
                    majorAmendment=bool(it.get("major_amendment", False)),
                    label=str(it.get("label")),
                    description=str(it.get("description") or ""),
                    paramsSchema=it.get("params_schema") or {},
                    fixedImpactEur=it.get("fixed_impact_eur"),
                    feasibility=it.get("feasibility") or {},
                    conflictsWith=[str(x) for x in (it.get("conflicts_with") or [])],
                    sources=[str(x) for x in (it.get("sources") or [])],
                    shortLabel=str(it.get("short_label") or ""),
                    popularity=float(it.get("popularity", 0.0)),
                    massMapping=it.get("mass_mapping") or {},
                    missionMapping=it.get("mission_mapping") or {},
                    impact=(
                        ImpactStructType(
                            householdsImpacted=it["impact"].get("householdsImpacted"),
                            decile1ImpactEur=it["impact"].get("decile1ImpactEur"),
                            decile10ImpactEur=it["impact"].get("decile10ImpactEur"),
                            gdpImpactPct=it["impact"].get("gdpImpactPct"),
                            jobsImpactCount=it["impact"].get("jobsImpactCount"),
                        )
                        if it.get("impact")
                        else None
                    ),
                )
            )
        return out

    @strawberry.field
    def budgetBaseline2026(self) -> list[BudgetBaselineMissionType]:  # noqa: N802
        from . import warehouse_client as _wh

        rows = _wh.budget_baseline_2026()
        out: list[BudgetBaselineMissionType] = []
        for row in rows:
            out.append(
                BudgetBaselineMissionType(
                    missionCode=str(row.get("mission_code")),
                    missionLabel=str(row.get("mission_label")),
                    cp2025Eur=float(row.get("cp_2025_eur") or 0.0),
                    plf2026CeilingEur=float(row.get("plf_2026_ceiling_eur") or 0.0),
                    ceilingDeltaEur=float(row.get("ceiling_delta_eur") or 0.0),
                    ceilingDeltaPct=(float(row.get("ceiling_delta_pct")) if row.get("ceiling_delta_pct") is not None else None),
                    revenueAdjustmentEur=float(row.get("revenue_adjustment_eur") or 0.0),
                    totalRevenueChangeEur=float(row.get("total_revenue_change_eur") or 0.0),
                    revenueGrowthMultiplier=float(row.get("revenue_growth_multiplier") or 1.0),
                    gdpGrowthPct=float(row.get("gdp_growth_pct") or 0.0),
                    inflationPct=float(row.get("inflation_pct") or 0.0),
                    unemploymentRatePct=float(row.get("unemployment_rate_pct") or 0.0),
                    netFiscalSpaceEur=float(row.get("net_fiscal_space_eur") or 0.0),
                )
            )
        return out

    # UX labels for masses (COFOG majors)
    @strawberry.field
    def massLabels(self) -> list[MassLabelType]:
        import json, os
        from .data_loader import DATA_DIR  # type: ignore
        path = os.path.join(DATA_DIR, "ux_labels.json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                js = json.load(f)
            out: list[MassLabelType] = []
            for ent in js.get("masses", []):
                out.append(
                    MassLabelType(
                        id=str(ent.get("id")),
                        displayLabel=str(ent.get("displayLabel") or ent.get("id")),
                        description=str(ent.get("description") or ""),
                        examples=[str(x) for x in (ent.get("examples") or [])],
                        synonyms=[str(x) for x in (ent.get("synonyms") or [])],
                        color=(str(ent.get("color")) if ent.get("color") else None),
                        icon=(str(ent.get("icon")) if ent.get("icon") else None),
                    )
                )
            return out
        except Exception:
            return []

    @strawberry.field
    def missionLabels(self) -> list[MissionLabelType]:
        import json, os
        from .data_loader import DATA_DIR  # type: ignore
        path = os.path.join(DATA_DIR, "ux_labels.json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                js = json.load(f)
            out: list[MissionLabelType] = []
            for ent in js.get("missions", []):
                out.append(
                    MissionLabelType(
                        id=str(ent.get("id")),
                        displayLabel=str(ent.get("displayLabel") or ent.get("id")),
                        description=str(ent.get("description") or ""),
                        examples=[str(x) for x in (ent.get("examples") or [])],
                        synonyms=[str(x) for x in (ent.get("synonyms") or [])],
                        color=(str(ent.get("color")) if ent.get("color") else None),
                        icon=(str(ent.get("icon")) if ent.get("icon") else None),
                    )
                )
            return out
        except Exception:
            return []

    # Popular intents (chips)
    @strawberry.field
    def popularIntents(self, limit: int = 6) -> list[IntentType]:  # noqa: N802
        import json, os
        from .data_loader import DATA_DIR  # type: ignore
        path = os.path.join(DATA_DIR, "intents.json")
        out: list[IntentType] = []
        try:
            with open(path, "r", encoding="utf-8") as f:
                js = json.load(f)
            arr = sorted(js.get("intents", []), key=lambda e: float(e.get("popularity", 0.0)), reverse=True)[:limit]
            for it in arr:
                out.append(
                    IntentType(
                        id=str(it.get("id")),
                        label=str(it.get("label")),
                        emoji=str(it.get("emoji") or ""),
                        massId=str(it.get("massId") or ""),
                        seed=it.get("seed") or {},
                        popularity=float(it.get("popularity", 0.0)),
                        tags=[str(x) for x in (it.get("tags") or [])],
                    )
                )
        except Exception:
            return []
        return out

    @strawberry.field
    def voteSummary(self, limit: int = 25) -> list[VoteSummaryType]:  # noqa: N802
        try:
            from .votes_store import get_vote_store

            summaries = get_vote_store().summary(limit=limit)
            return [
                VoteSummaryType(
                    scenarioId=strawberry.ID(s.scenario_id),
                    votes=int(s.votes),
                    lastVoteTs=s.last_vote_ts,
                )
                for s in summaries
            ]
        except Exception:
            return []

    # Suggest levers for a mass id
    @strawberry.field
    def suggestLevers(self, massId: str, limit: int = 5) -> list["PolicyLeverType"]:  # noqa: N802
        from . import policy_catalog as pol
        items = pol.suggest_levers_for_mass(massId, limit)
        out: list[PolicyLeverType] = []
        for it in items:
            out.append(
                PolicyLeverType(
                    id=str(it.get("id")),
                    family=PolicyFamilyEnum(str(it.get("family", "OTHER"))),
                    budgetSide=BudgetSideEnum(str(it.get("budget_side", "SPENDING"))),
                    majorAmendment=bool(it.get("major_amendment", False)),
                    label=str(it.get("label")),
                    description=str(it.get("description") or ""),
                    paramsSchema=it.get("params_schema") or {},
                    fixedImpactEur=it.get("fixed_impact_eur"),
                    feasibility=it.get("feasibility") or {},
                    conflictsWith=[str(x) for x in (it.get("conflicts_with") or [])],
                    sources=[str(x) for x in (it.get("sources") or [])],
                    shortLabel=str(it.get("short_label") or ""),
                    popularity=float(it.get("popularity", 0.0)),
                    massMapping=it.get("mass_mapping") or {},
                    impact=(
                        ImpactStructType(
                            householdsImpacted=it["impact"].get("householdsImpacted"),
                            decile1ImpactEur=it["impact"].get("decile1ImpactEur"),
                            decile10ImpactEur=it["impact"].get("decile10ImpactEur"),
                            gdpImpactPct=it["impact"].get("gdpImpactPct"),
                            jobsImpactCount=it["impact"].get("jobsImpactCount"),
                        )
                        if it.get("impact")
                        else None
                    ),
                )
            )
        return out

    @strawberry.field
    def shareCard(self, scenarioId: strawberry.ID) -> "ShareSummaryType":  # noqa: N802
        """Return a compact summary for OG images/permalinks.

        If DSL is stored in-memory for this scenario id, recompute a minimal summary.
        """
        from .store import scenario_dsl_store, scenario_store
        from .data_loader import run_scenario as _run

        dsl = scenario_dsl_store.get(scenarioId)
        if not dsl:
            # Return placeholder summary
            return ShareSummaryType(title=f"Scenario {scenarioId[:8]}", deficit=0.0, debtDeltaPct=0.0, highlight="", resolutionPct=0.0, masses={}, eu3="info", eu60="info")
        # Run with 1-year horizon if not specified to get fast summary
        sid, acc, comp, macro, reso, _warnings = _run(dsl)
        title = scenario_store.get(sid, {}).get("title") or f"Scenario {sid[:8]}"
        deficit = float(acc.deficit_path[0]) if acc.deficit_path else 0.0
        # Debt delta ratio (pp) at horizon end vs baseline
        debt_delta_pct = 0.0
        try:
            import json as _json
            from . import baselines as _bl
            data = _json.loads(base64.b64decode(dsl).decode("utf-8"))
            baseline_year = int(data.get("baseline_year", 2026))
            horizon_years = int((data.get("assumptions") or {}).get("horizon_years", 5))
            end_year = baseline_year + max(0, horizon_years - 1)
            base_def, base_debt = _bl.year_def_debt(end_year)
            g = _bl.year_gdp(end_year)
            scen_debt = float(base_debt) + float(acc.debt_path[-1] if acc.debt_path else 0.0)
            base_ratio = (float(base_debt) / g) if g else 0.0
            scen_ratio = (scen_debt / g) if g else 0.0
            debt_delta_pct = (scen_ratio - base_ratio) * 100.0
        except Exception:
            debt_delta_pct = 0.0
        # Mass shares baseline vs scenario
        try:
            from .data_loader import _piece_amounts_after_dsl as _pad, _mass_shares_from_piece_amounts as _ms
            from .data_loader import load_lego_baseline as _load_bl
            import json as _json
            data = _json.loads(base64.b64decode(dsl).decode("utf-8"))
            year = int(data.get("baseline_year", 2026))
            base_amt, scen_amt = _pad(year, dsl)
            base_sh = _ms(base_amt)
            scen_sh = _ms(scen_amt)
            masses = {}
            # Top 5 by baseline share
            for mid in sorted(base_sh.keys(), key=lambda k: base_sh[k], reverse=True)[:5]:
                masses[mid] = {"base": float(base_sh[mid]), "scen": float(scen_sh.get(mid, 0.0))}
        except Exception:
            masses = {}
        # Highlight: largest unresolved mass
        hi = ""
        try:
            arr = reso.get("byMass") or []
            best = None
            for e in arr:
                pend = abs(float(e.get("targetDeltaEur", 0.0))) - abs(float(e.get("specifiedDeltaEur", 0.0)))
                if best is None or pend > best[0]:
                    best = (pend, str(e.get("massId")))
            if best and best[0] > 0:
                hi = f"Pending {best[0]:,.0f}€ in {best[1]}"
        except Exception:
            pass
        # EU lights first-year
        eu3 = (comp.eu3pct[0] if comp.eu3pct else "info")
        eu60 = (comp.eu60pct[0] if comp.eu60pct else "info")
        return ShareSummaryType(title=title, deficit=deficit, debtDeltaPct=debt_delta_pct, highlight=hi, resolutionPct=float(reso.get("overallPct", 0.0)), masses=masses, eu3=eu3, eu60=eu60)

    @strawberry.field
    def macroSeries(self, country: str = "FR") -> JSON:  # noqa: N802
        """Return warmed macro series from INSEE BDM if available."""
        import os
        import json
        from .data_loader import DATA_DIR  # type: ignore

        path = os.path.join(DATA_DIR, "cache", f"macro_series_{country}.json")
        if not os.path.exists(path):
            return {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @strawberry.field
    def scenario(self, id: strawberry.ID) -> RunScenarioPayload:
        from .store import scenario_dsl_store
        from .data_loader import run_scenario as _run

        import base64 as _b64
        import yaml as _yaml

        dsl = scenario_dsl_store.get(id)
        if not dsl:
            raise ValueError(f"Scenario {id} not found")

        try:
            dsl_obj = _yaml.safe_load(_b64.b64decode(dsl).decode("utf-8")) or {}
        except Exception:
            dsl_obj = {}
        assumptions = dsl_obj.get("assumptions") or {}
        lens_key = str(assumptions.get("lens") or dsl_obj.get("lens") or "MISSION").upper()
        if lens_key not in {"MISSION", "COFOG"}:
            lens_key = "MISSION"

        sid, acc, comp, macro, reso, warnings = _run(dsl, lens=lens_key)
        
        return RunScenarioPayload(
            id=strawberry.ID(sid),
            scenarioId=strawberry.ID(sid),
            accounting=AccountingType(
                deficitPath=acc.deficit_path,
                debtPath=acc.debt_path,
                commitmentsPath=acc.commitments_path or [],
                deficitDeltaPath=acc.deficit_delta_path or [],
                debtDeltaPath=acc.debt_delta_path or [],
                baselineDeficitPath=acc.baseline_deficit_path or [],
                baselineDebtPath=acc.baseline_debt_path or [],
                gdpPath=acc.gdp_path or [],
                deficitRatioPath=acc.deficit_ratio_path or [],
                baselineDeficitRatioPath=acc.baseline_deficit_ratio_path or [],
                debtRatioPath=acc.debt_ratio_path or [],
                baselineDebtRatioPath=acc.baseline_debt_ratio_path or [],
            ),
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
            resolution=ResolutionType(
                overallPct=float(reso.get("overallPct", 0.0)),
                byMass=[
                    MassTargetType(
                        massId=str(e.get("massId")),
                        targetDeltaEur=float(e.get("targetDeltaEur", 0.0)),
                        specifiedDeltaEur=float(e.get("specifiedDeltaEur", 0.0)),
                    )
                    for e in reso.get("byMass", [])
                ],
                lens=(LensEnum.ADMIN if lens_key == "MISSION" else LensEnum.COFOG),
            ),
            warnings=warnings,
            dsl=dsl,
        )

    @strawberry.field
    def scenarioCompare(self, a: strawberry.ID, b: strawberry.ID | None = None) -> "ScenarioCompareResultType":  # noqa: N802
        """Return ribbons and waterfall deltas between two scenarios (or vs baseline if b is None).

        Output shape (JSON):
        {
          "waterfall": [{"massId":"M_HEALTH","deltaEur":1234.0}, ...],
          "ribbons": [{"pieceId":"health_ops","massId":"M_HEALTH","amountEur":120.0}, ...],
          "pieceLabels": { "health_ops": "Health ops", ... },
          "massLabels": { "M_HEALTH": "Santé", ... }
        }
        """
        import json as _json
        from .store import scenario_dsl_store
        from .data_loader import (
            DATA_DIR,
            mission_bridges as _mission_bridges,
            _piece_amounts_after_dsl as _pad,
            load_lego_config as _cfg,
            run_scenario as _run,
        )

        dsl_a = scenario_dsl_store.get(a)
        if not dsl_a:
            raise ValueError(f"Scenario {a} not found")

        sid_a, acc_a, comp_a, macro_a, reso_a, _warn_a = _run(dsl_a)
        
        # If b is missing, compare against baseline (no actions)
        if b:
            dsl_b = scenario_dsl_store.get(b)
            if not dsl_b:
                raise ValueError(f"Scenario {b} not found")
            sid_b, acc_b, comp_b, macro_b, reso_b, _warn_b = _run(dsl_b)
        else:
            # Create empty scenario with same baseline_year
            try:
                data = _json.loads(base64.b64decode(dsl_a).decode("utf-8"))
                year = int(data.get("baseline_year", 2026))
            except Exception:
                year = 2026
            empty = _json.dumps({"version": 0.1, "baseline_year": year, "assumptions": {"horizon_years": 3}, "actions": []})
            dsl_b = base64.b64encode(empty.encode("utf-8")).decode("ascii")
            sid_b, acc_b, comp_b, macro_b, reso_b = _run(dsl_b)

        # Year from a
        try:
            data = _json.loads(base64.b64decode(dsl_a).decode("utf-8"))
            year = int(data.get("baseline_year", 2026))
        except Exception:
            year = 2026

        base_a, scen_a = _pad(year, dsl_a)
        base_b, scen_b = _pad(year, dsl_b)
        # We want deltas of scenario A vs B: (scen_a - base_a) - (scen_b - base_b)
        # Approximate piece delta as scen - base for each scenario (baseline from LEGO), then diff
        delta_a = {k: scen_a.get(k, 0.0) - base_a.get(k, 0.0) for k in set(base_a) | set(scen_a)}
        delta_b = {k: scen_b.get(k, 0.0) - base_b.get(k, 0.0) for k in set(base_b) | set(scen_b)}
        piece_delta = {k: float(delta_a.get(k, 0.0) - delta_b.get(k, 0.0)) for k in set(delta_a) | set(delta_b)}

        # Map piece deltas to mass majors via config weights
        cfg = _cfg()
        mission_map, cofog_to_mission = _mission_bridges()
        piece_labels: dict[str, str] = {}
        for p in cfg.get("pieces", []):
            pid = str(p.get("id"))
            piece_labels[pid] = str(p.get("label") or pid)
        ribbons: list[dict] = []
        mass_totals: dict[str, float] = {}
        for pid, dv in piece_delta.items():
            if abs(dv) <= 0:
                continue
            missions = mission_map.get(pid) or []
            if not missions:
                continue
            for mission_code, weight in missions:
                amt = float(dv) * float(weight)
                ribbons.append({"pieceId": pid, "massId": mission_code, "amountEur": amt})
                mass_totals[mission_code] = mass_totals.get(mission_code, 0.0) + amt
        waterfall = [{"massId": k, "deltaEur": float(v)} for k, v in mass_totals.items()]
        waterfall.sort(key=lambda x: abs(x["deltaEur"]), reverse=True)
        # Mission labels
        mission_labels: dict[str, str] = {}
        try:
            import os as _os

            with open(_os.path.join(DATA_DIR, "ux_labels.json"), "r", encoding="utf-8") as f:
                labels_js = _json.load(f)
            for ent in labels_js.get("missions", []):
                mission_labels[str(ent.get("id"))] = str(ent.get("displayLabel") or ent.get("id"))
        except Exception:
            mission_labels = {}
        
        scenario_a_payload = RunScenarioPayload(
            id=strawberry.ID(sid_a),
            scenarioId=strawberry.ID(sid_a),
            accounting=AccountingType(
                deficitPath=acc_a.deficit_path,
                debtPath=acc_a.debt_path,
                commitmentsPath=acc_a.commitments_path or [],
                deficitDeltaPath=acc_a.deficit_delta_path or [],
                debtDeltaPath=acc_a.debt_delta_path or [],
                baselineDeficitPath=acc_a.baseline_deficit_path or [],
                baselineDebtPath=acc_a.baseline_debt_path or [],
                gdpPath=acc_a.gdp_path or [],
                deficitRatioPath=acc_a.deficit_ratio_path or [],
                baselineDeficitRatioPath=acc_a.baseline_deficit_ratio_path or [],
                debtRatioPath=acc_a.debt_ratio_path or [],
                baselineDebtRatioPath=acc_a.baseline_debt_ratio_path or [],
            ),
            compliance=ComplianceType(
                eu3pct=comp_a.eu3pct,
                eu60pct=comp_a.eu60pct,
                netExpenditure=comp_a.net_expenditure,
                localBalance=comp_a.local_balance,
            ),
            macro=MacroType(
                deltaGDP=macro_a.delta_gdp,
                deltaEmployment=macro_a.delta_employment,
                deltaDeficit=macro_a.delta_deficit,
                assumptions={k: v for k, v in macro_a.assumptions.items()},
            ),
            resolution=ResolutionType(
                overallPct=float(reso_a.get("overallPct", 0.0)),
                byMass=[
                    MassTargetType(
                        massId=str(e.get("massId")),
                        targetDeltaEur=float(e.get("targetDeltaEur", 0.0)),
                        specifiedDeltaEur=float(e.get("specifiedDeltaEur", 0.0)),
                    )
                    for e in reso_a.get("byMass", [])
                ],
            ),
        )

        scenario_b_payload = RunScenarioPayload(
            id=strawberry.ID(sid_b),
            scenarioId=strawberry.ID(sid_b),
            accounting=AccountingType(
                deficitPath=acc_b.deficit_path,
                debtPath=acc_b.debt_path,
                commitmentsPath=acc_b.commitments_path or [],
                deficitDeltaPath=acc_b.deficit_delta_path or [],
                debtDeltaPath=acc_b.debt_delta_path or [],
                baselineDeficitPath=acc_b.baseline_deficit_path or [],
                baselineDebtPath=acc_b.baseline_debt_path or [],
                gdpPath=acc_b.gdp_path or [],
                deficitRatioPath=acc_b.deficit_ratio_path or [],
                baselineDeficitRatioPath=acc_b.baseline_deficit_ratio_path or [],
                debtRatioPath=acc_b.debt_ratio_path or [],
                baselineDebtRatioPath=acc_b.baseline_debt_ratio_path or [],
            ),
            compliance=ComplianceType(
                eu3pct=comp_b.eu3pct,
                eu60pct=comp_b.eu60pct,
                netExpenditure=comp_b.net_expenditure,
                localBalance=comp_b.local_balance,
            ),
            macro=MacroType(
                deltaGDP=macro_b.delta_gdp,
                deltaEmployment=macro_b.delta_employment,
                deltaDeficit=macro_b.delta_deficit,
                assumptions={k: v for k, v in macro_b.assumptions.items()},
            ),
            resolution=ResolutionType(
                overallPct=float(reso_b.get("overallPct", 0.0)),
                byMass=[
                    MassTargetType(
                        massId=str(e.get("massId")),
                        targetDeltaEur=float(e.get("targetDeltaEur", 0.0)),
                        specifiedDeltaEur=float(e.get("specifiedDeltaEur", 0.0)),
                    )
                    for e in reso_b.get("byMass", [])
                ],
            ),
        )

        return ScenarioCompareResultType(
            a=scenario_a_payload,
            b=scenario_b_payload,
            waterfall=waterfall, 
            ribbons=ribbons, 
            pieceLabels=piece_labels, 
            massLabels=mission_labels
        )

@strawberry.type
class ScenarioCompareResultType:
    a: RunScenarioPayload
    b: RunScenarioPayload | None = None
    waterfall: JSON
    ribbons: JSON
    pieceLabels: JSON
    massLabels: JSON

@strawberry.type
class Mutation:
    @strawberry.mutation
    def runScenario(self, input: RunScenarioInput) -> RunScenarioPayload:  # noqa: N802
        lens_value: str | None = None
        if input.lens == LensEnum.ADMIN:
            lens_value = "MISSION"
        elif input.lens == LensEnum.COFOG:
            lens_value = "COFOG"

        try:
            sid, acc, comp, macro, reso, warnings = run_scenario(input.dsl, lens=lens_value)
        except ValueError as e:
            raise ValueError(str(e)) from e

        # Store DSL for shareCard/permalinks (persistent store)
        try:
            from .store import set_dsl
            set_dsl(str(sid), input.dsl)
        except Exception:
            pass
        return RunScenarioPayload(
            id=strawberry.ID(sid),
            scenarioId=strawberry.ID(sid),
            accounting=AccountingType(
                deficitPath=acc.deficit_path,
                debtPath=acc.debt_path,
                commitmentsPath=acc.commitments_path or [],
                deficitDeltaPath=acc.deficit_delta_path or [],
                debtDeltaPath=acc.debt_delta_path or [],
                baselineDeficitPath=acc.baseline_deficit_path or [],
                baselineDebtPath=acc.baseline_debt_path or [],
                gdpPath=acc.gdp_path or [],
                deficitRatioPath=acc.deficit_ratio_path or [],
                baselineDeficitRatioPath=acc.baseline_deficit_ratio_path or [],
                debtRatioPath=acc.debt_ratio_path or [],
                baselineDebtRatioPath=acc.baseline_debt_ratio_path or [],
            ),
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
            resolution=ResolutionType(
                overallPct=float(reso.get("overallPct", 0.0)),
                byMass=[
                    MassTargetType(
                        massId=str(e.get("massId")),
                        targetDeltaEur=float(e.get("targetDeltaEur", 0.0)),
                        specifiedDeltaEur=float(e.get("specifiedDeltaEur", 0.0)),
                        cpTargetDeltaEur=(
                            float(e["cpTargetDeltaEur"])
                            if e.get("cpTargetDeltaEur") is not None
                            else None
                        ),
                        cpSpecifiedDeltaEur=(
                            float(e["cpSpecifiedDeltaEur"])
                            if e.get("cpSpecifiedDeltaEur") is not None
                            else None
                        ),
                        cpDeltaEur=(
                            float(e["cpDeltaEur"])
                            if e.get("cpDeltaEur") is not None
                            else None
                        ),
                        unspecifiedCpDeltaEur=(
                            float(e["unspecifiedCpDeltaEur"])
                            if e.get("unspecifiedCpDeltaEur") is not None
                            else None
                        ),
                    )
                    for e in reso.get("byMass", [])
                ],
                lens=(
                    LensEnum.ADMIN
                    if str(reso.get("lens", "MISSION")).upper() == "MISSION"
                    else LensEnum.COFOG
                ),
            ),
            warnings=warnings,
            dsl=input.dsl,
        )

    # In-memory scenario metadata store
    @strawberry.mutation
    def saveScenario(self, id: strawberry.ID, title: Optional[str] = None, description: Optional[str] = None) -> bool:  # noqa: N802
        try:
            from .store import set_meta
            set_meta(str(id), title, description)
            return True
        except Exception:
            return False

    @strawberry.mutation
    def submitVote(self, scenarioId: strawberry.ID, userEmail: Optional[str] = None) -> bool:  # noqa: N802
        try:
            from .votes_store import get_vote_store
            import time
            meta = {"timestamp": time.time()}
            get_vote_store().add_vote(str(scenarioId), userEmail, meta)
            return True
        except Exception:
            return False

    @strawberry.mutation
    def deleteScenario(self, id: strawberry.ID) -> bool:  # noqa: N802
        try:
            from .store import delete as _del
            return bool(_del(str(id)))
        except Exception:
            return False

    @strawberry.mutation
    def specifyMass(self, input: SpecifyMassInput) -> SpecifyMassPayload:  # noqa: N802
        """Validate a mass split plan against the current scenario and return an updated DSL.

        Rules:
        - Cannot allocate more than remaining pending amount for the mass.
        - Piece marked as locked in LEGO config cannot be used.
        - Splits sign should broadly match target sign (warn when mixed).
        """
        import base64 as _b64
        import yaml as _yaml
        from .data_loader import run_scenario as _run, load_lego_config as _cfg

        # Decode DSL to infer current lens and compute pending
        try:
            dsl_obj = _yaml.safe_load(_b64.b64decode(input.dsl).decode("utf-8")) or {}
        except Exception:
            dsl_obj = {}
        assumptions = dsl_obj.get("assumptions") or {}
        lens_key = str(assumptions.get("lens") or dsl_obj.get("lens") or "MISSION").upper()
        if lens_key not in {"MISSION", "COFOG"}:
            lens_key = "MISSION"
        assumptions["lens"] = lens_key
        dsl_obj["assumptions"] = assumptions

        _, _, _, _, reso, _warnings = _run(input.dsl, lens=lens_key)
        by_mass = {str(e.get("massId")): (float(e.get("targetDeltaEur", 0.0)), float(e.get("specifiedDeltaEur", 0.0))) for e in reso.get("byMass", [])}
        t, s = by_mass.get(str(input.massId), (float(input.targetDeltaEur), 0.0))
        # Prefer explicit target from input if non-zero
        target = float(input.targetDeltaEur if abs(input.targetDeltaEur) > 0 else t)
        specified = float(s)
        pending_abs = max(0.0, abs(target) - abs(specified))

        # Validate splits
        errors: list[SpecifyErrorType] = []
        total_abs = 0.0
        total_signed = 0.0
        for sp in input.splits:
            try:
                amt = float(sp.amountEur)
            except Exception:
                amt = 0.0
            total_abs += abs(amt)
            total_signed += amt
        tol = 1e-6
        if total_abs - pending_abs > tol:
            errors.append(SpecifyErrorType(code="over_allocate", message=f"Plan exceeds pending amount by {(total_abs - pending_abs):,.0f}€"))
        if target != 0 and (total_signed * target) < 0:
            errors.append(SpecifyErrorType(code="sign_mismatch", message="Plan sign opposes target sign"))

        # Locked pieces
        try:
            cfg = _cfg()
            locked_ids = {str(p.get("id")) for p in (cfg.get("pieces") or []) if bool(p.get("locked", False))}
            for sp in input.splits:
                if str(sp.pieceId) in locked_ids:
                    errors.append(SpecifyErrorType(code="locked", message="Piece is locked", pieceId=str(sp.pieceId)))
        except Exception:
            pass

        if errors:
            # Return current resolution and unchanged DSL
            reso_lens_str = str(reso.get("lens", lens_key)).upper()
            reso_lens_enum = LensEnum.ADMIN if reso_lens_str == "MISSION" else LensEnum.COFOG
            return SpecifyMassPayload(
                ok=False,
                errors=errors,
                resolution=ResolutionType(
                    overallPct=float(reso.get("overallPct", 0.0)),
                    byMass=[
                        MassTargetType(
                            massId=str(e.get("massId")),
                            targetDeltaEur=float(e.get("targetDeltaEur", 0.0)),
                            specifiedDeltaEur=float(e.get("specifiedDeltaEur", 0.0)),
                        )
                        for e in reso.get("byMass", [])
                    ],
                    lens=reso_lens_enum,
                ),
                dsl=input.dsl,
            )

        # Build updated DSL (append piece.* amount actions)
        data = dsl_obj
        acts = list(data.get("actions") or [])
        # Insert/refresh a target marker for this mass to drive progress bars without affecting deltas
        if abs(target) > tol:
            # Remove any prior marker for this mass
            acts = [a for a in acts if str(a.get("id","")) != f"target_{input.massId}"]
            mission_target = str(input.massId)
            if lens_key == "MISSION":
                if mission_target.upper().startswith("M_"):
                    target_expr = f"mission.{mission_target.upper()}"
                else:
                    target_expr = f"mission.{mission_target}"
            else:
                target_expr = f"cofog.{mission_target.zfill(2)}"
            acts.append({
                "id": f"target_{input.massId}",
                "target": target_expr,
                "dimension": "cp",
                "role": "target",
                "op": ("increase" if target >= 0 else "decrease"),
                "amount_eur": abs(target),
            })
        for sp in input.splits:
            amt = float(sp.amountEur)
            if abs(amt) < tol:
                continue
            op = "increase" if amt >= 0 else "decrease"
            acts.append({
                "id": f"spec_{input.massId}_{sp.pieceId}",
                "target": f"piece.{sp.pieceId}",
                "op": op,
                "amount_eur": abs(amt),
            })
        data["actions"] = acts
        yaml_text = _yaml.safe_dump(data, allow_unicode=True, sort_keys=False)
        new_dsl = _b64.b64encode(yaml_text.encode("utf-8")).decode("ascii")

        # Recompute resolution
        _, _, _, _, reso2, _warnings2 = _run(new_dsl, lens=lens_key)
        reso2_lens_str = str(reso2.get("lens", lens_key)).upper()
        reso2_lens_enum = LensEnum.ADMIN if reso2_lens_str == "MISSION" else LensEnum.COFOG
        return SpecifyMassPayload(
            ok=True,
            errors=[],
            dsl=new_dsl,
            resolution=ResolutionType(
                overallPct=float(reso2.get("overallPct", 0.0)),
                byMass=[
                    MassTargetType(
                        massId=str(e.get("massId")),
                        targetDeltaEur=float(e.get("targetDeltaEur", 0.0)),
                        specifiedDeltaEur=float(e.get("specifiedDeltaEur", 0.0)),
                    )
                    for e in reso2.get("byMass", [])
                ],
                lens=reso2_lens_enum,
            ),
        )


schema = strawberry.Schema(query=Query, mutation=Mutation)
