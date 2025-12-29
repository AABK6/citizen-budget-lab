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
} from './types';
import { useBuildState } from './useBuildState';
import { runScenarioForDsl } from '@/lib/permalink';
import { MassCategoryList } from './components/MassCategoryList';
import { MassCategoryPanel } from './components/MassCategoryPanel';
import { RevenueCategoryList } from './components/RevenueCategoryList';
import { RevenueCategoryPanel } from './components/RevenueCategoryPanel';
import { computeDeficitTotals } from '@/lib/fiscal';
import { Scoreboard } from './components/Scoreboard';
import { ReformSidebarList } from './components/ReformSidebarList';
import { TutorialOverlay } from './components/TutorialOverlay';
import { DebriefModal } from './components/DebriefModal';
import { NewsTicker } from './components/NewsTicker';

const cloneCategories = (categories: MassCategory[]) =>
  categories.map((category) => ({ ...category }));

const fallbackTreemapColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];
const revenueColorPalette = ['#0ea5e9', '#f97316', '#9333ea', '#16a34a', '#dc2626', '#facc15', '#0f766e', '#7c3aed', '#22c55e', '#2563eb'];
const revenueIcons = ['💶', '📈', '🏦', '🧾', '🏭', '🛢️', '🚬', '💡', '🎯', '💼'];
const percentFormatter = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TARGET_PERCENT_DEFAULT_RANGE = 10;
const TARGET_PERCENT_EXPANDED_RANGE = 25;
const TARGET_PERCENT_STEP = 0.5;
const EPSILON = 1e-6;

