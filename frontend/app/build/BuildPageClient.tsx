"use client"

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { gqlRequest } from '@/lib/graphql';
import { parseDsl, serializeDsl } from '@/lib/dsl';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { BuildPageSkeleton } from '@/components/BuildPageSkeleton';
import { buildPageQuery, suggestLeversQuery, getScenarioDslQuery } from '@/lib/queries';
import { TreemapChart } from '@/components/Treemap';
import { DeficitTrajectoryChart } from '@/components/DeficitTrajectoryChart';
import { Sparkline } from '@/components/Sparkline';
import { useHistory } from '@/lib/useHistory';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DslAction,
  DslObject,
  INITIAL_DSL_OBJECT,
  LegoPiece,
  PolicyLever,
  PopularIntent,
  BuildLens,
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

const fallbackTreemapColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];
const revenueColorPalette = ['#0ea5e9', '#f97316', '#9333ea', '#16a34a', '#dc2626', '#facc15', '#0f766e', '#7c3aed', '#22c55e', '#2563eb'];
const revenueIcons = ['💶', '📈', '🏦', '🧾', '🏭', '🛢️', '🚬', '💡', '🎯', '💼'];
const percentFormatter = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TARGET_PERCENT_DEFAULT_RANGE = 10;
const TARGET_PERCENT_EXPANDED_RANGE = 25;
const TARGET_PERCENT_STEP = 0.5;
const EPSILON = 1e-6;

