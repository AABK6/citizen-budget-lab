"use client"

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { gqlRequest } from '@/lib/graphql';
import { parseDsl, serializeDsl } from '@/lib/dsl';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { BuildPageSkeleton } from '@/components/BuildPageSkeleton';
import { buildPageQuery, suggestLeversQuery, getScenarioDslQuery, submitVoteMutation } from '@/lib/queries';
import { TreemapChart } from '@/components/Treemap';
import { useHistory } from '@/lib/useHistory';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DslAction,
  DslObject,
  INITIAL_DSL_OBJECT,
  LegoPiece,
  PolicyLever,
  PopularIntent,
  MassCategory,
  MissionLabel,
  MassLabel,
  AggregationLens,
  RevenueFamily,
} from './types';
import { useBuildState } from './useBuildState';
import { runScenarioForDsl } from '@/lib/permalink';
import { MassCategoryList } from './components/MassCategoryList';
import { MassCategoryPanel } from './components/MassCategoryPanel';
import { RevenueCategoryList } from './components/RevenueCategoryList';
import { RevenueCategoryPanel } from './components/RevenueCategoryPanel';
import { RevenueFamilyPanel } from './components/RevenueFamilyPanel';
import { FamilyActionModal } from './components/FamilyActionModal';
import { computeDeficitTotals } from '@/lib/fiscal';
import { Scoreboard } from './components/Scoreboard';
import { ReformSidebarList } from './components/ReformSidebarList';
import { TutorialOverlay } from './components/TutorialOverlay';
import { DebriefModal } from './components/DebriefModal';
import { NewsTicker } from './components/NewsTicker';
import { FloatingShareCard } from './components/FloatingShareCard';

const cloneCategories = (categories: MassCategory[]) =>
  categories.map((category) => ({ ...category }));

const QUALTRICS_MESSAGE_TYPE = 'CBL_VOTE_SUBMITTED_V1';
const FINAL_SNAPSHOT_VERSION = 1;
const MAX_SNAPSHOT_B64_LEN = 20_000;
const GZIP_TIMEOUT_MS = 1500;

type SnapshotMode = 'full' | 'ids' | 'minimal';

