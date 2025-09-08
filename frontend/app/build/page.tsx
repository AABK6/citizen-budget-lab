"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { gqlRequest } from '@/lib/graphql';
import { parseDsl, serializeDsl } from '@/lib/dsl';
import { RuleLights } from '@/components/RuleLights';
import { StatCards } from '@/components/StatCards';
import { DeficitPathChart } from '@/components/DeficitPathChart';

// Define types for the data we expect from the GraphQL API
type LegoPiece = {
  id: string;
  label: string;
  type: 'expenditure' | 'revenue';
  cofogMajors: string[];
  amountEur?: number;
};

type MassLabel = {
  id: string;
  displayLabel: string;
};

type PolicyLever = {
  id: string;
  label: string;
  description?: string;
  fixedImpactEur?: number;
};

type PopularIntent = {
  id: string;
  label: string;
  emoji?: string;
  massId: string;
  seed: any; // DSL snippet
};

export type ScenarioResult = {
  id: string;
  accounting: { deficitPath: number[]; debtPath: number[]; };
  compliance: {
    eu3pct: string[];
    eu60pct: string[];
    netExpenditure: string[];
    localBalance: string[];
  };
  macro: { deltaGDP: number[]; deltaEmployment: number[]; deltaDeficit: number[]; assumptions: any; };
  resolution: { overallPct: number; byMass: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number; }[]; };
};

import { ErrorDisplay } from '@/components/ErrorDisplay';
import { BuildPageSkeleton } from '@/components/BuildPageSkeleton';
import { buildPageQuery, suggestLeversQuery, runScenarioMutation, getScenarioDslQuery } from '@/lib/queries';

import { TreemapChart } from '@/components/Treemap';
import { useHistory } from '@/lib/useHistory';
import { useSearchParams } from 'next/navigation';

const treemapColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];


const INITIAL_DSL_OBJECT = {
  version: 0.1,
  baseline_year: 2026,
  assumptions: {
    horizon_years: 5,
  },
  actions: [],
};

function toBase64(str: string) {
    if (typeof window === 'undefined') {
        return Buffer.from(str).toString('base64');
    }
    return window.btoa(unescape(encodeURIComponent(str)));
}