function formatBillionsLabel(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  const billions = amount / 1e9;
  const abs = Math.abs(billions);
  const digits = abs >= 100 ? 0 : 1;
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(billions)} Md€`;
}

function formatMacroPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (value === 0) {
    return new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(0);
  }
  const abs = Math.abs(value);
  let digits = 1;
  if (abs < 0.05) {
    digits = 2;
  }
  if (abs < 0.005) {
    digits = 3;
  }
  return new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export default function BuildPageClient() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { state, actions } = useBuildState(INITIAL_DSL_OBJECT.baseline_year);
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
    aggregationLens,
    massLabels,
    missionLabels,
  } = state;
  const [displayMode, setDisplayMode] = useState<'amount' | 'share'>('amount');
  const [massDataByLens, setMassDataByLens] = useState<Record<AggregationLens, MassCategory[]>>({
    MISSION: [],
    COFOG: [],
  });
  const [baselineMassDataByLens, setBaselineMassDataByLens] = useState<Record<AggregationLens, MassCategory[]>>({
    MISSION: [],
    COFOG: [],
  });

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
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
  const aggregationLensRef = useRef<AggregationLens>(aggregationLens);

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
    aggregationLensRef.current = aggregationLens;
  }, [aggregationLens]);

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
    if (aggregationLensRef.current === lensFromResult) {
      setMasses(finalCategories);
    }
  }, [baselineMassDataByLens, massLabels, missionLabels, scenarioResult, setMassDataByLens, setMasses]);

  useEffect(() => {
    const lensFromDsl = String(dslObject.assumptions?.lens || 'MISSION').toUpperCase() as AggregationLens;
    if ((lensFromDsl === 'MISSION' || lensFromDsl === 'COFOG') && lensFromDsl !== aggregationLens) {
      setAggregationLens(lensFromDsl);
      const nextMasses = massDataByLens[lensFromDsl] ?? [];
      setMasses(nextMasses);
      if (selectedCategory && !nextMasses.some((mass) => mass.id === selectedCategory.id)) {
        setSelectedCategory(null);
        togglePanel(false);
      }
    }
  }, [aggregationLens, dslObject, massDataByLens, selectedCategory, setAggregationLens, setMasses, setSelectedCategory, togglePanel]);

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
      const result = await runScenarioForDsl(dslString, aggregationLens);
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
  }, [aggregationLens, dslString, pathname, router, searchParamsString, setScenarioError, setScenarioLoading, setScenarioResult]);

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

      const cofogAllocations = toAllocations(data.builderMassesCofog ?? null, cofogFallbackTotals);
      const cofogCategories = buildCategories(cofogAllocations, cofogPieceMap, massLabelMap, '📊');

      const missionBaseline = cloneCategories(missionCategories);
      const cofogBaseline = cloneCategories(cofogCategories);
      setBaselineMassDataByLens({ MISSION: missionBaseline, COFOG: cofogBaseline });

      const missionCurrent = cloneCategories(missionBaseline);
      const cofogCurrent = cloneCategories(cofogBaseline);
      setMassDataByLens({ MISSION: missionCurrent, COFOG: cofogCurrent });
      const lensForCategories = aggregationLensRef.current;
      setMasses(lensForCategories === 'COFOG' ? cofogCurrent : missionCurrent);

      setData({
        spendingPieces: spending,
        revenuePieces: revenue,
        policyLevers: data.policyLevers,
        popularIntents: data.popularIntents,
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setInitialLoading(false);
    }
  }, [setData, setError, setInitialLoading, setLabels, setMassDataByLens, setMasses, setScenarioError, year]);

  const handleLensSwitch = (nextLens: AggregationLens) => {
    if (nextLens === aggregationLens) {
      return;
    }
    setAggregationLens(nextLens);
    const nextMasses = massDataByLens[nextLens] ?? [];
    setMasses(nextMasses);
    setSelectedCategory(null);
    togglePanel(false);
    setTargetPercent(0);
    setTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
    setSelectedRevenueCategory(null);
    toggleRevenuePanel(false);
    setRevenueTargetPercent(0);
    setRevenueTargetRangeMax(TARGET_PERCENT_DEFAULT_RANGE);
    setDslObject({
      ...dslObject,
      assumptions: {
        ...dslObject.assumptions,
        lens: nextLens,
      },
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run scenario initially and whenever DSL changes
useEffect(() => {
  runScenario();
}, [dslObject, runScenario]);

  const handleCategoryClick = async (category: MassCategory) => {
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
      const targetKey = aggregationLens === 'COFOG'
        ? `cofog.${massId}`
        : `mission.${massId.toUpperCase().startsWith('M_') ? massId.toUpperCase() : massId}`;
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

  const scenarioAccounting = scenarioResult?.accounting;
  const scenarioMacroDelta = scenarioResult?.macro?.deltaDeficit;
  const deficitPath = useMemo(
    () => (scenarioAccounting ? computeDeficitTotals(scenarioAccounting, scenarioMacroDelta) : []),
    [scenarioAccounting, scenarioMacroDelta],
  );
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

  const baselineDeficitPath = useMemo(() => {
    if (!scenarioResult?.accounting?.baselineDeficitPath) {
      return [];
    }
    return scenarioResult.accounting.baselineDeficitPath.map((value: number | string) => Number(value) || 0);
  }, [scenarioResult]);

  const deficitYears = useMemo(
    () => (deficitPath.length ? Array.from({ length: deficitPath.length }, (_, idx) => year + idx) : []),
    [deficitPath, year],
  );

  const gdpSeries = useMemo(() => {
    if (!scenarioResult?.accounting?.gdpPath) {
      return [];
    }
    return scenarioResult.accounting.gdpPath.map((value: number | string) => Number(value) || 0);
  }, [scenarioResult]);

  const macroDeltaSeries = useMemo(() => {
    if (!scenarioResult?.macro?.deltaGDP) {
      return [];
    }
    return scenarioResult.macro.deltaGDP.map((value: number | string) => Number(value) || 0);
  }, [scenarioResult]);

  const macroDeltaPercentSeries = useMemo(() => {
    if (!macroDeltaSeries.length || !gdpSeries.length) {
      return [];
    }
    const length = Math.min(macroDeltaSeries.length, gdpSeries.length);
    const result: number[] = [];
    for (let i = 0; i < length; i += 1) {
      const gdp = gdpSeries[i];
      const delta = macroDeltaSeries[i];
      result.push(gdp !== 0 ? delta / gdp : 0);
    }
    return result;
  }, [gdpSeries, macroDeltaSeries]);

  const macroYears = useMemo(
    () => (macroDeltaPercentSeries.length ? Array.from({ length: macroDeltaPercentSeries.length }, (_, idx) => year + idx) : []),
    [macroDeltaPercentSeries, year],
  );

  const hasDeficitSeries = deficitPath.length > 0;
  const hasMacroSeries = macroDeltaPercentSeries.length > 0;
  const deficitStartYear = deficitYears[0] ?? year;
  const deficitEndYear = deficitYears.length > 1 ? deficitYears[deficitYears.length - 1] : deficitStartYear;
  const macroStartYear = macroYears[0] ?? year;
  const macroEndYear = macroYears.length > 1 ? macroYears[macroYears.length - 1] : macroStartYear;
  const deficitRangeLabel = hasDeficitSeries
    ? deficitYears.length > 1
      ? `${deficitStartYear} → ${deficitEndYear}`
      : `${deficitStartYear}`
    : null;
  const macroRangeLabel = hasMacroSeries
    ? macroYears.length > 1
      ? `${macroStartYear} → ${macroEndYear}`
      : `${macroStartYear}`
    : null;
  const macroPrimaryValue = hasMacroSeries ? macroDeltaPercentSeries[0] : 0;
  const macroLatestValue = hasMacroSeries
    ? macroDeltaPercentSeries[macroDeltaPercentSeries.length - 1]
    : macroPrimaryValue;

  const treemapData = useMemo(
    () => masses.map((mission) => {
      const metric = displayMode === 'share' ? mission.share : mission.amount;
      return {
        ...mission,
        value: Math.max(metric, 0),
      };
    }),
    [masses, displayMode],
  );

  const treemapColors = useMemo(
    () => treemapData.map((mission, index) => mission.color || fallbackTreemapColors[index % fallbackTreemapColors.length]),
    [treemapData],
  );

  const revenueVisuals = useMemo(() => {
    const map = new Map<string, { color: string; icon: string }>();
    revenuePieces.forEach((piece, index) => {
      map.set(piece.id, {
        color: revenueColorPalette[index % revenueColorPalette.length],
        icon: revenueIcons[index % revenueIcons.length],
      });
    });
    return map;
  }, [revenuePieces]);

  if (initialLoading) {
    return <BuildPageSkeleton />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  return (
    <div className="build-page-container">
      <div className="mission-control" role="region" aria-label="Mission control toolbar">
        <div className="mission-cluster mission-cluster--left">
          <div className="mission-header-bar">
            
            
            <div className="mission-year" aria-label="Scenario baseline year">
              <i className="material-icons" aria-hidden="true">calendar_today</i>
              <span>{year}</span>
            </div>
          </div>
        </div>

        <div className="mission-cluster mission-cluster--center">
          <div className="control-stack">
            <div className="aggregation-toggle" role="group" aria-label="Budget lens">
              <button
                type="button"
                className={`toggle-btn ${aggregationLens === 'MISSION' ? 'active' : ''}`}
                onClick={() => handleLensSwitch('MISSION')}
                aria-pressed={aggregationLens === 'MISSION'}
              >
                Administrative lens
              </button>
              <button
                type="button"
                className={`toggle-btn ${aggregationLens === 'COFOG' ? 'active' : ''}`}
                onClick={() => handleLensSwitch('COFOG')}
                aria-pressed={aggregationLens === 'COFOG'}
              >
                COFOG lens
              </button>
            </div>
            <div className="display-toggle" role="group" aria-label="Display mode">
              <span className="display-prefix">Display:</span>
              <button
                type="button"
                className={`toggle-btn ${displayMode === 'amount' ? 'active' : ''}`}
                onClick={() => setDisplayMode('amount')}
                aria-pressed={displayMode === 'amount'}
              >
                <span className="toggle-icon" aria-hidden="true">€</span>
                <span className="toggle-label">Amounts</span>
              </button>
              <button
                type="button"
                className={`toggle-btn ${displayMode === 'share' ? 'active' : ''}`}
                onClick={() => setDisplayMode('share')}
                aria-pressed={displayMode === 'share'}
              >
                <span className="toggle-icon" aria-hidden="true">%</span>
                <span className="toggle-label">Shares</span>
              </button>
            </div>
            <div className="view-switcher" role="tablist" aria-label="Treemap view">
              <button
                type="button"
                role="tab"
                className={`lens-option ${lens === 'mass' ? 'active' : ''}`}
                onClick={() => setLens('mass')}
                aria-selected={lens === 'mass'}
              >
                By mission
              </button>
              <button
                type="button"
                role="tab"
                className={`lens-option ${lens === 'family' ? 'active' : ''}`}
                onClick={() => setLens('family')}
                aria-selected={lens === 'family'}
              >
                By family
              </button>
              <button
                type="button"
                role="tab"
                className={`lens-option ${lens === 'reform' ? 'active' : ''}`}
                onClick={() => setLens('reform')}
                aria-selected={lens === 'reform'}
              >
                By reform
              </button>
            </div>
          </div>
        </div>

        <div className="mission-cluster mission-cluster--right">
          <div className="mission-history" role="group" aria-label="Scenario history controls">
            <button type="button" className="ghost-btn ghost-btn--muted" onClick={undo} disabled={!canUndo}>
              <i className="material-icons" aria-hidden="true">undo</i>
              Undo
            </button>
            <button type="button" className="ghost-btn ghost-btn--muted" onClick={redo} disabled={!canRedo}>
              <i className="material-icons" aria-hidden="true">redo</i>
              Redo
            </button>
            <button type="button" className="ghost-btn ghost-btn--muted" onClick={reset}>
              <i className="material-icons" aria-hidden="true">refresh</i>
              Reset
            </button>
          </div>
          <button type="button" className="ghost-btn" onClick={handleShare}>
            <i className="material-icons" aria-hidden="true">link</i>
            Share
          </button>
        </div>
      </div>

      <div className="main-content-stage">
        <div className="main-content">
          <div className="left-panel">
            {lens === 'mass' && !isPanelExpanded && (
              <MassCategoryList
                categories={masses}
                onSelect={handleCategoryClick}
                formatCurrency={formatCurrency}
                formatShare={formatShare}
                displayMode={displayMode}
              />
            )}
            {lens === 'mass' && isPanelExpanded && selectedCategory && (
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
            )}
            {lens === 'family' && (
              <>
                <div className="panel-header">Reforms by Family</div>
                {Object.entries(policyLevers.reduce((acc, lever) => {
                  const family = lever.family || 'Other';
                  if (!acc[family]) {
                    acc[family] = [];
                  }
                  acc[family].push(lever);
                  return acc;
                }, {} as Record<string, PolicyLever[]>)).map(([family, levers]) => (
                  <div key={family} className="spending-category">
                    <div className="category-header" onClick={() => handleFamilyClick(family)}>
                      <div className="category-name">{family}</div>
                    </div>
                    {expandedFamilies.includes(family) && (
                      <div className="reforms-section">
                        {levers.map((reform, index) => (
                          <div key={index} className={`reform-item ${isLeverInDsl(reform.id) ? 'applied' : ''}`}>
                            <div className="reform-details">
                              <div className="reform-name">{reform.label}</div>
                              <div className="reform-description">{reform.description}</div>
                            </div>
                            <div className="reform-actions">
                              <div className="reform-impact">
                                <span className={
                                  reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'
                                }>
                                  {formatCurrency(reform.fixedImpactEur || 0)}
                                </span>
                              </div>
                              <button
                                className={`fr-btn fr-btn--${isLeverInDsl(reform.id) ? 'secondary' : 'primary'}`}
                                onClick={() =>
                                  (isLeverInDsl(reform.id) ? removeLeverFromDsl(reform.id) : addLeverToDsl(reform))
                                }
                              >
                                {isLeverInDsl(reform.id) ? 'Remove' : 'Add'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {lens === 'reform' && (
              <>
                <div className="panel-header">All Reforms</div>
                <div className="reforms-section">
                  {policyLevers.map((reform, index) => (
                    <div key={index} className={`reform-item ${isLeverInDsl(reform.id) ? 'applied' : ''}`}>
                      <div className="reform-details">
                        <div className="reform-name">{reform.label}</div>
                        <div className="reform-description">{reform.description}</div>
                      </div>
                      <div className="reform-actions">
                        <div className="reform-impact">
                          <span className={
                            reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'
                          }>
                            {formatCurrency(reform.fixedImpactEur || 0)}
                          </span>
                        </div>
                        <button
                          className={`fr-btn fr-btn--${isLeverInDsl(reform.id) ? 'secondary' : 'primary'}`}
                          onClick={() =>
                            (isLeverInDsl(reform.id) ? removeLeverFromDsl(reform.id) : addLeverToDsl(reform))
                          }
                        >
                          {isLeverInDsl(reform.id) ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="center-panel">
            <div className="treemap-header">
              <div className="treemap-title-block">
                <h2 className="treemap-title">{t('chart.treemap') || 'Budget allocation'}</h2>
                <p className="treemap-subtitle">
                  {displayMode === 'share' ? 'Viewing share of baseline (%)' : 'Viewing annual amounts (€B)'}
                </p>
              </div>
            </div>
            <div className="treemap-divider" aria-hidden="true" />
            <div className="treemap-container">
              <TreemapChart
                data={treemapData}
                colors={treemapColors}
                resolutionData={scenarioResult?.resolution.byMass || []}
                mode={displayMode}
                onSelect={(item) => {
                  if (lens !== 'mass') {
                    setLens('mass');
                  }
                  handleCategoryClick(item as MassCategory);
                }}
              />
              
              {scenarioError && (
                <div className="scenario-inline-error scenario-inline-error--floating" role="alert">
                  {scenarioError}
                </div>
              )}
            </div>
            {(scenarioResult || scenarioLoading) && (
              <div className="scenario-insights" role="region" aria-label={t('build.scoreboard')}>
                <div className="insight-card card trajectory-card">
                  <div className="trajectory-header">
                    <div className="trajectory-title">{t('build.deficit_trajectory')}</div>
                    {deficitRangeLabel && <div className="trajectory-range">{deficitRangeLabel}</div>}
                  </div>
                  {hasDeficitSeries ? (
                    <>
                      <DeficitTrajectoryChart
                        baseline={baselineDeficitPath}
                        scenario={deficitPath}
                        years={deficitYears}
                        className="trajectory-chart"
                        height={220}
                      />
                      <div className="trajectory-meta" aria-hidden="true">
                        <div className="trajectory-metric">
                          <span>{deficitStartYear}</span>
                          <strong>{formatBillionsLabel(deficitPath[0])}</strong>
                        </div>
                        <div className="trajectory-metric">
                          <span>{deficitEndYear}</span>
                          <strong>{formatBillionsLabel(deficitPath[deficitPath.length - 1])}</strong>
                        </div>
                      </div>
                      <div className="trajectory-legend">
                        <span className="legend-item">
                          <span className="legend-dot legend-dot--baseline" />
                          {t('build.baseline')}
                        </span>
                        <span className="legend-item">
                          <span className="legend-dot legend-dot--scenario" />
                          {t('build.scenario')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="trajectory-empty">{t('build.no_deficit_data')}</p>
                  )}
                </div>
                <div className="insight-card card macro-card">
                  <div className="macro-header">
                    <div className="macro-title">{t('build.gdp_growth_delta')}</div>
                    {macroRangeLabel && <div className="macro-range">{macroRangeLabel}</div>}
                  </div>
                  {hasMacroSeries ? (
                    <>
                      <div className="macro-primary">{formatMacroPercent(macroPrimaryValue)}</div>
                      <div className="macro-secondary" aria-hidden="true">
                        <span>
                          {macroStartYear}: {formatMacroPercent(macroPrimaryValue)}
                        </span>
                        {macroYears.length > 1 && (
                          <span>
                            {macroEndYear}: {formatMacroPercent(macroLatestValue)}
                          </span>
                        )}
                      </div>
                      <Sparkline values={macroDeltaPercentSeries} className="sparkline" strokeWidth={2} />
                      <div className="macro-hint">{t('build.gdp_growth_hint')}</div>
                    </>
                  ) : (
                    <p className="macro-empty">{t('build.no_macro_data')}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="right-panel">
            {isRevenuePanelExpanded && selectedRevenueCategory ? (
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
            ) : (
              <RevenueCategoryList
                categories={revenuePieces}
                onSelect={handleRevenueCategoryClick}
                formatCurrency={formatCurrency}
                visuals={revenueVisuals}
              />
            )}
          </div>
        </div>
      </div>

      <div className="scenario-status-bar" role="region" aria-live="polite">
        <div className="status-summary">
          <div className="status-heading">Scenario impact</div>
          <div className="status-metrics">
            <div className="status-metric">
              <span className="status-label">{t('score.deficit_y0')}</span>
              <span className="status-value">
                {scenarioLoading
                  ? '—'
                  : latestDeficit !== null
                    ? formatDeficitWithRatio(latestDeficit, latestDeficitRatio)
                    : 'Not run'}
              </span>
            </div>
            <div className="status-metric">
              <span className="status-label">{t('build.resolution')}</span>
              <span className="status-value">
                {scenarioLoading
                  ? '—'
                  : hasResolution
                    ? `${Math.round(resolutionPct * 100)}%`
                    : 'Not run'}
              </span>
            </div>
          </div>
        </div>
        <div className="status-actions">
          {scenarioLoading && (
            <div className="status-feedback" role="status">
              <i className="material-icons spin" aria-hidden="true">autorenew</i>
              Running scenario…
            </div>
          )}
          {!scenarioLoading && scenarioError && (
            <div className="status-feedback status-feedback--error" role="alert">
              <i className="material-icons" aria-hidden="true">error</i>
              {scenarioError}
            </div>
          )}
          {!scenarioLoading && scenarioResult && !scenarioError && (
            <div className="status-feedback status-feedback--success" role="status">
              <i className="material-icons" aria-hidden="true">check_circle</i>
              Updated with latest run
            </div>
          )}
          {!scenarioLoading && !scenarioResult && !scenarioError && (
            <div className="status-feedback" role="status">
              Scenario not yet run
            </div>
          )}
        </div>
      </div>

      {shareFeedback && (
        <div className="snackbar snackbar--bottom" role="status">
          <i className="material-icons" aria-hidden="true">check_circle</i>
          {shareFeedback}
        </div>
      )}
    </div>
  );
}
  const cloneCategories = (categories: MassCategory[]) =>
    categories.map((category) => ({ ...category }));