type EncodedSnapshot = {
  mode: SnapshotMode;
  encoded: string | null;
  sha256: string | null;
  truncated: boolean;
  dropped: boolean;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function gzipMaybe(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    return bytes;
  }
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const gzipPromise = (async () => {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      await writer.write(bytes);
      await writer.close();
      const buffer = await new Response(stream.readable).arrayBuffer();
      return new Uint8Array(buffer);
    })();
    const timeoutPromise = new Promise<Uint8Array>((resolve) => {
      timeoutId = setTimeout(() => resolve(bytes), GZIP_TIMEOUT_MS);
    });
    const result = await Promise.race([gzipPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch {
    if (timeoutId) clearTimeout(timeoutId);
    return bytes;
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }
  try {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

async function encodeSnapshotPayload(payload: Record<string, unknown>): Promise<{ encoded: string; sha256: string | null }> {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await gzipMaybe(raw);
  return {
    encoded: toBase64Url(compressed),
    sha256: await sha256Hex(raw),
  };
}

async function selectSnapshotCandidate(
  candidates: Array<{ mode: SnapshotMode; payload: Record<string, unknown> }>,
): Promise<EncodedSnapshot> {
  let smallest: { mode: SnapshotMode; encoded: string; sha256: string | null } | null = null;
  for (const candidate of candidates) {
    const { encoded, sha256 } = await encodeSnapshotPayload(candidate.payload);
    if (!smallest || encoded.length < smallest.encoded.length) {
      smallest = { mode: candidate.mode, encoded, sha256 };
    }
    if (encoded.length <= MAX_SNAPSHOT_B64_LEN) {
      return {
        mode: candidate.mode,
        encoded,
        sha256,
        truncated: candidate.mode !== 'full',
        dropped: false,
      };
    }
  }

  return {
    mode: smallest?.mode ?? 'minimal',
    encoded: null,
    sha256: smallest?.sha256 ?? null,
    truncated: true,
    dropped: true,
  };
}

const REVENUE_FAMILY_FALLBACK: Record<string, string> = {
  "rev_pit": "REV_HOUSEHOLDS",
  "rev_csg_crds": "REV_HOUSEHOLDS",
  "rev_property_taxes": "REV_HOUSEHOLDS",
  "rev_transfer_taxes": "REV_HOUSEHOLDS",

  "rev_vat_standard": "REV_CONSUMPTION",
  "rev_vat_reduced": "REV_CONSUMPTION",
  "rev_excise_tob_alc": "REV_CONSUMPTION",

  "rev_cit": "REV_COMPANIES",
  "rev_soc_employer": "REV_COMPANIES",
  "rev_prod_taxes": "REV_COMPANIES",
  "rev_wage_tax": "REV_COMPANIES",

  "rev_soc_employee": "REV_LABOR",
  "rev_soc_self": "REV_LABOR",

  "rev_excise_energy": "REV_ECO",
  "rev_env_taxes": "REV_ECO",

  "rev_sales_fees": "REV_OTHER",
  "rev_fines": "REV_OTHER",
  "rev_public_income": "REV_OTHER",
  "rev_transfers_in": "REV_OTHER"
};

const POLICY_TARGET_FALLBACK: Record<string, string> = {
  "vat_normal_plus1": "rev_vat_standard",
  "vat_all_rates_plus1": "rev_vat_standard",
  "vat_intermediate_12_5": "rev_vat_standard",
  "vat_franchise_threshold_halved": "rev_vat_standard",
  "cut_vat_essentials": "rev_vat_reduced",
  "cut_vat_energy": "rev_vat_reduced",
  "amend_ir_bracket_indexation_1pct": "rev_pit",
  "cut_income_tax_middle": "rev_pit",
  "freeze_tax_brackets": "rev_pit",
  "amend_alimony_tax_exemption": "rev_pit",
  "amend_raise_csg_on_capital": "rev_csg_crds",
  "progressive_csg": "rev_csg_crds",
  "amend_raise_big_corp_profit_contrib": "rev_cit",
  "superprofits_tax": "rev_cit",
  "wealth_tax": "rev_property_taxes",
  "amend_ifi_to_fortune_improductive": "rev_property_taxes",
  "restore_taxe_habitation_top20": "rev_property_taxes",
  "restore_taxe_habitation_all": "rev_property_taxes",
  "airline_ticket_tax_increase": "rev_prod_taxes",
  "ecotax_heavy_trucks": "rev_env_taxes",
  "carbon_tax": "rev_excise_energy",
  "cut_fuel_taxes": "rev_excise_energy",
  "amend_double_gafam_tax": "rev_cit",
  "expand_digital_tax": "rev_prod_taxes",
  "amend_universal_tax_multinationals": "rev_cit",
  "amend_lower_global_min_tax_threshold": "rev_cit",
  "amend_raise_buyback_tax": "rev_cit",
  "amend_windfall_dividend_tax": "rev_cit",
  "amend_clawback_cir_relocation": "rev_cit",
  "amend_sme_cit_threshold_100k": "rev_cit",
  "amend_tighten_pacte_dutreil": "rev_transfer_taxes",
  "amend_no_new_apprentice_contrib": "rev_soc_employee",
  "amend_no_meal_voucher_tax": "rev_soc_employer",
  "amend_surtax_health_insurers": "rev_prod_taxes",
  "amend_extend_overtime_deduction": "rev_soc_employer",
  "amend_increase_severance_tax": "rev_soc_employer",
  "amend_extend_tips_exemption": "rev_pit",
  "amend_return_exit_tax": "rev_pit",
  "amend_one_time_donation_exemption": "rev_pit",
  "amend_ald_sickleave_exempt_ir": "rev_pit",
  "amend_school_fees_tax_reduction": "rev_pit",
  "amend_limit_holding_tax_to_luxury": "rev_cit",
  "reinstate_cvae": "rev_prod_taxes",
  "remove_pension_deduction": "rev_pit",
  "end_overtime_exemption": "rev_pit",
  "fight_tax_fraud": "rev_pit",
  "end_flat_tax": "rev_cit",
  "expand_ftt": "rev_prod_taxes",
  "cap_research_credit": "rev_cit",
  "reduce_home_services_credit": "rev_pit",
  "green_transport_tax": "rev_prod_taxes",
  "is_rate_33_5": "rev_cit",
  "transfer_pricing_enforcement": "rev_cit",
  "cap_quotient_conjugal": "rev_pit",
  "abolish_quotient_conjugal": "rev_pit",
  "abolish_qf_demi_parts_noneffective": "rev_pit",
  "wealth_minimum_tax_2pct_100m": "rev_property_taxes"
};

const REVENUE_FAMILIES_DEF = [
  {
    "id": "REV_HOUSEHOLDS",
    "displayLabel": "Impôts sur les ménages",
    "description": "Impôt sur le revenu, CSG, taxes foncières...",
    "icon": "🏠",
    "color": "#3b82f6",
    "vigilancePoints": [
      "Risque de baisse du pouvoir d'achat des ménages modestes et moyens.",
      "Risque de désincitation au travail (trappe à inactivité) si la fiscalité est trop lourde.",
      "Attention à l'acceptabilité sociale (ras-le-bol fiscal)."
    ]
  },
  {
    "id": "REV_CONSUMPTION",
    "displayLabel": "Impôts sur la consommation",
    "description": "TVA, taxes tabac & alcool",
    "icon": "🛒",
    "color": "#ec4899",
    "vigilancePoints": [
      "Impôts régressifs : pèsent proportionnellement plus sur les ménages modestes.",
      "Risque d'inflation (hausse des prix) et de baisse de la consommation.",
      "Risque de marché noir ou d'achats transfrontaliers (tabac, alcool)."
    ]
  },
  {
    "id": "REV_COMPANIES",
    "displayLabel": "Impôts sur les entreprises",
    "description": "IS, charges patronales, impôts de production",
    "icon": "🏭",
    "color": "#6366f1",
    "vigilancePoints": [
      "Risque de perte de compétitivité des entreprises françaises.",
      "Risque de délocalisations ou de baisse des investissements.",
      "Impact potentiel sur l'emploi (coût du travail)."
    ]
  },
  {
    "id": "REV_LABOR",
    "displayLabel": "Prélèvements sur le travail",
    "description": "Cotisations salariés et indépendants",
    "icon": "👷",
    "color": "#f97316",
    "vigilancePoints": [
      "Baisse du salaire net perçu par les travailleurs.",
      "Risque de désincitation à l'emploi déclarée (travail au noir).",
      "Lien direct avec le financement de la protection sociale (retraites, chômage)."
    ]
  },
  {
    "id": "REV_ECO",
    "displayLabel": "Impôts écologiques",
    "description": "Carburants, écotaxes",
    "icon": "🌿",
    "color": "#22c55e",
    "vigilancePoints": [
      "Risque de rejet social fort (type Gilets Jaunes) si perçu comme injuste.",
      "Impact sur la compétitivité industrielle.",
      "Nécessité d'alternatives pour changer les comportements."
    ]
  },
  {
    "id": "REV_OTHER",
    "displayLabel": "Autres recettes",
    "description": "Services, amendes, fonds UE",
    "icon": "📦",
    "color": "#64748b",
    "vigilancePoints": [
      "Recettes souvent non pérennes ou fluctuantes.",
      "Dépendance aux fonds européens.",
      "Acceptabilité des amendes et redevances."
    ]
  }
];

const fallbackTreemapColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];
const revenueColorPalette = ['#0ea5e9', '#f97316', '#9333ea', '#16a34a', '#dc2626', '#facc15', '#0f766e', '#7c3aed', '#22c55e', '#2563eb'];
const revenueIcons = ['💶', '📈', '🏦', '🧾', '🏭', '🛢️', '🚬', '💡', '🎯', '💼'];
const percentFormatter = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TARGET_PERCENT_DEFAULT_RANGE = 10;
const TARGET_PERCENT_EXPANDED_RANGE = 25;
const TARGET_PERCENT_STEP = 0.5;
const EPSILON = 1e-6;
const revenueFamilies = new Set(['TAXES', 'TAX_EXPENDITURES']);
const resolveBudgetSide = (lever: PolicyLever) =>
  lever.budgetSide ?? (revenueFamilies.has(lever.family) ? 'REVENUE' : 'SPENDING');

export default function BuildPageClient() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { state, actions } = useBuildState(INITIAL_DSL_OBJECT.baseline_year);
  const [isQualtricsChannel, setIsQualtricsChannel] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [previewReformId, setPreviewReformId] = useState<string | null>(null);
  const {
    year,
    initialLoading,
    scenarioLoading,
    error,
    scenarioError,
    spendingPieces,
    revenuePieces,
    masses,
    policyLevers,
    popularIntents,
    scenarioResult,
    isPanelExpanded,
    isRevenuePanelExpanded,
    selectedCategory,
    selectedRevenueCategory,
    selectedRevenueFamily,
    suggestedLevers,
    targetPercent,
    targetRangeMax,
    revenueTargetPercent,
    revenueTargetRangeMax,
    lens,
    expandedFamilies,
    scenarioId,
    massLabels,
    missionLabels,
    revenueFamilies,
  } = state;
  const [displayMode, setDisplayMode] = useState<'amount' | 'share'>('amount');
  const [isMobileSpendingOpen, setIsMobileSpendingOpen] = useState(false);
  const [isMobileRevenueOpen, setIsMobileRevenueOpen] = useState(false);
  const [isScoreboardDetailsOpen, setIsScoreboardDetailsOpen] = useState(false);
  const [pendingFamilyAction, setPendingFamilyAction] = useState<{ family: RevenueFamily; targetPercent: number } | null>(null);
  const [massDataByLens, setMassDataByLens] = useState<Record<AggregationLens, MassCategory[]>>({
    MISSION: [],
    COFOG: [],
  });
  const [baselineTotals, setBaselineTotals] = useState<{ spending: number; revenue: number }>({
    spending: 0,
    revenue: 0,
  });
  const [baselineGdp, setBaselineGdp] = useState<number | null>(null);
  const [baselineMassDataByLens, setBaselineMassDataByLens] = useState<Record<AggregationLens, MassCategory[]>>({
    MISSION: [],
    COFOG: [],
  });

  const spendingLevers = useMemo(
    () => policyLevers.filter((lever) => resolveBudgetSide(lever) !== 'REVENUE'),
    [policyLevers],
  );
  const revenueLevers = useMemo(
    () => policyLevers
      .filter((lever) => resolveBudgetSide(lever) === 'REVENUE')
      .map(lever => ({
        ...lever,
        targetRevenueCategoryId: lever.targetRevenueCategoryId || POLICY_TARGET_FALLBACK[lever.id]
      })),
    [policyLevers],
  );

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [tutorialRunId, setTutorialRunId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'missions' | 'reforms'>('missions');
  const [activeRevenueTab, setActiveRevenueTab] = useState<'revenues' | 'reforms'>('revenues');
  const {
    setInitialLoading,
    setScenarioLoading,
    setError,
    setScenarioError,
    setScenarioResult,
    setData,
    setSuggestedLevers,
    setTargetPercent,
    setTargetRangeMax,
    setRevenueTargetPercent,
    setRevenueTargetRangeMax,
    setSelectedCategory,
    setSelectedRevenueCategory,
    setSelectedRevenueFamily,
    setLens,
    setAggregationLens,
    setMasses,
    setLabels,
    togglePanel,
    toggleRevenuePanel,
    toggleFamily,
    setScenarioId,
  } = actions;
  const {
    state: dslObject,
    setState: setDslObject,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useHistory<DslObject>(INITIAL_DSL_OBJECT);
  const dslString = serializeDsl(dslObject);
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const respondentId = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get('ID') || params.get('id');
  }, [searchParamsString]);
  const scenarioIdRef = useRef<string | null>(scenarioId);
  const skipFetchRef = useRef(false);
  const latestRunRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);
  const entryPathRef = useRef<string | null>(null);
  const voteSubmitInFlightRef = useRef(false);
  const [isVoteSubmitting, setIsVoteSubmitting] = useState(false);


  const addPieceToBucket = (bucket: Map<string, LegoPiece[]>, key: string, piece: LegoPiece) => {
    const existing = bucket.get(key);
    if (existing) {
      if (!existing.some((p) => p.id === piece.id)) {
        existing.push(piece);
      }
    } else {
      bucket.set(key, [piece]);
    }
  };

  const toAllocations = (
    allocations: Array<{ massId: string; amountEur: number; share: number }> | null,
    fallbackTotals: Map<string, number>,
  ) => {
    if (allocations && allocations.length > 0) {
      return allocations;
    }
    const entries = Array.from(fallbackTotals.entries()).filter(([, amount]) => amount > 0);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    if (entries.length === 0) {
      return [];
    }
    return entries.map(([massId, amount]) => ({
      massId,
      amountEur: amount,
      share: total > 0 ? amount / total : 0,
    }));
  };

  const buildCategories = (
    allocations: Array<{ massId: string; amountEur: number; share: number }>,
    pieceMap: Map<string, LegoPiece[]>,
    labelLookup: Record<string, { displayLabel?: string; color?: string; icon?: string }>,
    defaultIcon: string,
  ): MassCategory[] => {
    const categories: MassCategory[] = [];
    let colorIndex = 0;
    for (const entry of allocations) {
      const label = labelLookup[entry.massId];
      let name = label?.displayLabel;
      if (!name) {
        if (entry.massId === 'UNKNOWN') {
          name = 'Unspecified';
        } else if (entry.massId.startsWith('M_')) {
          name = entry.massId.replace('M_', '');
        } else {
          name = entry.massId;
        }
      }
      const color = label?.color || fallbackTreemapColors[colorIndex % fallbackTreemapColors.length];
      const icon = label?.icon || defaultIcon;
      colorIndex += 1;
      categories.push({
        id: entry.massId,
        name,
        amount: entry.amountEur,
        share: entry.share,
        baselineAmount: entry.amountEur,
        baselineShare: entry.share,
        deltaAmount: 0,
        unspecifiedAmount: 0,
        color,
        icon,
        pieces: pieceMap.get(entry.massId) ?? [],
      });
    }
    categories.sort((a, b) => b.amount - a.amount);
    return categories;
  };

  useEffect(() => {
    if (!shareFeedback) return;
    const timer = setTimeout(() => setShareFeedback(null), 2400);
    return () => clearTimeout(timer);
  }, [shareFeedback]);


  useEffect(() => {
    scenarioIdRef.current = scenarioId;
  }, [scenarioId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = Date.now();
      entryPathRef.current = `${window.location.pathname}${window.location.search}`;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsQualtricsChannel(false);
      return;
    }
    const params = new URLSearchParams(searchParamsString);
    const source = (params.get('source') || '').toLowerCase();
    const hasRespondentId = Boolean(params.get('ID') || params.get('id'));
    const inIframe = window.self !== window.top;
    const referrer = (document.referrer || '').toLowerCase();
    const isQualtricsReferrer = referrer.includes('qualtrics.com');
    setIsQualtricsChannel(
      source === 'qualtrics' || hasRespondentId || (inIframe && isQualtricsReferrer),
    );
  }, [searchParamsString]);

  useEffect(() => {
    if (!scenarioId || typeof window === 'undefined') {
      setShareUrl(null);
      return;
    }
    const params = new URLSearchParams();
    params.set('scenarioId', scenarioId);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setShareUrl(`${baseUrl.replace(/\/$/, '')}/build?${params.toString()}`);
  }, [scenarioId]);


  useEffect(() => {
    if (!scenarioResult) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      const pending = scenarioResult.resolution?.byMass?.filter(
        (entry: any) =>
          Math.abs(Number(entry?.unspecifiedCpDeltaEur ?? entry?.cpTargetDeltaEur ?? entry?.cpDeltaEur ?? 0)) > EPSILON,
      );
      if (pending && pending.length) {
        // eslint-disable-next-line no-console
        console.debug('[Build] pending masses', pending.slice(0, 5));
      }
    }
    const lensFromResult = scenarioResult.resolution?.lens === 'COFOG' ? 'COFOG' : 'MISSION';
    const baselineForLens = baselineMassDataByLens[lensFromResult];
    if (!baselineForLens || baselineForLens.length === 0) {
      return;
    }
    const baselineMap = new Map(baselineForLens.map((category) => [category.id, category]));
    const deltaEntries = Array.isArray(scenarioResult.resolution?.byMass)
      ? scenarioResult.resolution.byMass
      : [];
    const deltaMap = new Map<string, number>();
    const unspecifiedMap = new Map<string, number>();
    for (const entry of deltaEntries) {
      const cpTarget = Number(entry.cpTargetDeltaEur ?? 0);
      const cpSpecified = Number(entry.cpSpecifiedDeltaEur ?? 0);
      const cpDeltaRaw = entry.cpDeltaEur ?? (Math.abs(cpTarget) > EPSILON ? cpTarget : cpSpecified);
      const cpDelta = Number(cpDeltaRaw ?? 0);
      const cpUnspecified =
        Math.abs(cpDelta) > EPSILON ? Number(entry.unspecifiedCpDeltaEur ?? 0) : 0;
      deltaMap.set(entry.massId, cpDelta);
      unspecifiedMap.set(entry.massId, cpUnspecified);
    }
    const baseIds = baselineForLens.map((category) => category.id);
    const extraIds: string[] = [];
    deltaMap.forEach((_, massId) => {
      if (!baselineMap.has(massId)) {
        extraIds.push(massId);
      }
    });
    const defaultLabels = lensFromResult === 'COFOG' ? massLabels : missionLabels;
    const defaultIcon = lensFromResult === 'COFOG' ? '📊' : '🏛️';
    const deriveName = (massId: string) => {
      const label = defaultLabels[massId];
      if (label?.displayLabel) return label.displayLabel;
      if (massId === 'UNKNOWN') return 'Unspecified';
      if (massId.startsWith('M_')) return massId.replace('M_', '');
      return massId;
    };
    const combinedIds = [...baseIds, ...extraIds];
    const updated: MassCategory[] = [];
    combinedIds.forEach((massId, index) => {
      const baselineCategory = baselineMap.get(massId);
      const baselineAmount = baselineCategory?.baselineAmount ?? baselineCategory?.amount ?? 0;
      const baselineShare = baselineCategory?.baselineShare ?? baselineCategory?.share ?? 0;
      const delta = deltaMap.get(massId) ?? 0;
      const unspecified = Math.abs(delta) > EPSILON ? (unspecifiedMap.get(massId) ?? 0) : 0;
      const newAmount = baselineAmount + delta;
      const label = defaultLabels[massId];
      const color =
        baselineCategory?.color
        ?? label?.color
        ?? fallbackTreemapColors[index % fallbackTreemapColors.length];
      const icon = baselineCategory?.icon ?? label?.icon ?? defaultIcon;
      const name = baselineCategory?.name ?? deriveName(massId);
      const pieces = baselineCategory?.pieces ?? [];
      updated.push({
        id: massId,
        name,
        amount: newAmount,
        share: 0,
        baselineAmount,
        baselineShare,
        deltaAmount: delta,
        unspecifiedAmount: unspecified,
        color,
        icon,
        pieces,
      });
    });
    const total = updated.reduce((sum, category) => sum + Math.max(category.amount, 0), 0);
    const finalCategories = updated
      .map((category) => ({
        ...category,
        share: total > 0 ? Math.max(category.amount, 0) / total : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    setMassDataByLens((prev) => ({
      ...prev,
      [lensFromResult]: finalCategories,
    }));
    if (lensFromResult === 'MISSION') {
      setMasses(finalCategories);
    }
  }, [baselineMassDataByLens, massLabels, missionLabels, scenarioResult, setMassDataByLens, setMasses]);

  useEffect(() => {
    const urlScenarioId = new URLSearchParams(searchParamsString).get('scenarioId');

    // If we're performing an internal navigation, ignore stale URL mismatches
    if (skipFetchRef.current) {
      if (urlScenarioId === scenarioIdRef.current) {
        // URL has caught up, we are stable
        skipFetchRef.current = false;
      } else {
        // URL is still stale, unexpected mismatch, ignore
        return;
      }
    }

    if (urlScenarioId) {

      if (urlScenarioId !== scenarioId && urlScenarioId !== scenarioIdRef.current) {
        setScenarioId(urlScenarioId);
        const fetchDsl = async (retries = 3) => {
          // If we have already moved to a new scenario internally, abort this stale fetch
          if (scenarioIdRef.current && scenarioIdRef.current !== urlScenarioId) {
            return;
          }
          try {
            const { scenario } = await gqlRequest(getScenarioDslQuery, { id: urlScenarioId });
            // Double check before applying state
            if (scenarioIdRef.current && scenarioIdRef.current !== urlScenarioId) {
              return;
            }
            setDslObject(parseDsl(atob(scenario.dsl)));
          } catch (err) {
            // If we have moved on, ignore the error
            if (scenarioIdRef.current && scenarioIdRef.current !== urlScenarioId) {
              return;
            }
            if (retries > 0) {
              console.warn('[Build] Retrying fetch...', retries);
              setTimeout(() => fetchDsl(retries - 1), 500);
            } else {
              console.error('[Build] Fetch failed:', err);
              setError('Échec du chargement du scénario');
            }
          }
        };
        fetchDsl();
      }
    } else if (scenarioId) {
      setScenarioId(null);
    }
  }, [scenarioId, searchParamsString, setDslObject, setError, setScenarioId]);

  const runScenario = useCallback(async () => {
    const runToken = latestRunRef.current + 1;
    latestRunRef.current = runToken;
    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const result = await runScenarioForDsl(dslString, 'MISSION');
      if (latestRunRef.current !== runToken) {
        return;
      }
      const scenarioData = result.runScenario;
      setScenarioResult(scenarioData, scenarioData?.id ?? undefined);

      const newId = scenarioData?.id ?? null;
      // Update ref immediately to prevent race conditions during navigation
      scenarioIdRef.current = newId;
      // Mark that we are navigating to this ID, so ignore mismatches until URL matches
      skipFetchRef.current = true;
      // Sync state immediately so we don't depend on effect roundtrip
      setScenarioId(newId);

      // Ensure URL is in sync
      if (newId) {
        const urlId = new URLSearchParams(searchParamsString).get('scenarioId');
        if (urlId !== newId) {
          const params = new URLSearchParams(searchParamsString);
          params.set('scenarioId', newId);
          const queryString = params.toString();
          const href = queryString ? `${pathname}?${queryString}` : pathname;
          router.replace(href, { scroll: false });
        }
      }

    } catch (err: any) {
      setScenarioError(err.message || 'Échec de l\'exécution du scénario');
    } finally {
      if (latestRunRef.current === runToken) {
        setScenarioLoading(false);
      }
    }
  }, [dslString, pathname, router, searchParamsString, setScenarioError, setScenarioLoading, setScenarioResult]);

  const fetchData = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    setScenarioError(null);
    try {
      let data: any | null = null;
      const useSnapshot = process.env.NEXT_PUBLIC_BUILD_SNAPSHOT !== '0';
      if (useSnapshot) {
        try {
          const snapshotRes = await fetch(`/api/build-snapshot?year=${year}`, { cache: 'no-store' });
          if (snapshotRes.ok) {
            data = await snapshotRes.json();
          }
        } catch (err) {
          data = null;
        }
      }
      if (!data) {
        data = await gqlRequest(buildPageQuery, { year });
      }

      const baselineAmounts: Record<string, number> = {};
      data.legoBaseline.pieces.forEach((p: any) => {
        baselineAmounts[p.id] = p.amountEur;
      });

      const allPieces: LegoPiece[] = data.legoPieces.map((p: any) => ({ ...p, amountEur: baselineAmounts[p.id] || 0 }));

      const spending = allPieces.filter((p) => p.type === 'expenditure');
      const revenue = allPieces.filter((p) =>
        p.type === 'revenue' &&
        p.id !== 'rev_public_income'
      ).map(p => ({
        ...p,
        familyId: p.familyId || REVENUE_FAMILY_FALLBACK[p.id] || 'REV_OTHER'
      }));

      const missionLabelMap: Record<string, MissionLabel> = {};
      (data.missionLabels || []).forEach((label: MissionLabel) => {
        missionLabelMap[label.id] = label;
      });

      const massLabelMap: Record<string, MassLabel> = {};
      (data.massLabels || []).forEach((label: MassLabel) => {
        massLabelMap[label.id] = label;
      });

      setLabels(massLabelMap, missionLabelMap);

      const missionPieceMap = new Map<string, LegoPiece[]>();
      const cofogPieceMap = new Map<string, LegoPiece[]>();
      const missionFallbackTotals = new Map<string, number>();
      const cofogFallbackTotals = new Map<string, number>();

      spending.forEach((piece) => {
        const weightEntries = (piece.missions || []).map((m) => ({
          code: (m.code || 'M_UNKNOWN').toUpperCase(),
          weight: typeof m.weight === 'number' ? m.weight : 0,
        }));
        const positiveWeights = weightEntries.filter((m) => m.weight > 0);
        const missions = positiveWeights.length > 0 ? positiveWeights : [{ code: 'M_UNKNOWN', weight: 1 }];
        const weightSum = missions.reduce((sum, m) => sum + m.weight, 0);
        const normalized = missions.map((m) => ({
          code: m.code,
          weight: weightSum > 0 ? m.weight / weightSum : 1 / missions.length,
        }));
        normalized.forEach((mission) => {
          addPieceToBucket(missionPieceMap, mission.code, piece);
          missionFallbackTotals.set(
            mission.code,
            (missionFallbackTotals.get(mission.code) || 0) + (piece.amountEur || 0) * mission.weight,
          );
        });

        const majors = (piece.cofogMajors && piece.cofogMajors.length > 0) ? piece.cofogMajors : ['UNKNOWN'];
        const majorShare = majors.length > 0 ? 1 / majors.length : 1;
        majors.forEach((major) => {
          const key = (major || 'UNKNOWN').toUpperCase();
          addPieceToBucket(cofogPieceMap, key, piece);
          cofogFallbackTotals.set(key, (cofogFallbackTotals.get(key) || 0) + (piece.amountEur || 0) * majorShare);
        });
      });

      const missionAllocations = toAllocations(data.builderMassesAdmin ?? null, missionFallbackTotals);
      const missionCategories = buildCategories(missionAllocations, missionPieceMap, missionLabelMap, '🏛️');

      const missionBaseline = cloneCategories(missionCategories);
      setBaselineMassDataByLens({ MISSION: missionBaseline, COFOG: [] });

      const missionCurrent = cloneCategories(missionBaseline);
      setMassDataByLens({ MISSION: missionCurrent, COFOG: [] });
      setMasses(missionCurrent);



      setData({
        spendingPieces: spending,
        revenuePieces: revenue,
        masses: masses,
        policyLevers: data.policyLevers,
        popularIntents: data.popularIntents,
        revenueFamilies: (data.revenueFamilies && data.revenueFamilies.length > 0) ? data.revenueFamilies : REVENUE_FAMILIES_DEF,
      });

      const spendingTotal = Number(data.legoBaseline?.depensesTotal ?? 0);
      const revenueTotal = Number(data.legoBaseline?.recettesTotal ?? 0);
      setBaselineTotals({
        spending: Number.isFinite(spendingTotal) ? spendingTotal : 0,
        revenue: Number.isFinite(revenueTotal) ? revenueTotal : 0,
      });
      const gdpVal = Number(data.legoBaseline?.pib ?? 0);
      setBaselineGdp(Number.isFinite(gdpVal) && gdpVal > 0 ? gdpVal : null);

    } catch (err: any) {
      setError(err.message || 'Échec du chargement des données');
      setInitialLoading(false);
    }
  }, [setData, setError, setInitialLoading, setLabels, setMassDataByLens, setMasses, setScenarioError, year]);




  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run scenario initially and whenever DSL changes
  useEffect(() => {
    runScenario();
  }, [dslObject, runScenario]);

  const handleCategoryClick = async (category: MassCategory) => {
    setActiveTab('missions');
    setIsMobileSpendingOpen(true);
    setIsMobileRevenueOpen(false);
    toggleRevenuePanel(false);
    setSelectedRevenueCategory(null);
    setSelectedCategory(category);
    togglePanel(true);

    // Set initial target input value from current DSL
    const massId = category.id;
    const targetAction = dslObject.actions.find(a => a.id === `target_${massId}`);
    const baselineAmount = category.baselineAmount ?? category.amount ?? 0;
    if (targetAction && baselineAmount !== 0) {
      const signedAmount = targetAction.amount_eur * (targetAction.op === 'increase' ? 1 : -1);
      const rawPercent = (signedAmount / baselineAmount) * 100;
      const snapped = Math.round(rawPercent / TARGET_PERCENT_STEP) * TARGET_PERCENT_STEP;
      const safePercent = Number.isFinite(snapped) ? Number(snapped.toFixed(1)) : 0;
      const boundedPercent = Math.max(-TARGET_PERCENT_EXPANDED_RANGE, Math.min(TARGET_PERCENT_EXPANDED_RANGE, safePercent));
      setTargetPercent(boundedPercent);
      setTargetRangeMax(Math.abs(boundedPercent) > TARGET_PERCENT_DEFAULT_RANGE ? TARGET_PERCENT_EXPANDED_RANGE : TARGET_PERCENT_DEFAULT_RANGE);
    } else {
      setTargetPercent(0);
      setTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
    }

    try {
      const data = await gqlRequest(suggestLeversQuery, { massId });
      setSuggestedLevers(data.suggestLevers);
    } catch (err: any) {
      setError(err.message || 'Échec du chargement des suggestions');
    }
  };

  const addLeverToDsl = (lever: PolicyLever) => {
    setDslObject(currentDslObject => {
      const isRevenue = resolveBudgetSide(lever) === 'REVENUE';
      const op = (isRevenue
        ? ((lever.fixedImpactEur || 0) >= 0 ? 'increase' : 'decrease')
        : ((lever.fixedImpactEur || 0) >= 0 ? 'decrease' : 'increase')) as 'increase' | 'decrease';

      const newAction: DslAction = {
        id: lever.id,
        target: `piece.${lever.id}`,
        op: op,
        amount_eur: Math.abs(lever.fixedImpactEur || 0),
        recurring: true, // Assuming reforms are recurring
      };
      return {
        ...currentDslObject,
        actions: [...currentDslObject.actions, newAction],
      };
    });
    setShareFeedback(`✅ "${lever.label}" appliquée`);
  };

  const removeLeverFromDsl = (leverId: string) => {
    setDslObject(currentDslObject => {
      return {
        ...currentDslObject,
        actions: currentDslObject.actions.filter((a: DslAction) => a.id !== leverId),
      };
    });
    const lever = policyLevers.find(l => l.id === leverId);
    if (lever) {
      setShareFeedback(`❌ "${lever.label}" retirée`);
    }
  };

  const isLeverInDsl = (leverId: string) => {
    return dslObject.actions.some(a => a.id === leverId);
  };

  const handleTargetRangeChange = (nextMax: number) => {
    setTargetRangeMax(nextMax);
    const capped = Math.max(-nextMax, Math.min(nextMax, targetPercent));
    const snapped = Math.round(capped / TARGET_PERCENT_STEP) * TARGET_PERCENT_STEP;
    const finalValue = Number.isFinite(snapped) ? Number(snapped.toFixed(1)) : 0;
    setTargetPercent(finalValue);
  };

  const handleRevenueRangeChange = (nextMax: number) => {
    setRevenueTargetRangeMax(nextMax);
    const capped = Math.max(-nextMax, Math.min(nextMax, revenueTargetPercent));
    const snapped = Math.round(capped / TARGET_PERCENT_STEP) * TARGET_PERCENT_STEP;
    const finalValue = Number.isFinite(snapped) ? Number(snapped.toFixed(1)) : 0;
    setRevenueTargetPercent(finalValue);
  };

  const handleApplyTarget = () => {
    if (!selectedCategory) return;

    const massId = selectedCategory.id;
    const baseline = selectedCategory.baselineAmount ?? selectedCategory.amount ?? 0;
    const baseMagnitude = Math.abs(baseline);
    const amount = (baseMagnitude * targetPercent) / 100;

    setDslObject(currentDsl => {
      const otherActions = currentDsl.actions.filter(a => a.id !== `target_${massId}`);
      if (!Number.isFinite(amount) || Math.abs(amount) < 1) {
        return { ...currentDsl, actions: otherActions };
      }
      const targetKey = `mission.${massId.toUpperCase().startsWith('M_') ? massId.toUpperCase() : massId}`;
      // Keep role unset so backend treats this target as an actionable mass delta.
      const newAction: DslAction = {
        id: `target_${massId}`,
        target: targetKey,
        op: (amount >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
        amount_eur: Math.abs(amount),
        recurring: true,
      };
      return {
        ...currentDsl,
        actions: [...otherActions, newAction],
      };
    });
  };

  const handleApplyRevenueTarget = () => {
    if (selectedRevenueCategory) {
      const category = selectedRevenueCategory;
      const baseline = category.amountEur || 0;
      const baseMagnitude = Math.abs(baseline);
      const amount = (baseMagnitude * revenueTargetPercent) / 100;
      const pieceId = category.id;

      setDslObject(currentDsl => {
        const otherActions = currentDsl.actions.filter(a => a.id !== `target_${pieceId}`);
        if (!Number.isFinite(amount) || Math.abs(amount) < 1) {
          return { ...currentDsl, actions: otherActions };
        }
        // Keep role unset so the backend applies piece deltas instead of treating them as target markers.
        const newAction: DslAction = {
          id: `target_${pieceId}`,
          target: `piece.${pieceId}`,
          op: (amount > 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
          amount_eur: Math.abs(amount),
          recurring: true,
        };
        return {
          ...currentDsl,
          actions: [...otherActions, newAction],
        };
      });
    } else if (selectedRevenueFamily) {
      // Instead of applying immediately, trigger confirmation modal
      setPendingFamilyAction({
        family: selectedRevenueFamily,
        targetPercent: revenueTargetPercent
      });
    }
  };

  const handleConfirmFamilyApply = () => {
    if (!pendingFamilyAction) return;
    const { family, targetPercent } = pendingFamilyAction;
    const pieces = revenuePieces.filter(p => p.familyId === family.id);

    setDslObject(currentDsl => {
      let newActions = currentDsl.actions;
      const pieceIds = new Set(pieces.map(p => p.id));
      // Remove existing target actions for these pieces
      newActions = newActions.filter(a => !a.id.startsWith('target_') || !pieceIds.has(a.id.replace('target_', '')));

      // Add new actions
      pieces.forEach(p => {
        const baseline = p.amountEur || 0;
        const amount = (baseline * targetPercent) / 100;
        if (Number.isFinite(amount) && Math.abs(amount) >= 1) {
          newActions.push({
            id: `target_${p.id}`,
            target: `piece.${p.id}`,
            op: amount > 0 ? 'increase' : 'decrease',
            amount_eur: Math.abs(amount),
            recurring: true,
          });
        }
      });
      return { ...currentDsl, actions: newActions };
    });
    setPendingFamilyAction(null);
    setShareFeedback(`✅ Modification "${family.displayLabel}" appliquée`);
  };

  const handleFamilyClick = (family: string) => {
    toggleFamily(family);
  };

  const handleIntentClick = (intent: PopularIntent) => {
    setDslObject(currentDsl => {
      const newActions = intent.seed.actions.filter((action: DslAction) => !currentDsl.actions.some(a => a.id === action.id));
      return {
        ...currentDsl,
        actions: [...currentDsl.actions, ...newActions],
      };
    });
  };

  const handleBackClick = () => {
    togglePanel(false);
    setSelectedCategory(null);
    setTargetPercent(0);
    setTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
  };

  const handleRevenueCategoryClick = async (category: LegoPiece) => {
    setActiveRevenueTab('revenues');
    setIsMobileRevenueOpen(true);
    setIsMobileSpendingOpen(false);
    togglePanel(false);
    setSelectedCategory(null);
    setSelectedRevenueFamily(null); // Clear family selection
    const pieceId = category.id;
    // ... rest of function ...
    // Note: I need to update the existing function to clear family selection too.
    // I will replace the whole function block.

    // Actually, I am injecting handleRevenueFamilyClick BEFORE handleRevenueCategoryClick for context match.
  };

  const handleRevenueFamilyClick = (family: RevenueFamily) => {
    setActiveRevenueTab('revenues');
    setIsMobileRevenueOpen(true);
    setIsMobileSpendingOpen(false);
    togglePanel(false);
    setSelectedCategory(null);
    setSelectedRevenueCategory(null);

    setRevenueTargetPercent(0);
    setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);

    setSelectedRevenueFamily(family);
    toggleRevenuePanel(true);

    // Populate suggested levers for the family
    // Find all pieces in this family
    const familyPieceIds = new Set(revenuePieces.filter(p => p.familyId === family.id).map(p => p.id));

    // Find all levers targeting these pieces
    const relevantLevers = revenueLevers.filter(lever =>
      lever.targetRevenueCategoryId && familyPieceIds.has(lever.targetRevenueCategoryId)
    );
    setSuggestedLevers(relevantLevers);
  };

  // handleRevenueCategoryClick removed as it is superseded by handleRevenueFamilyClick for the main list interactions.
  // Keeping logic inside if needed for sub-navigation, but for now we interact with families.

  const handleRevenueBackClick = () => {
    toggleRevenuePanel(false);
    setSelectedRevenueCategory(null);
    setSelectedRevenueFamily(null);
    setRevenueTargetPercent(0);
    setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
  };

  const openMobileSpendingPanel = useCallback(() => {
    setActiveTab('missions');
    setIsMobileRevenueOpen(false);
    setIsMobileSpendingOpen(true);
  }, [setActiveTab, setIsMobileRevenueOpen, setIsMobileSpendingOpen]);

  const openMobileRevenuePanel = useCallback(() => {
    setActiveRevenueTab('revenues');
    setIsMobileSpendingOpen(false);
    setIsMobileRevenueOpen(true);
  }, [setActiveRevenueTab, setIsMobileRevenueOpen, setIsMobileSpendingOpen]);

  const closeMobileSpendingPanel = useCallback(() => {
    setIsMobileSpendingOpen(false);
    handleBackClick();
  }, [handleBackClick]);

  const closeMobileRevenuePanel = useCallback(() => {
    setIsMobileRevenueOpen(false);
    handleRevenueBackClick();
  }, [handleRevenueBackClick]);

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    return `${sign}${(Math.abs(amount) / 1e9).toFixed(1)} Md€`;
  };

  const formatDeficitWithRatio = (amount: number, ratio: number | null) => {
    const base = formatCurrency(amount);
    if (ratio === null || !Number.isFinite(ratio)) {
      return base;
    }
    return `${base} (${percentFormatter.format(ratio)} du PIB)`;
  };

  const formatShare = (value: number) => `${(value * 100).toFixed(1)}%`;

  const handleRunTutorial = useCallback(() => {
    setTutorialRunId((prev) => (prev ?? 0) + 1);
  }, []);

  const handleShare = useCallback(async () => {
    if (!scenarioIdRef.current) {
      setShareFeedback('Lancez le scénario pour générer un lien partageable.');
      return;
    }
    try {
      const params = new URLSearchParams(searchParamsString);
      params.set('scenarioId', scenarioIdRef.current);
      const url = `${window.location.origin}${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      await navigator.clipboard.writeText(url);
      setShareFeedback('Lien du scénario copié dans le presse-papiers.');
      import('canvas-confetti')
        .then((confetti) => {
          confetti.default({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.8 },
          });
        })
        .catch(() => { });
    } catch (err) {
      setShareFeedback('Impossible de copier le lien.');
    }
  }, [pathname, searchParamsString]);

  const getSessionDurationSec = () => {
    if (sessionStartedAtRef.current === null) {
      return null;
    }
    const elapsed = (Date.now() - sessionStartedAtRef.current) / 1000;
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      return null;
    }
    return Number(elapsed.toFixed(1));
  };

  const postQualtricsVoteMessage = useCallback(
    (embeddedData: Record<string, string>, backendPersisted: boolean, backendError: string | null) => {
      if (typeof window === 'undefined') return;
      if (window.self === window.top) return;
      try {
        window.parent.postMessage(
          {
            type: QUALTRICS_MESSAGE_TYPE,
            source: 'citizen-budget-lab',
            at: Date.now(),
            backendPersisted,
            backendError: backendError,
            embeddedData,
          },
          '*',
        );
      } catch (error) {
        console.warn('Failed to post Qualtrics vote message', error);
      }
    },
    [],
  );

  const buildVotePayload = useCallback(
    async (scenarioIdValue: string, sessionDurationSec: number | null) => {
      const channel = isQualtricsChannel ? 'qualtrics' : 'direct';
      const normalizedRespondentId = (respondentId || '').trim().slice(0, 128) || null;
      const normalizedEntryPath = (entryPathRef.current || '').slice(0, 1024) || null;
      const submittedAt = Math.floor(Date.now() / 1000);

      const debtNow = Array.isArray(scenarioResult?.accounting?.debtPath) && scenarioResult.accounting.debtPath.length > 0
        ? Number(scenarioResult.accounting.debtPath[0])
        : null;
      const deficitSeries = scenarioResult
        ? computeDeficitTotals(scenarioResult.accounting, scenarioResult.macro?.deltaDeficit)
        : [];
      const deficitNow = deficitSeries.length > 0 ? deficitSeries[0] : null;
      let deficitRatioNow: number | null = null;
      const deficitRatioPath = scenarioResult?.accounting?.deficitRatioPath;
      if (Array.isArray(deficitRatioPath) && deficitRatioPath.length > 0) {
        const raw = Number(deficitRatioPath[0]);
        if (Number.isFinite(raw)) {
          deficitRatioNow = raw;
        }
      } else if (deficitNow !== null) {
        const gdpPath = scenarioResult?.accounting?.gdpPath;
        if (Array.isArray(gdpPath) && gdpPath.length > 0) {
          const gdpNow = Number(gdpPath[0]);
          if (Number.isFinite(gdpNow) && gdpNow !== 0) {
            deficitRatioNow = deficitNow / gdpNow;
          }
        }
      }
      const eu3pctNow = scenarioResult?.compliance?.eu3pct?.[0] ?? null;
      const eu60pctNow = scenarioResult?.compliance?.eu60pct?.[0] ?? null;
      const netExpNow = scenarioResult?.compliance?.netExpenditure?.[0] ?? null;
      const snapshotResolutionPct =
        typeof scenarioResult?.resolution?.overallPct === 'number'
          ? Number(scenarioResult.resolution.overallPct)
          : null;

      const snapshotBase = {
        v: FINAL_SNAPSHOT_VERSION,
        scenarioId: scenarioIdValue,
        respondentId: normalizedRespondentId,
        channel,
        entryPath: normalizedEntryPath,
        sessionDurationSec,
        submittedAt,
        outcome: {
          deficitNowEur: deficitNow,
          deficitRatioNow: deficitRatioNow,
          debtNowEur: debtNow,
          resolutionPct: snapshotResolutionPct,
          eu3pctNow,
          eu60pctNow,
          netExpNow,
        },
      };

      const actions = Array.isArray(dslObject.actions) ? dslObject.actions : [];
      const snapshotCandidates: Array<{ mode: SnapshotMode; payload: Record<string, unknown> }> = [
        {
          mode: 'full',
          payload: {
            ...snapshotBase,
            dsl: {
              baselineYear: dslObject.baseline_year,
              actions,
            },
          },
        },
        {
          mode: 'ids',
          payload: {
            ...snapshotBase,
            dsl: {
              baselineYear: dslObject.baseline_year,
              actionIds: actions.map((action) => action.id),
              actionCount: actions.length,
            },
          },
        },
        {
          mode: 'minimal',
          payload: {
            ...snapshotBase,
            dsl: {
              baselineYear: dslObject.baseline_year,
              actionCount: actions.length,
            },
          },
        },
      ];
      const snapshot = await selectSnapshotCandidate(snapshotCandidates);

      const embeddedData: Record<string, string> = {
        CBL_SCENARIO_ID: scenarioIdValue,
        CBL_RESPONDENT_ID: normalizedRespondentId ?? '',
        CBL_SESSION_SEC: sessionDurationSec !== null ? String(sessionDurationSec) : '',
        CBL_CHANNEL: channel,
        CBL_ENTRY_PATH: normalizedEntryPath ?? '',
        CBL_SUBMIT_TS: String(submittedAt),
        CBL_SNAPSHOT_V: String(FINAL_SNAPSHOT_VERSION),
        CBL_SNAPSHOT_SHA256: snapshot.sha256 ?? '',
        CBL_SNAPSHOT_TRUNCATED: snapshot.truncated ? '1' : '0',
        CBL_SNAPSHOT_MODE: snapshot.mode,
        CBL_SNAPSHOT_B64: snapshot.encoded ?? '',
      };

      return {
        mutationVariables: {
          scenarioId: scenarioIdValue,
          respondentId: normalizedRespondentId,
          sessionDurationSec,
          channel,
          entryPath: normalizedEntryPath,
          finalVoteSnapshotB64: snapshot.encoded,
          finalVoteSnapshotSha256: snapshot.sha256,
          finalVoteSnapshotVersion: FINAL_SNAPSHOT_VERSION,
          finalVoteSnapshotTruncated: snapshot.truncated,
        },
        embeddedData,
      };
    },
    [
      dslObject.actions,
      dslObject.baseline_year,
      isQualtricsChannel,
      respondentId,
      scenarioResult?.accounting?.debtPath,
      scenarioResult?.accounting?.deficitRatioPath,
      scenarioResult?.accounting?.gdpPath,
      scenarioResult?.compliance?.eu3pct,
      scenarioResult?.compliance?.eu60pct,
      scenarioResult?.compliance?.netExpenditure,
      scenarioResult?.macro?.deltaDeficit,
      scenarioResult?.resolution?.overallPct,
      scenarioResult?.accounting,
    ],
  );

  const deficitPath = scenarioResult ? computeDeficitTotals(scenarioResult.accounting, scenarioResult.macro?.deltaDeficit) : [];
  const latestDeficit = deficitPath.length > 0 ? deficitPath[0] : null;
  const latestDeficitRatio = useMemo(() => {
    if (!scenarioResult) return null;
    const ratios = scenarioResult.accounting?.deficitRatioPath;
    if (Array.isArray(ratios) && ratios.length > 0) {
      const raw = Number(ratios[0]);
      if (Number.isFinite(raw)) {
        return raw;
      }
    }
    const gdpSeries = scenarioResult.accounting?.gdpPath;
    if (Array.isArray(gdpSeries) && gdpSeries.length > 0) {
      const gdp = Number(gdpSeries[0]);
      if (Number.isFinite(gdp) && gdp !== 0 && latestDeficit !== null) {
        return latestDeficit / gdp;
      }
    }
    return null;
  }, [scenarioResult, latestDeficit]);
  const resolutionPctRaw = scenarioResult?.resolution?.overallPct;
  const hasResolution = typeof resolutionPctRaw === 'number';
  const resolutionPct = hasResolution ? resolutionPctRaw : 0;

  // Ghost Preview Logic
  const previewDeficit = useMemo(() => {
    if (!previewReformId || latestDeficit === null) return null;
    const lever = policyLevers.find(l => l.id === previewReformId);
    if (!lever) return null;

    // Impact is usually positive for savings (Deficit Reduction)
    // Balance (Solde) is negative.
    // If we save +10Md, Balance goes from -140 to -130.
    // So: NewBalance = CurrentBalance + Impact.
    // However, we must check if the lever is ALREADY active.
    // If active, preview would be "Removing it" -> Balance - Impact.
    // But currently Catalog doesn't easily show active state for preview.
    // Let's assume preview is for *toggling*. 
    const isAlreadyActive = isLeverInDsl(lever.id);
    const impact = lever.fixedImpactEur || 0;

    return latestDeficit + (isAlreadyActive ? -impact : impact);
  }, [previewReformId, latestDeficit, policyLevers, isLeverInDsl]);

  const treemapData = useMemo(
    () => (masses || []).map((mission) => {
      const metric = ghostMode
        ? (displayMode === 'share' ? mission.baselineShare : mission.baselineAmount)
        : (displayMode === 'share' ? mission.share : mission.amount);
      return {
        ...mission,
        value: Math.max(metric ?? 0, 0),
      };
    }),
    [masses, displayMode, ghostMode],
  );

  const treemapColors = useMemo(
    () => treemapData.map((mission, index) => mission.color || fallbackTreemapColors[index % fallbackTreemapColors.length]),
    [treemapData],
  );

  const revenueVisuals = useMemo(() => {
    const map = new Map<string, { color: string; icon: string }>();
    (revenuePieces || []).forEach((piece, index) => {
      map.set(piece.id, {
        color: revenueColorPalette[index % revenueColorPalette.length],
        icon: revenueIcons[index % revenueIcons.length],
      });
    });
    return map;
  }, [revenuePieces]);

  const baselineMasses = useMemo(() => {
    const map = new Map<string, { name: string; amount: number }>();
    (baselineMassDataByLens.MISSION || []).forEach((category) => {
      const amount = category.baselineAmount ?? category.amount ?? 0;
      map.set(category.id, { name: category.name, amount });
    });
    return map;
  }, [baselineMassDataByLens]);

  const piecesById = useMemo(() => {
    const map = new Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>();
    [...(spendingPieces || []), ...(revenuePieces || [])].forEach((piece) => {
      map.set(piece.id, { label: piece.label, amount: piece.amountEur ?? 0, type: piece.type });
    });
    return map;
  }, [revenuePieces, spendingPieces]);

  const totalSpending = useMemo(() => {
    const sum = (masses || []).reduce((acc, m) => acc + Math.max(m.amount, 0), 0);
    return sum > 0 ? sum : baselineTotals.spending;
  }, [masses, baselineTotals.spending]);
  const baselineDeficitForShare = useMemo(() => {
    const basePath = scenarioResult?.accounting?.baselineDeficitPath;
    if (Array.isArray(basePath) && basePath.length > 0) {
      const val = Number(basePath[0]);
      if (Number.isFinite(val)) {
        return val;
      }
    }
    return baselineTotals.revenue - baselineTotals.spending;
  }, [baselineTotals.revenue, baselineTotals.spending, scenarioResult]);
  const shareDeficitDelta = useMemo(() => {
    if (latestDeficit === null) {
      return 0;
    }
    const delta = latestDeficit - baselineDeficitForShare;
    return Number.isFinite(delta) ? delta : 0;
  }, [baselineDeficitForShare, latestDeficit]);
  const baselineBalance = useMemo(
    () => baselineTotals.revenue - baselineTotals.spending,
    [baselineTotals.revenue, baselineTotals.spending],
  );
  const deficitForTotals = latestDeficit ?? baselineBalance;
  const totalRevenue = useMemo(() => {
    if (!Number.isFinite(deficitForTotals)) {
      return baselineTotals.revenue;
    }
    const total = totalSpending + deficitForTotals;
    return Number.isFinite(total) ? total : baselineTotals.revenue;
  }, [baselineTotals.revenue, deficitForTotals, totalSpending]);

  // Calculate deficit from pieces to ensure consistency with filtered revenue
  const calculatedDeficit = totalSpending - totalRevenue;
  const gdpForRatio = scenarioResult?.accounting?.gdpPath?.[0] ?? baselineGdp ?? 2800e9;
  const calculatedDeficitRatio = calculatedDeficit / gdpForRatio;

  const handleTutorialStep = useCallback((index: number) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    if (isMobile) {
      if (index === 2) {
        // Step 2: "Deux Leviers" -> Ensure a mission is open to see tabs
        const health = masses.find(m => m.id === 'M_HEALTH');
        if (health) {
          handleCategoryClick(health);
        } else {
          openMobileSpendingPanel();
        }
      }
      if (index === 3) {
        // Step 3: Priority -> Already open from step 2, ensure panel stays open
        // handleCategoryClick sets mobileSpendingOpen to true
      }
      if (index === 4) {
        // Step 4: Revenue -> Open revenue panel
        openMobileRevenuePanel();
      }
      if (index === 5) {
        // Step 5: "Vos choix en action" -> Open Scoreboard details
        closeMobileSpendingPanel();
        closeMobileRevenuePanel();
        setIsScoreboardDetailsOpen(true);
      }
      if (index === 6) {
        // Step 6: "Le Verdict" -> Close details to clear view
        setIsScoreboardDetailsOpen(false);
      }
      return;
    }

    // Desktop Logic
    // Step 2: "Deux Leviers"
    if (index === 2) {
      const health = masses.find(m => m.id === 'M_HEALTH');
      if (health) {
        handleCategoryClick(health);
      }
    }

    // Step 3: "Fixer vos Priorités" 
    if (index === 3) {
      // Already handled by step 2 usually, but ensure
      const health = masses.find(m => m.id === 'M_HEALTH');
      if (health && !selectedCategory) {
        handleCategoryClick(health);
      }
    }
    // Step 4: "L'Équation Fiscale" -> Focus on right panel
    if (index === 4) {
      handleBackClick(); // Close left panel
      // Maybe open revenue panel? Usually just highlighting the right side is enough on desktop
    }
  }, [
    closeMobileRevenuePanel,
    closeMobileSpendingPanel,
    handleBackClick,
    handleCategoryClick,
    isPanelExpanded,
    masses,
    openMobileRevenuePanel,
    openMobileSpendingPanel,
    selectedCategory,
  ]);

  const renderLeftPanelContent = (variant: 'desktop' | 'mobile') => (
    <>
      <div className="p-3 border-b border-slate-100 bg-white z-10">
        <div className="flex bg-slate-100/80 p-1 rounded-xl" id={variant === 'desktop' ? 'left-panel-tabs' : undefined}>
          <button
            onClick={() => { setActiveTab('missions'); setIsCatalogOpen(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'missions'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
          >
            <span className="material-icons text-base">account_balance</span>
            {t('build.mass_dials')}
          </button>
          <button
            onClick={() => { setActiveTab('reforms'); setIsCatalogOpen(true); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reforms'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-violet-600 hover:bg-white/50'
              }`}
          >
            <span className="material-icons text-base">auto_fix_high</span>
            {t('build.piece_dials')}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30" id={variant === 'desktop' ? 'left-panel-list' : undefined}>
        {activeTab === 'reforms' ? (
          <ReformSidebarList
            title={t('build.piece_dials')}
            subtitle="Ajustements structurels et réformes"
            levers={spendingLevers}
            onSelectReform={(lever) => {
              if (!isLeverInDsl(lever.id)) {
                addLeverToDsl(lever);
              } else {
                removeLeverFromDsl(lever.id);
              }
            }}
            onHoverReform={setPreviewReformId}
            isLeverSelected={isLeverInDsl}
          />
        ) : (
          !isPanelExpanded ? (
            <MassCategoryList
              categories={masses}
              onSelect={handleCategoryClick}
              formatCurrency={formatCurrency}
              formatShare={formatShare}
              displayMode={displayMode}
            />
          ) : (
            selectedCategory && (
              <MassCategoryPanel
                category={selectedCategory}
                targetPercent={targetPercent}
                targetRangeMax={targetRangeMax}
                onTargetPercentChange={setTargetPercent}
                onRangeChange={handleTargetRangeChange}
                onApplyTarget={handleApplyTarget}
                onClearTarget={() => {
                  setTargetPercent(0);
                  setTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
                }}
                onClose={handleBackClick}
                suggestedLevers={suggestedLevers}
                onLeverToggle={(lever) =>
                  (isLeverInDsl(lever.id) ? removeLeverFromDsl(lever.id) : addLeverToDsl(lever))
                }
                isLeverSelected={isLeverInDsl}
                popularIntents={popularIntents}
                onIntentClick={handleIntentClick}
                formatCurrency={formatCurrency}
                formatShare={formatShare}
                displayMode={displayMode}
              />
            )
          )
        )}
      </div>
    </>
  );

  const renderRightPanelContent = (variant: 'desktop' | 'mobile') => (
    <>
      <div className="p-3 border-b border-slate-100 bg-white z-10">
        <div className="flex bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveRevenueTab('revenues');
              toggleRevenuePanel(false);
              setSelectedRevenueCategory(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeRevenueTab === 'revenues'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
          >
            <span className="material-icons text-base">payments</span>
            {t('build.revenues')}
          </button>
          <button
            onClick={() => {
              setActiveRevenueTab('reforms');
              toggleRevenuePanel(false);
              setSelectedRevenueCategory(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeRevenueTab === 'reforms'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'
              }`}
          >
            <span className="material-icons text-base">receipt_long</span>
            {t('build.piece_dials')}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeRevenueTab === 'reforms' ? (
          <ReformSidebarList
            title={t('build.piece_dials')}
            subtitle="Fiscalité et ressources collectives"
            levers={revenueLevers}
            onSelectReform={(lever) => {
              if (!isLeverInDsl(lever.id)) {
                addLeverToDsl(lever);
              } else {
                removeLeverFromDsl(lever.id);
              }
            }}
            onHoverReform={setPreviewReformId}
            isLeverSelected={isLeverInDsl}
            side="right"
          />
        ) : (
          !isRevenuePanelExpanded ? (
            <RevenueCategoryList
              categories={revenuePieces}
              onSelect={handleRevenueFamilyClick}
              formatCurrency={formatCurrency}
              visuals={revenueVisuals}
              families={revenueFamilies}
            />
          ) : (
            <>
              {selectedRevenueCategory && (
                <RevenueCategoryPanel
                  category={selectedRevenueCategory}
                  family={revenueFamilies.find(f => f.id === selectedRevenueCategory.familyId)}
                  visual={revenueVisuals.get(selectedRevenueCategory.id)}
                  targetPercent={revenueTargetPercent}
                  targetRangeMax={revenueTargetRangeMax}
                  onTargetPercentChange={setRevenueTargetPercent}
                  onRangeChange={handleRevenueRangeChange}
                  onApplyTarget={handleApplyRevenueTarget}
                  onClearTarget={() => {
                    setRevenueTargetPercent(0);
                    setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
                  }}
                  onBack={handleRevenueBackClick}
                  suggestedLevers={suggestedLevers}
                  onLeverToggle={(lever) =>
                    (isLeverInDsl(lever.id) ? removeLeverFromDsl(lever.id) : addLeverToDsl(lever))
                  }
                  isLeverSelected={isLeverInDsl}
                  popularIntents={popularIntents}
                  onIntentClick={handleIntentClick}
                  formatCurrency={formatCurrency}
                  formatShare={formatShare}
                  displayMode={displayMode}
                />
              )}
              {selectedRevenueFamily && (
                <RevenueFamilyPanel
                  family={selectedRevenueFamily}
                  pieces={revenuePieces.filter(p => p.familyId === selectedRevenueFamily.id)}
                  levers={suggestedLevers}
                  targetPercent={revenueTargetPercent}
                  targetRangeMax={revenueTargetRangeMax}
                  onTargetPercentChange={setRevenueTargetPercent}
                  onRangeChange={handleRevenueRangeChange}
                  onApplyTarget={handleApplyRevenueTarget}
                  onClearTarget={() => {
                    setRevenueTargetPercent(0);
                    setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
                  }}
                  onBack={handleRevenueBackClick}
                  onLeverToggle={(lever) =>
                    (isLeverInDsl(lever.id) ? removeLeverFromDsl(lever.id) : addLeverToDsl(lever))
                  }
                  isLeverSelected={isLeverInDsl}
                  formatCurrency={formatCurrency}
                  formatShare={formatShare}
                />
              )}
            </>
          )
        )}
      </div>
      {/* Confirmation Modal for Family Actions */}
      {pendingFamilyAction && (
        <FamilyActionModal
          family={pendingFamilyAction.family}
          targetPercent={pendingFamilyAction.targetPercent}
          totalAmount={revenuePieces
            .filter(p => p.familyId === pendingFamilyAction.family.id)
            .reduce((sum, p) => sum + (p.amountEur || 0), 0)
          }
          formatCurrency={formatCurrency}
          onConfirm={handleConfirmFamilyApply}
          onCancel={() => setPendingFamilyAction(null)}
        />
      )}
    </>
  );

  if (initialLoading) {
    return <BuildPageSkeleton />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  return (
    <div className="build-page-container font-['Outfit']">
      <Scoreboard
        scenarioResult={scenarioResult}
        baselineTotals={baselineTotals}
        currentTotals={{ spending: totalSpending, revenue: totalRevenue }}
        baselineMasses={baselineMasses}
        piecesById={piecesById}
        actions={dslObject.actions}
        policyLevers={policyLevers}
        onReset={reset}
        onShare={() => setIsDebriefOpen(true)}
        onRunTutorial={handleRunTutorial}
        year={year}
        previewDeficit={previewDeficit}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        onOpenSpendingPanel={openMobileSpendingPanel}
        onOpenRevenuePanel={openMobileRevenuePanel}
        activeMobileTab={isMobileRevenueOpen ? 'revenue' : 'spending'}
        isDetailsOpen={isScoreboardDetailsOpen}
        onToggleDetails={() => setIsScoreboardDetailsOpen(prev => !prev)}
      />

      <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {isQualtricsChannel && (
          <div className="mx-3 mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:mx-4">
            <p className="font-semibold">Consigne questionnaire</p>
            <p className="mt-1">
              Apr&egrave;s avoir cliqu&eacute; sur &laquo; D&eacute;poser mon vote &raquo;, faites d&eacute;filer vers le bas puis cliquez sur la fl&egrave;che bleue &laquo; Next &raquo; de Qualtrics pour passer &agrave; la question suivante.
            </p>
          </div>
        )}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr_350px] gap-3 sm:gap-4 p-3 sm:p-4 min-h-0">



          {/* LEFT PANEL: SPENDING */}
          <div className="hidden lg:flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            {renderLeftPanelContent('desktop')}
          </div>

          {/* CENTER PANEL: TREEMAP */}
          <div id="treemap-container" className="flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative min-h-[50vh] sm:min-h-[60vh] lg:min-h-0">
            {/* Added pb-11 to create safe space for the absolute positioned NewsTicker (h-10) */}
            <div className="flex-1 relative p-1 min-h-0 pb-11">
              <TreemapChart
                data={treemapData}
                colors={treemapColors}
                resolutionData={scenarioResult?.resolution?.byMass || []}
                mode={displayMode}
                onSelect={(item) => {
                  if (lens !== 'mass') {
                    setLens('mass');
                  }
                  handleCategoryClick(item as MassCategory);
                }}
              />


            </div>

            <NewsTicker />
          </div>

          {/* RIGHT PANEL: REVENUE */}
          <div id="right-panel-revenue" className="hidden lg:flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {renderRightPanelContent('desktop')}
          </div>
        </div>

        {isMobileSpendingOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
              onClick={closeMobileSpendingPanel}
            />
            <div className="relative flex flex-col h-full w-full">
              <div className="flex items-center justify-between px-4 py-3 bg-white/95 border-b border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="material-icons text-base text-slate-500">account_balance</span>
                  Budget public
                </div>
                <button
                  type="button"
                  onClick={closeMobileSpendingPanel}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  <span className="material-icons text-base">close</span>
                  Fermer
                </button>
              </div>
              <div className="flex-1 min-h-0 p-3" id="mobile-spending-panel">
                <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  {renderLeftPanelContent('mobile')}
                </div>
              </div>
            </div>
          </div>
        )}

        {isMobileRevenueOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
              onClick={closeMobileRevenuePanel}
            />
            <div className="relative flex flex-col h-full w-full">
              <div className="flex items-center justify-between px-4 py-3 bg-white/95 border-b border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="material-icons text-base text-slate-500">payments</span>
                  Recettes publiques
                </div>
                <button
                  type="button"
                  onClick={closeMobileRevenuePanel}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  <span className="material-icons text-base">close</span>
                  Fermer
                </button>
              </div>
              <div className="flex-1 min-h-0 p-3" id="mobile-revenue-panel">
                <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  {renderRightPanelContent('mobile')}
                </div>
              </div>
            </div>
          </div>
        )}

        {shareFeedback && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800 text-white rounded-full shadow-2xl flex items-center gap-3 animate-slide-up z-50">
            <span className="material-icons text-green-400">check_circle</span>
            {shareFeedback}
          </div>
        )}

        <TutorialOverlay onComplete={() => { }} startSignal={tutorialRunId} onStepChange={handleTutorialStep} />

        <DebriefModal
          isOpen={isDebriefOpen}
          onClose={() => setIsDebriefOpen(false)}
          onConfirmVote={async () => {
            if (voteSubmitInFlightRef.current) {
              return;
            }
            voteSubmitInFlightRef.current = true;
            setIsVoteSubmitting(true);
            let backendPersisted = false;
            let backendError: string | null = null;
            let embeddedData: Record<string, string> = {};
            try {
              if (scenarioResult?.id) {
                const payload = await buildVotePayload(scenarioResult.id, getSessionDurationSec());
                embeddedData = payload.embeddedData;
                const response = await gqlRequest(submitVoteMutation, payload.mutationVariables);
                backendPersisted = Boolean(response?.submitVote);
                if (!backendPersisted) {
                  backendError = 'submitVote returned false';
                }
              }
            } catch (e) {
              console.error(e);
              backendError = e instanceof Error ? e.message : String(e);
            } finally {
              voteSubmitInFlightRef.current = false;
              setIsVoteSubmitting(false);
            }
            postQualtricsVoteMessage(embeddedData, backendPersisted, backendError);
            if (backendPersisted || isQualtricsChannel) {
              if (!backendPersisted && isQualtricsChannel) {
                setShareFeedback('Vote transmis au questionnaire, sauvegarde serveur indisponible.');
              }
              setIsShareCardOpen(true);
            } else {
              alert("Erreur lors de l'enregistrement du vote.");
            }
            setIsDebriefOpen(false);
          }}
          isSubmitting={isVoteSubmitting}
          scenarioResult={scenarioResult}
          deficit={latestDeficit}
        />
        <FloatingShareCard
          isOpen={isShareCardOpen}
          onClose={() => setIsShareCardOpen(false)}
          onCopyLink={handleShare}
          deficit={latestDeficit}
          deficitRatio={latestDeficitRatio}
          deficitDelta={shareDeficitDelta}
          baselineTotals={baselineTotals}
          currentTotals={{ spending: totalSpending, revenue: totalRevenue }}
          baselineMasses={baselineMasses}
          piecesById={piecesById}
          actions={dslObject.actions}
          policyLevers={policyLevers}
          year={year}
          shareUrl={shareUrl}
        />
      </div>
    </div>
  );
}