export default function BuildPage() {
  const { t } = useI18n();
  const [year, setYear] = useState(2026);
  const [initialLoading, setInitialLoading] = useState(true);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Data states
  const [spendingPieces, setSpendingPieces] = useState<LegoPiece[]>([]);
  const [revenuePieces, setRevenuePieces] = useState<LegoPiece[]>([]);
  const [masses, setMasses] = useState<any[]>([]);
  const [policyLevers, setPolicyLevers] = useState<PolicyLever[]>([]);
  const [popularIntents, setPopularIntents] = useState<PopularIntent[]>([]);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const {
    state: dslObject,
    setState: setDslObject,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useHistory<any>(INITIAL_DSL_OBJECT);
  const dslString = serializeDsl(dslObject);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isRevenuePanelExpanded, setIsRevenuePanelExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedRevenueCategory, setSelectedRevenueCategory] = useState<any | null>(null);
  const [suggestedLevers, setSuggestedLevers] = useState<PolicyLever[]>([]);
  const [targetInput, setTargetInput] = useState('');
  const [revenueTargetInput, setRevenueTargetInput] = useState('');
  const [appliedLevers, setAppliedLevers] = useState(new Set<string>());
  const [lens, setLens] = useState<'mass' | 'family' | 'reform'>('mass');
  const [expandedFamilies, setExpandedFamilies] = useState(new Set<string>());
  const searchParams = useSearchParams();

  useEffect(() => {
    const scenarioId = searchParams.get('scenarioId');
    if (scenarioId) {
      const fetchDsl = async () => {
        try {
          const { scenario } = await gqlRequest(getScenarioDslQuery, { id: scenarioId });
          setDslObject(parseDsl(atob(scenario.dsl)));
        } catch (err) {
          setError('Failed to load scenario');
        }
      };
      fetchDsl();
    }
  }, [searchParams, setDslObject]);

  useEffect(() => {
    const newAppliedLevers = new Set<string>();
    dslObject.actions.forEach(a => {
      if (a.target.startsWith('piece.')) {
        newAppliedLevers.add(a.id);
      }
    });
    setAppliedLevers(newAppliedLevers);
  }, [dslObject]);

  const runScenario = useCallback(async () => {
    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const result = await gqlRequest(runScenarioMutation, { dsl: toBase64(dslString) });
      setScenarioResult(result.runScenario);
    } catch (err: any) {
      setScenarioError(err.message || "Failed to run scenario");
    }
    setScenarioLoading(false);
  }, [dslString]);

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

      setSpendingPieces(allPieces.filter((p: LegoPiece) => p.type === 'expenditure'));
      setRevenuePieces(allPieces.filter((p: LegoPiece) => p.type === 'revenue'));

      const massLabels: { [key: string]: string } = {};
      data.massLabels.forEach((m: MassLabel) => {
        massLabels[m.id] = m.displayLabel;
      });

      const massData: { [key: string]: { id: string; name: string; amount: number, pieces: LegoPiece[] } } = {};
      allPieces.filter((p: LegoPiece) => p.type === 'expenditure').forEach((p: LegoPiece) => {
          const massId = p.cofogMajors[0] || 'unknown';
          if (!massData[massId]) {
              massData[massId] = { id: massId, name: massLabels[massId] || `Mass ${massId}`, amount: 0, pieces: [] };
          }
          massData[massId].amount += p.amountEur || 0;
          massData[massId].pieces.push(p);
      });
      
      setMasses(Object.values(massData).sort((a, b) => b.amount - a.amount));

      setPolicyLevers(data.policyLevers);
      setPopularIntents(data.popularIntents);

    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    }
    setInitialLoading(false);
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run scenario initially and whenever DSL changes
  useEffect(() => {
    runScenario();
  }, [runScenario]);

  const handleCategoryClick = async (category: any) => {
    setSelectedCategory(category);
    setIsPanelExpanded(true);

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
      setError(err.message || "Failed to fetch suggestions");
    }
  };

  const addLeverToDsl = (lever: PolicyLever) => {
    setDslObject(currentDslObject => {
      const isRevenue = lever.family === 'TAXES';
      const op = isRevenue
        ? ((lever.fixedImpactEur || 0) >= 0 ? 'increase' : 'decrease')
        : ((lever.fixedImpactEur || 0) >= 0 ? 'decrease' : 'increase');

      const newAction = {
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
        actions: currentDslObject.actions.filter(a => a.id !== leverId),
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
        const newAction = {
            id: `target_${massId}`,
            target: `cofog.${massId}`,
            op: amount > 0 ? 'increase' : 'decrease',
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
        const newAction = {
            id: `target_${pieceId}`,
            target: `piece.${pieceId}`,
            op: amount > 0 ? 'increase' : 'decrease',
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
    setExpandedFamilies(current => {
      const newSet = new Set(current);
      if (newSet.has(family)) {
        newSet.delete(family);
      } else {
        newSet.add(family);
      }
      return newSet;
    });
  };

  const handleIntentClick = (intent: PopularIntent) => {
    setDslObject(currentDsl => {
      const newActions = intent.seed.actions.filter(action => !currentDsl.actions.some(a => a.id === action.id));
      return {
        ...currentDsl,
        actions: [...currentDsl.actions, ...newActions],
      };
    });
  };

  const handleBackClick = () => {
    setIsPanelExpanded(false);
    setSelectedCategory(null);
  }

  const handleRevenueCategoryClick = async (category: any) => {
    setSelectedRevenueCategory(category);
    setIsRevenuePanelExpanded(true);
    
    const revenueLevers = policyLevers.filter(lever => lever.family === 'TAXES');
    setSuggestedLevers(revenueLevers);
  };

  const handleRevenueBackClick = () => {
    setIsRevenuePanelExpanded(false);
    setSelectedRevenueCategory(null);
  }

  const formatCurrency = (amount: number) => {
    return `€${(amount / 1e9).toFixed(1)}B`;
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

  const totalDeltaExpenditures = scenarioResult?.accounting.deficitPath[0] || 0;
  const totalDeltaRevenues = scenarioResult?.macro.deltaDeficit[0] || 0; // Placeholder for revenue impact
  const resolutionPct = scenarioResult?.resolution.overallPct || 0;
  const debtPath = scenarioResult?.accounting.debtPath || [];
  const deficitPath = scenarioResult?.accounting.deficitPath || [];
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

      {/* Main Content */}
      <div className="main-content">
        {/* Left Panel */}
        <div className="left-panel">
          {lens === 'mass' && !isPanelExpanded && (
            <>
              <div className="panel-header">Spending Targets & Reforms</div>
              {masses.map((category, index) => (
                <div key={index} className="spending-category" onClick={() => handleCategoryClick(category)}>
                  <div className="category-header">
                    <div className="category-name">{category.name}</div>
                    <div className="category-amount">{formatCurrency(category.amount)}</div>
                  </div>
                  <div className="category-controls">
                    <div className="control-button">Set Target</div>
                    <div className="control-button">View Reforms</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {lens === 'mass' && isPanelExpanded && selectedCategory && (
            <>
              <button className="fr-btn fr-btn--secondary fr-btn--sm" onClick={handleBackClick} style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>Back</button>
              <div className="panel-header">{selectedCategory.name} Reforms & Targets</div>
              <div className="selected-category">
                <div className="category-header">
                  <div className="category-name">{selectedCategory.name}</div>
                  <div className="category-amount">{formatCurrency(selectedCategory.amount)}</div>
                </div>
                <div className="target-controls">
                  <span className="target-label">Target:</span>
                  <input type="text" className="target-input" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="+10B, -500M..." />
                  <button className="target-button" onClick={handleApplyTarget}>Apply</button>
                  <button className="target-button fr-btn--secondary" onClick={() => setTargetInput('')}>Clear</button>
                </div>
                <div className="reforms-section">
                  <div className="section-title">Available Reforms</div>
                  {suggestedLevers.map((reform, index) => (
                    <div key={index} className={`reform-item ${appliedLevers.has(reform.id) ? 'applied' : ''}`}>
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
                  {popularIntents.filter(intent => intent.massId === selectedCategory.id).map((intent, index) => (
                    <div key={index} className="reform-pill" onClick={() => handleIntentClick(intent)}>{intent.emoji} {intent.label}</div>
                  ))}
                </div>
              </div>
            </>
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
                  {expandedFamilies.has(family) && (
                    <div className="reforms-section">
                      {levers.map((reform, index) => (
                        <div key={index} className={`reform-item ${appliedLevers.has(reform.id) ? 'applied' : ''}`}>
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
                  <div key={index} className={`reform-item ${appliedLevers.has(reform.id) ? 'applied' : ''}`}>
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
            <TreemapChart data={masses} colors={treemapColors} />
          </div>
          <div className="scenario-charts">
            {scenarioLoading && <div className="fr-p-2w">Running scenario...</div>}
            {scenarioError && <div className="fr-p-2w error">{scenarioError}</div>}
            {scenarioResult && !scenarioLoading && !scenarioError && (
                <>
                    <StatCards items={[
                        { label: t('score.deficit_y0'), value: formatCurrency(scenarioResult.accounting.deficitPath[0]) },
                        { label: t('build.resolution'), value: `${(scenarioResult.resolution.overallPct * 100).toFixed(0)}%` },
                    ]} />
                    <DeficitPathChart deficit={deficitPath} debt={debtPath} />
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
                    <div key={index} className={`reform-item ${appliedLevers.has(reform.id) ? 'applied' : ''}`}>
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
                  {popularIntents.filter(intent => intent.seed.actions.some(a => a.target.startsWith('piece.rev_'))).map((intent, index) => (
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
