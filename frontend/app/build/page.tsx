"use client"

import { useState, useEffect, useCallback } from 'react';
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

type ScenarioResult = {
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

const treemapColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];

const INITIAL_DSL_OBJECT = {
  version: 0.1,
  baseline_year: 2026,
  assumptions: {
    horizon_years: 5,
  },
  actions: [
    {
      id: 'ed_invest_boost',
      target: 'mission.education',
      dimension: 'cp',
      op: 'increase',
      amount_eur: 1000000000,
      recurring: true,
    },
  ],
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [spendingPieces, setSpendingPieces] = useState<LegoPiece[]>([]);
  const [revenuePieces, setRevenuePieces] = useState<LegoPiece[]>([]);
  const [masses, setMasses] = useState<any[]>([]);
  const [policyLevers, setPolicyLevers] = useState<PolicyLever[]>([]);
  const [popularIntents, setPopularIntents] = useState<PopularIntent[]>([]);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [dslObject, setDslObject] = useState<any>(INITIAL_DSL_OBJECT);
  const dslString = serializeDsl(dslObject);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [suggestedLevers, setSuggestedLevers] = useState<PolicyLever[]>([]);

  const runScenario = useCallback(async () => {
    setLoading(true);
    try {
      const mutation = `
        mutation Run($dsl: String!) {
          runScenario(input: { dsl: $dsl }) {
            id
            accounting { deficitPath debtPath }
            compliance { eu3pct eu60pct netExpenditure localBalance }
            macro { deltaGDP deltaEmployment deltaDeficit assumptions }
            resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
          }
        }
      `;
      const result = await gqlRequest(mutation, { dsl: toBase64(dslString) });
      setScenarioResult(result.runScenario);
    } catch (err: any) {
      setError(err.message || "Failed to run scenario");
    }
    setLoading(false);
  }, [dslString]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const query = `
          query BuildPageData($year: Int!) {
            legoBaseline(year: $year) {
              pieces {
                id
                amountEur
              }
            }
            legoPieces(year: $year) {
              id
              label
              type
              cofogMajors
            }
            massLabels {
              id
              displayLabel
            }
            policyLevers {
              id
              family
              label
              description
              fixedImpactEur
            }
            popularIntents {
              id
              label
              emoji
              massId
              seed
            }
          }
        `;
        const data = await gqlRequest(query, { year });

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

        const massData: { [key: string]: { name: string; amount: number, pieces: LegoPiece[] } } = {};
        allPieces.filter((p: LegoPiece) => p.type === 'expenditure').forEach((p: LegoPiece) => {
            const massId = p.cofogMajors[0] || 'unknown';
            if (!massData[massId]) {
                massData[massId] = { name: massLabels[massId] || `Mass ${massId}`, amount: 0, pieces: [] };
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
      setLoading(false);
    }

    fetchData();
  }, [year]);

  // Run scenario initially and whenever DSL changes
  useEffect(() => {
    runScenario();
  }, [runScenario]);

  const handleCategoryClick = async (category: any) => {
    setSelectedCategory(category);
    setIsPanelExpanded(true);
    try {
      const query = `
        query SuggestLevers($massId: String!) {
          suggestLevers(massId: $massId) {
            id
            label
            description
            fixedImpactEur
          }
        }
      `;
      const massId = category.pieces[0]?.cofogMajors[0] || '01';
      const data = await gqlRequest(query, { massId });
      setSuggestedLevers(data.suggestLevers);
    } catch (err: any) {
      setError(err.message || "Failed to fetch suggestions");
    }
  };

  const addLeverToDsl = (lever: PolicyLever) => {
    const currentDslObject = parseDsl(dslString);
    const newAction = {
      id: lever.id,
      target: `piece.${lever.id}`,
      op: (lever.fixedImpactEur || 0) >= 0 ? 'decrease' : 'increase', // Savings decrease deficit, costs increase
      amount_eur: Math.abs(lever.fixedImpactEur || 0),
      recurring: true, // Assuming reforms are recurring
    };
    currentDslObject.actions.push(newAction);
    setDslObject(currentDslObject);
  };

  const handleBackClick = () => {
    setIsPanelExpanded(false);
    setSelectedCategory(null);
  }

  const formatCurrency = (amount: number) => {
    return `€${(amount / 1e9).toFixed(1)}B`;
  };

  const totalDeltaExpenditures = scenarioResult?.accounting.deficitPath[0] || 0;
  const totalDeltaRevenues = scenarioResult?.macro.deltaDeficit[0] || 0; // Placeholder for revenue impact
  const resolutionPct = scenarioResult?.resolution.overallPct || 0;
  const debtPath = scenarioResult?.accounting.debtPath || [];
  const deficitPath = scenarioResult?.accounting.deficitPath || [];
  const deltaGDP = scenarioResult?.macro.deltaGDP || [];

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
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
            <button className="fr-btn" onClick={runScenario} disabled={loading}>{loading ? 'Running...' : 'Run'}</button>
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
            <button className="nav-button" title="Undo"><i className="material-icons" style={{ fontSize: '18px' }}>undo</i></button>
            <button className="nav-button" title="Redo"><i className="material-icons" style={{ fontSize: '18px' }}>redo</i></button>
            <button className="nav-button" title="Reset"><i className="material-icons" style={{ fontSize: '18px' }}>refresh</i></button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Panel */}
        <div className="left-panel">
          {isPanelExpanded && selectedCategory ? (
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
                  <input type="text" className="target-input" defaultValue="+€10B" />
                  <button className="target-button">Apply</button>
                </div>
                <div className="reforms-section">
                  <div className="section-title">Available Reforms</div>
                  {suggestedLevers.map((reform, index) => (
                    <div key={index} className="reform-item" onClick={() => addLeverToDsl(reform)}>
                      <div className="reform-name">{reform.label}</div>
                      <div className="reform-description">{reform.description}</div>
                      <div className="reform-impact">
                        <span className={reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'}>{formatCurrency(reform.fixedImpactEur || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="popular-reforms">
                  <div className="section-title">Popular Reforms</div>
                  {popularIntents.map((intent, index) => (
                    <div key={index} className="reform-pill">{intent.emoji} {intent.label}</div>
                  ))}
                </div>
              </div>
            </>
          ) : (
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
        </div>

        {/* Center Panel */}
        <div className="center-panel">
          <div className="lens-switcher">
            <div className="lens-option active">By Mass</div>
            <div className="lens-option">By Family</div>
            <div className="lens-option">By Reform</div>
          </div>
          <div className="treemap-container">
             <div className="treemap">
                {masses.map((item, index) => (
                    <div key={index} className={`treemap-item ${selectedCategory?.name === item.name ? 'selected' : ''}`} style={{ backgroundColor: treemapColors[index % treemapColors.length], flexGrow: item.amount }}>
                    <div className="treemap-label">{item.name}</div>
                    <div className="treemap-value">{formatCurrency(item.amount)}</div>
                    </div>
                ))}
            </div>
          </div>
          <div className="scenario-charts">
            {scenarioResult && (
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

        {/* Right Panel */}
        <div className="right-panel">
          <div className="panel-header">Revenues</div>
          {revenuePieces.map((piece, index) => (
            <div key={index} className="revenue-category">
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
        </div>
      </div>
    </div>
  )
}
