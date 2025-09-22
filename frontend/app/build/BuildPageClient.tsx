"use client"

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { gqlRequest } from '@/lib/graphql';
import { parseDsl, serializeDsl } from '@/lib/dsl';
import { RuleLights } from '@/components/RuleLights';
import { StatCards } from '@/components/StatCards';
import { DeficitPathChart } from '@/components/DeficitPathChart';
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
  MassLabel,
  PolicyLever,
  PopularIntent,
  BuildLens,
  MassCategory,
} from './types';
import { useBuildState } from './useBuildState';
import { runScenarioForDsl } from '@/lib/permalink';
import { MassCategoryList } from './components/MassCategoryList';
import { MassCategoryPanel } from './components/MassCategoryPanel';
import { computeDeficitTotals, computeDebtTotals } from '@/lib/fiscal';

const treemapColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];

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
  } = state;
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

  useEffect(() => {
    scenarioIdRef.current = scenarioId;
  }, [scenarioId]);

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
      const result = await runScenarioForDsl(dslString);
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

      const baselineAmounts: { [key: string]: number } = {};
      data.legoBaseline.pieces.forEach((p: any) => {
        baselineAmounts[p.id] = p.amountEur;
      });

      const allPieces = data.legoPieces.map((p: any) => ({ ...p, amountEur: baselineAmounts[p.id] || 0 }));

      const spending = allPieces.filter((p: LegoPiece) => p.type === 'expenditure');
      const revenue = allPieces.filter((p: LegoPiece) => p.type === 'revenue');

      const massLabels: { [key: string]: string } = {};
      data.massLabels.forEach((m: MassLabel) => {
        massLabels[m.id] = m.displayLabel;
      });

      const massData: Record<string, MassCategory> = {};
      spending.forEach((p: LegoPiece) => {
          const massId = p.cofogMajors[0] || 'unknown';
          if (!massData[massId]) {
              massData[massId] = {
                id: massId,
                name: massLabels[massId] || `Mass ${massId}`,
                amount: 0,
                pieces: [],
              };
          }
          massData[massId].amount += p.amountEur || 0;
          massData[massId].pieces.push(p);
      });
      const massList = Object.values(massData).sort((a, b) => b.amount - a.amount);

      setData({
        spendingPieces: spending,
        revenuePieces: revenue,
        masses: massList,
        policyLevers: data.policyLevers,
        popularIntents: data.popularIntents,
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setInitialLoading(false);
    }
  }, [setData, setError, setInitialLoading, setScenarioError, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run scenario initially and whenever DSL changes
  useEffect(() => {
    runScenario();
  }, [runScenario]);

  const handleCategoryClick = async (category: MassCategory) => {
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
        const newAction: DslAction = {
            id: `target_${massId}`,
            target: `cofog.${massId}`,
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
    setSelectedRevenueCategory(category);
    toggleRevenuePanel(true);

    const revenueLevers = policyLevers.filter(lever => lever.family === 'TAXES');
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

  const resolutionPct = scenarioResult?.resolution.overallPct || 0;
  const deficitPath = scenarioResult ? computeDeficitTotals(scenarioResult.accounting, scenarioResult.macro?.deltaDeficit) : [];
  const debtPath = scenarioResult ? computeDebtTotals(scenarioResult.accounting) : [];
  const deltaGDP = scenarioResult?.macro.deltaGDP || [];

  if (initialLoading) {
    return <BuildPageSkeleton />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  return (
    <div className="build-page-container">
      {/* HUD Bar */}
      <div className="hud-bar">
        <div className="hud-left">
          <div className="logo">Citizen Budget Lab</div>
          <div className="resolution-meter">
            <span className="meter-label">Resolution:</span>
            <div className="meter-bar"><div className="meter-fill" style={{ width: `${(resolutionPct * 100).toFixed(0)}%` }}></div></div>
            <span className="meter-value">{(resolutionPct * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="hud-right">
            <button className="fr-btn" onClick={runScenario} disabled={scenarioLoading}>{scenarioLoading ? 'Running...' : 'Run'}</button>
          <div className="year-selector">
            <i className="material-icons" style={{ fontSize: '16px' }}>calendar_today</i>
            <span className="year-text">{year}</span>
          </div>
          <div className="eu-lights">
            <RuleLights 
                eu3pct={scenarioResult?.compliance.eu3pct}
                eu60pct={scenarioResult?.compliance.eu60pct}
                netExpenditure={scenarioResult?.compliance.netExpenditure}
                localBalance={scenarioResult?.compliance.localBalance}
            />
          </div>
          <div className="nav-controls">
            <button className="fr-btn fr-btn--secondary" title="Undo" onClick={undo} disabled={!canUndo}><i className="material-icons" style={{ fontSize: '18px' }}>undo</i></button>
            <button className="fr-btn fr-btn--secondary" title="Redo" onClick={redo} disabled={!canRedo}><i className="material-icons" style={{ fontSize: '18px' }}>redo</i></button>
            <button className="fr-btn fr-btn--secondary" title="Reset" onClick={reset}><i className="material-icons" style={{ fontSize: '18px' }}>refresh</i></button>
          </div>
        </div>
      </div>

      <div className="fr-alert fr-alert--info baseline-disclaimer" role="status" style={{ margin: '1.5rem 0' }}>
        <p className="fr-alert__title">Baseline based on PLF 2026</p>
        <p className="fr-alert__description">
          The current baseline reflects the government&apos;s PLF 2026 proposal and may diverge from the final voted budget.
          Re-run scenarios once the finance bill is enacted to refresh the reference path.
        </p>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Panel */}
        <div className="left-panel">
          {lens === 'mass' && !isPanelExpanded && (
            <MassCategoryList
              categories={masses}
              onSelect={handleCategoryClick}
              formatCurrency={formatCurrency}
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
                isLeverInDsl(lever.id) ? removeLeverFromDsl(lever.id) : addLeverToDsl(lever)
              }
              isLeverSelected={isLeverInDsl}
              popularIntents={popularIntents}
              onIntentClick={handleIntentClick}
              formatCurrency={formatCurrency}
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
                              <span className={reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'}>{formatCurrency(reform.fixedImpactEur || 0)}</span>
                            </div>
                            <button 
                              className={`fr-btn fr-btn--${isLeverInDsl(reform.id) ? 'secondary' : 'primary'}`}
                              onClick={() => isLeverInDsl(reform.id) ? removeLeverFromDsl(reform.id) : addLeverToDsl(reform)}
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
                        <span className={reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'}>{formatCurrency(reform.fixedImpactEur || 0)}</span>
                      </div>
                      <button 
                        className={`fr-btn fr-btn--${isLeverInDsl(reform.id) ? 'secondary' : 'primary'}`}
                        onClick={() => isLeverInDsl(reform.id) ? removeLeverFromDsl(reform.id) : addLeverToDsl(reform)}
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

        {/* Center Panel */}
        <div className="center-panel">
          <div className="lens-switcher">
            <div className={`lens-option ${lens === 'mass' ? 'active' : ''}`} onClick={() => setLens('mass')}>By Mass</div>
            <div className={`lens-option ${lens === 'family' ? 'active' : ''}`} onClick={() => setLens('family')}>By Family</div>
            <div className={`lens-option ${lens === 'reform' ? 'active' : ''}`} onClick={() => setLens('reform')}>By Reform</div>
          </div>
          <div className="treemap-container">
            <TreemapChart 
              data={masses} 
              colors={treemapColors} 
              resolutionData={scenarioResult?.resolution.byMass || []} 
            />
          </div>
          <div className="scenario-charts">
            {scenarioLoading && <div className="fr-p-2w">Running scenario...</div>}
            {scenarioError && <div className="fr-p-2w error">{scenarioError}</div>}
            {scenarioResult && !scenarioLoading && !scenarioError && (
                <>
                    <StatCards items={[
                        { label: t('score.deficit_y0'), value: formatCurrency(deficitPath[0] || 0) },
                        { label: t('build.resolution'), value: `${(scenarioResult.resolution.overallPct * 100).toFixed(0)}%` },
                    ]} />
                    <DeficitPathChart deficit={deficitPath} debt={debtPath} startYear={year} />
                </>
            )}
          </div>
        </div>

        <div className="right-panel">
          {isRevenuePanelExpanded && selectedRevenueCategory ? (
            <>
              <button className="fr-btn fr-btn--secondary fr-btn--sm" onClick={handleRevenueBackClick} style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>Back</button>
              <div className="panel-header">{selectedRevenueCategory.label} Reforms & Targets</div>
              <div className="selected-category">
                <div className="category-header">
                  <div className="category-name">{selectedRevenueCategory.label}</div>
                  <div className="category-amount">{formatCurrency(selectedRevenueCategory.amountEur || 0)}</div>
                </div>
                <div className="target-controls">
                  <span className="target-label">Target:</span>
                  <input type="text" className="target-input" value={revenueTargetInput} onChange={e => setRevenueTargetInput(e.target.value)} placeholder="+10B, -500M..." />
                  <button className="target-button" onClick={handleApplyRevenueTarget}>Apply</button>
                  <button className="target-button fr-btn--secondary" onClick={() => setRevenueTargetInput('')}>Clear</button>
                </div>
                <div className="reforms-section">
                  <div className="section-title">Available Reforms</div>
                  {suggestedLevers.map((reform, index) => (
                    <div key={index} className={`reform-item ${isLeverInDsl(reform.id) ? 'applied' : ''}`}>
                      <div className="reform-details">
                        <div className="reform-name">{reform.label}</div>
                        <div className="reform-description">{reform.description}</div>
                      </div>
                      <div className="reform-actions">
                        <div className="reform-impact">
                          <span className={reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'}>{formatCurrency(reform.fixedImpactEur || 0)}</span>
                        </div>
                        <button 
                          className={`fr-btn fr-btn--${isLeverInDsl(reform.id) ? 'secondary' : 'primary'}`}
                          onClick={() => isLeverInDsl(reform.id) ? removeLeverFromDsl(reform.id) : addLeverToDsl(reform)}
                        >
                          {isLeverInDsl(reform.id) ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="popular-reforms">
                  <div className="section-title">Popular Reforms</div>
                  {popularIntents.filter(intent => intent.seed && intent.seed.actions && intent.seed.actions.some((a: DslAction) => a.target.startsWith('piece.rev_'))).map((intent, index) => (
                    <div key={index} className="reform-pill" onClick={() => handleIntentClick(intent)}>{intent.emoji} {intent.label}</div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="panel-header">Revenues</div>
              {revenuePieces.map((piece, index) => (
                <div key={index} className="revenue-category" onClick={() => handleRevenueCategoryClick(piece)}>
                  <div className="category-header">
                    <div className="category-name">{piece.label}</div>
                    <div className="category-amount">{formatCurrency(piece.amountEur || 0)}</div>
                  </div>
                  <div className="category-controls">
                    <div className="control-button">Adjust Rate</div>
                    <div className="control-button">View Reforms</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
