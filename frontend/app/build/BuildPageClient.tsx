"use client"

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { gqlRequest } from '@/lib/graphql';
import { parseDsl, serializeDsl } from '@/lib/dsl';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { BuildPageSkeleton } from '@/components/BuildPageSkeleton';
import { buildPageQuery, suggestLeversQuery, getScenarioDslQuery } from '@/lib/queries';
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
    targetInput,
    revenueTargetInput,
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

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const {
    setInitialLoading,
    setScenarioLoading,
    setError,
    setScenarioError,
    setScenarioResult,
    setData,
    setSuggestedLevers,
    setTargetInput,
    setRevenueTargetInput,
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

      setMassDataByLens({ MISSION: missionCategories, COFOG: cofogCategories });
      const lensForCategories = aggregationLensRef.current;
      setMasses(lensForCategories === 'COFOG' ? cofogCategories : missionCategories);

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
    setTargetInput('');
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
  }, [runScenario]);

  const handleCategoryClick = async (category: MassCategory) => {
    toggleRevenuePanel(false);
    setSelectedRevenueCategory(null);
    setSelectedCategory(category);
    togglePanel(true);

    // Set initial target input value from current DSL
    const massId = category.id;
    const targetAction = dslObject.actions.find(a => a.id === `target_${massId}`);
    if (targetAction) {
        const amount = targetAction.amount_eur * (targetAction.op === 'increase' ? 1 : -1);
        setTargetInput(`${amount / 1e9}B`);
    } else {
        setTargetInput('');
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

  const handleApplyTarget = () => {
    if (!selectedCategory) return;

    const parseCurrency = (input: string): number => {
        const value = parseFloat(input.replace(/,/g, ''));
        if (isNaN(value)) return 0;
        const multiplier = input.toUpperCase().includes('B') ? 1e9 : (input.toUpperCase().includes('M') ? 1e6 : 1);
        return value * multiplier;
    };

    const amount = parseCurrency(targetInput);
    const massId = selectedCategory.id;

    setDslObject(currentDsl => {
        const otherActions = currentDsl.actions.filter(a => a.id !== `target_${massId}`);
        if (Math.abs(amount) < 1) { // Remove target if input is empty/zero
            return { ...currentDsl, actions: otherActions };
        }
        const targetKey = aggregationLens === 'COFOG'
          ? `cofog.${massId}`
          : `mission.${massId.toUpperCase().startsWith('M_') ? massId.toUpperCase() : massId}`;
        const newAction: DslAction = {
            id: `target_${massId}`,
            target: targetKey,
            op: (amount > 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
            amount_eur: Math.abs(amount),
            role: 'target',
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

    const parseCurrency = (input: string): number => {
        const value = parseFloat(input.replace(/,/g, ''));
        if (isNaN(value)) return 0;
        const multiplier = input.toUpperCase().includes('B') ? 1e9 : (input.toUpperCase().includes('M') ? 1e6 : 1);
        return value * multiplier;
    };

    const amount = parseCurrency(revenueTargetInput);
    const pieceId = selectedRevenueCategory.id;

    setDslObject(currentDsl => {
        const otherActions = currentDsl.actions.filter(a => a.id !== `target_${pieceId}`);
        if (Math.abs(amount) < 1) { // Remove target if input is empty/zero
            return { ...currentDsl, actions: otherActions };
        }
        const newAction: DslAction = {
            id: `target_${pieceId}`,
            target: `piece.${pieceId}`,
            op: (amount > 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
            amount_eur: Math.abs(amount),
            role: 'target',
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
    setTargetInput('');
  };

  const handleRevenueCategoryClick = async (category: LegoPiece) => {
    togglePanel(false);
    setSelectedCategory(null);
    const targetAction = dslObject.actions.find((action: DslAction) => action.id === `target_${category.id}`);
    if (targetAction) {
      const amount = targetAction.amount_eur * (targetAction.op === 'increase' ? 1 : -1);
      setRevenueTargetInput(`${amount / 1e9}B`);
    } else {
      setRevenueTargetInput('');
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
    setRevenueTargetInput('');
  };

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    return `${sign}€${(Math.abs(amount) / 1e9).toFixed(1)}B`;
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

  const pendingMasses = useMemo(() => {
    if (!scenarioResult) return new Set();
    const pending = new Set<string>();
    for (const mass of scenarioResult.resolution.byMass) {
        if (Math.abs(mass.targetDeltaEur) > Math.abs(mass.specifiedDeltaEur)) {
            pending.add(mass.massId);
        }
    }
    return pending;
  }, [scenarioResult]);

  const deficitPath = scenarioResult ? computeDeficitTotals(scenarioResult.accounting, scenarioResult.macro?.deltaDeficit) : [];
  const latestDeficit = deficitPath.length > 0 ? deficitPath[0] : null;
  const resolutionPctRaw = scenarioResult?.resolution?.overallPct;
  const hasResolution = typeof resolutionPctRaw === 'number';
  const resolutionPct = hasResolution ? resolutionPctRaw : 0;

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
                targetInput={targetInput}
                onTargetChange={setTargetInput}
                onApplyTarget={handleApplyTarget}
                onClearTarget={() => setTargetInput('')}
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
          </div>

          <div className="right-panel">
            {isRevenuePanelExpanded && selectedRevenueCategory ? (
              <RevenueCategoryPanel
                category={selectedRevenueCategory}
                visual={revenueVisuals.get(selectedRevenueCategory.id)}
                targetInput={revenueTargetInput}
                onTargetChange={setRevenueTargetInput}
                onApplyTarget={handleApplyRevenueTarget}
                onClearTarget={() => setRevenueTargetInput('')}
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
                {scenarioLoading ? '—' : latestDeficit !== null ? formatCurrency(latestDeficit) : 'Not run'}
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
          <button
            className="status-run"
            onClick={runScenario}
            disabled={scenarioLoading}
          >
            <span>{scenarioLoading ? 'Running…' : 'Run scenario'}</span>
            <i className="material-icons" aria-hidden="true">
              {scenarioLoading ? 'autorenew' : 'chevron_right'}
            </i>
          </button>
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