export default function BuildPageClient() {
  // const { t } = useI18n();
  const t = (k: string) => k;
  const router = useRouter();
  const pathname = usePathname();
  const { state, actions } = useBuildState(INITIAL_DSL_OBJECT.baseline_year);
  const [ghostMode, setGhostMode] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
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
  } = state;
  const [displayMode, setDisplayMode] = useState<'amount' | 'share'>('amount');
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

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [tutorialRunId, setTutorialRunId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'missions' | 'reforms'>('missions');
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
  const scenarioIdRef = useRef<string | null>(scenarioId);
  const latestRunRef = useRef(0);


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
    if (urlScenarioId) {
      if (urlScenarioId !== scenarioId) {
        setScenarioId(urlScenarioId);
        const fetchDsl = async () => {
          try {
            const { scenario } = await gqlRequest(getScenarioDslQuery, { id: urlScenarioId });
            setDslObject(parseDsl(atob(scenario.dsl)));
          } catch (err) {
            setError('Failed to load scenario');
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
      const currentScenarioId = scenarioIdRef.current;
      if (scenarioData?.id && scenarioData.id !== currentScenarioId) {
        const params = new URLSearchParams(searchParamsString);
        params.set('scenarioId', scenarioData.id);
        const queryString = params.toString();
        const href = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(href, { scroll: false });
      }
      scenarioIdRef.current = scenarioData?.id ?? null;
    } catch (err: any) {
      setScenarioError(err.message || 'Failed to run scenario');
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
      const data = await gqlRequest(buildPageQuery, { year });

      const baselineAmounts: Record<string, number> = {};
      data.legoBaseline.pieces.forEach((p: any) => {
        baselineAmounts[p.id] = p.amountEur;
      });

      const allPieces: LegoPiece[] = data.legoPieces.map((p: any) => ({ ...p, amountEur: baselineAmounts[p.id] || 0 }));

      const spending = allPieces.filter((p) => p.type === 'expenditure');
      const revenue = allPieces.filter((p) => p.type === 'revenue');

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
        policyLevers: data.policyLevers,
        popularIntents: data.popularIntents,
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
      setError(err.message || 'Failed to fetch data');
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
      setError(err.message || 'Failed to fetch suggestions');
    }
  };

  const addLeverToDsl = (lever: PolicyLever) => {
    setDslObject(currentDslObject => {
      const isRevenue = lever.family === 'TAXES';
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
  };

  const removeLeverFromDsl = (leverId: string) => {
    setDslObject(currentDslObject => {
      return {
        ...currentDslObject,
        actions: currentDslObject.actions.filter((a: DslAction) => a.id !== leverId),
      };
    });
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
    if (!selectedRevenueCategory) return;

    const baseline = selectedRevenueCategory.amountEur || 0;
    const baseMagnitude = Math.abs(baseline);
    const amount = (baseMagnitude * revenueTargetPercent) / 100;
    const pieceId = selectedRevenueCategory.id;

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
    togglePanel(false);
    setSelectedCategory(null);
    const pieceId = category.id;
    const targetAction = dslObject.actions.find((action: DslAction) => action.id === `target_${pieceId}`);
    const baselineAmount = category.amountEur || 0;
    const baseMagnitude = Math.abs(baselineAmount);
    if (targetAction && baseMagnitude !== 0) {
      const signedAmount = targetAction.amount_eur * (targetAction.op === 'increase' ? 1 : -1);
      const rawPercent = (signedAmount / baseMagnitude) * 100;
      const snapped = Math.round(rawPercent / TARGET_PERCENT_STEP) * TARGET_PERCENT_STEP;
      const safePercent = Number.isFinite(snapped) ? Number(snapped.toFixed(1)) : 0;
      const boundedPercent = Math.max(-TARGET_PERCENT_EXPANDED_RANGE, Math.min(TARGET_PERCENT_EXPANDED_RANGE, safePercent));
      setRevenueTargetPercent(boundedPercent);
      setRevenueTargetRangeMax(Math.abs(boundedPercent) > TARGET_PERCENT_DEFAULT_RANGE ? TARGET_PERCENT_EXPANDED_RANGE : TARGET_PERCENT_DEFAULT_RANGE);
    } else {
      setRevenueTargetPercent(0);
      setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
    }
    setSelectedRevenueCategory(category);
    toggleRevenuePanel(true);

    const revenueLevers = policyLevers.filter(lever => {
      if (lever.family !== 'TAXES') return false;
      if (!lever.massMapping) return true;
      const weight = lever.massMapping[category.id];
      return typeof weight === 'number' && weight > 0;
    });
    setSuggestedLevers(revenueLevers);
  };

  const handleRevenueBackClick = () => {
    toggleRevenuePanel(false);
    setSelectedRevenueCategory(null);
    setRevenueTargetPercent(0);
    setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
  };

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    return `${sign}€${(Math.abs(amount) / 1e9).toFixed(1)}B`;
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
      setShareFeedback('Run the scenario to generate a shareable link.');
      return;
    }
    try {
      const params = new URLSearchParams(searchParamsString);
      params.set('scenarioId', scenarioIdRef.current);
      const url = `${window.location.origin}${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      await navigator.clipboard.writeText(url);
      setShareFeedback('Scenario link copied to clipboard.');
    } catch (err) {
      setShareFeedback('Unable to copy link.');
    }
  }, [pathname, searchParamsString]);

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

  const totalSpending = useMemo(() => {
    const sum = (masses || []).reduce((acc, m) => acc + Math.max(m.amount, 0), 0);
    return sum > 0 ? sum : baselineTotals.spending;
  }, [masses, baselineTotals.spending]);
  const totalRevenue = useMemo(() => {
    const sum = (revenuePieces || []).reduce((acc, p) => acc + (p.amountEur || 0), 0);
    return sum > 0 ? sum : baselineTotals.revenue;
  }, [baselineTotals.revenue, revenuePieces]);

  // Calculate deficit from pieces to ensure consistency with filtered revenue
  const calculatedDeficit = totalSpending - totalRevenue;
  const gdpForRatio = scenarioResult?.accounting?.gdpPath?.[0] ?? baselineGdp ?? 2800e9;
  const calculatedDeficitRatio = calculatedDeficit / gdpForRatio;

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
        onReset={reset}
        onShare={() => setIsDebriefOpen(true)}
        onRunTutorial={handleRunTutorial}
        year={year}
        previewDeficit={previewDeficit}
      />

      <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <div className="flex-1 grid grid-cols-[380px_1fr_350px] gap-4 p-4 min-h-0">



          {/* LEFT PANEL: SPENDING */}
          <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">

            {/* Unified Header with Tabs */}
            <div className="p-3 border-b border-slate-100 bg-white z-10">
              <div className="flex bg-slate-100/80 p-1 rounded-xl" id="left-panel-tabs">
                <button
                  onClick={() => { setActiveTab('missions'); setIsCatalogOpen(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'missions'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                >
                  <span className="material-icons text-base">account_balance</span>
                  Missions
                </button>
                <button
                  onClick={() => { setActiveTab('reforms'); setIsCatalogOpen(true); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reforms'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-violet-600 hover:bg-white/50'
                    }`}
                >
                  <span className="material-icons text-base">auto_fix_high</span>
                  Réformes
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30" id="left-panel-list">
              {activeTab === 'reforms' ? (
                <ReformSidebarList
                  levers={policyLevers}
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
          </div>

          {/* CENTER PANEL: TREEMAP */}
          <div id="treemap-container" className="flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
            <div className="flex-1 relative p-1 min-h-0">
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

              {/* Minimal view toggles at bottom left */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 p-1 flex gap-1 z-10">
                <button
                  onClick={() => setDisplayMode('amount')}
                  className={`px-3 py-1 rounded text-xs font-bold ${displayMode === 'amount' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  €
                </button>
                <button
                  onClick={() => setDisplayMode('share')}
                  className={`px-3 py-1 rounded text-xs font-bold ${displayMode === 'share' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  %
                </button>
              </div>
            </div>

            <NewsTicker />
          </div>

          {/* RIGHT PANEL: REVENUE */}
          <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {!isRevenuePanelExpanded ? (
                <RevenueCategoryList
                  categories={revenuePieces}
                  onSelect={handleRevenueCategoryClick}
                  formatCurrency={formatCurrency}
                  visuals={revenueVisuals}
                />
              ) : (
                selectedRevenueCategory && (
                  <RevenueCategoryPanel
                    category={selectedRevenueCategory}
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
                  />
                )
              )}
            </div>
          </div>
        </div>

        {shareFeedback && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800 text-white rounded-full shadow-2xl flex items-center gap-3 animate-slide-up z-50">
            <span className="material-icons text-green-400">check_circle</span>
            {shareFeedback}
          </div>
        )}

        <TutorialOverlay onComplete={() => { }} startSignal={tutorialRunId} />

        <DebriefModal
          isOpen={isDebriefOpen}
          onClose={() => setIsDebriefOpen(false)}
          onConfirmVote={async () => {
            try {
              if (scenarioResult?.id) {
                await gqlRequest(submitVoteMutation, { scenarioId: scenarioResult.id });
                alert("Votre vote a été enregistré ! \n\nMerci d'avoir participé à l'Atelier du Budget.");
              }
            } catch (e) {
              console.error(e);
              alert("Erreur lors de l'enregistrement du vote.");
            }
            setIsDebriefOpen(false);
          }}
          scenarioResult={scenarioResult}
          deficit={latestDeficit}
        />
      </div>
    </div>
  );
}
