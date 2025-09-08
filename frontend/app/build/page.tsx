"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { DeficitPathChart } from '@/components/DeficitPathChart';
import { RuleLights } from '@/components/RuleLights';
import { AllocationChart } from '@/components/AllocationChart';
import { useI18n } from '@/lib/i18n';
import { gqlRequest } from '@/lib/graphql';
import yaml from 'js-yaml';

// --- Types ---
type LegoPiece = {
    id: string;
    label: string;
    type: 'expenditure' | 'revenue';
    amountEur: number | null;
    cofogMajors: string[];
};

type PolicyLever = {
    id: string;
    label: string;
    description: string;
    fixedImpactEur: number;
};

type ScenarioAction = {
    id: string;
    target: string;
    op: 'increase' | 'decrease' | 'set';
    amount_eur?: number;
    delta_pct?: number;
    role?: 'target';
    recurring?: boolean;
};

type ScenarioDsl = {
    version: number;
    baseline_year: number;
    assumptions: { horizon_years: number };
    actions: ScenarioAction[];
};

type ScenarioResult = {
    accounting: { deficitPath: number[]; debtPath: number[] };
    compliance: { eu3pct: string[]; eu60pct: string[]; netExpenditure: string[]; localBalance: string[] };
    resolution: { overallPct: number; byMass: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[] };
    macro: { deltaGDP: number[] };
};

// --- Constants ---
const INITIAL_DSL: ScenarioDsl = {
    version: 0.1,
    baseline_year: 2026,
    assumptions: { horizon_years: 5 },
    actions: [],
};

// --- Helper Functions ---
function toBase64(obj: object): string {
    const str = yaml.dump(obj);
    if (typeof window !== 'undefined') {
        return window.btoa(unescape(encodeURIComponent(str)));
    }
    return Buffer.from(str).toString('base64');
}

// --- Components ---

const ExpandedCategoryView = ({ category, onBack, onApplyChange, onAddLever }) => {
    const { t } = useI18n();
    const [targetAmount, setTargetAmount] = useState('');
    const [levers, setLevers] = useState<PolicyLever[]>([]);

    useEffect(() => {
        async function fetchLevers() {
            if (!category?.cofogMajors?.[0]) return;
            try {
                const query = `query($massId: String!) { suggestLevers(massId: $massId) { id label description fixedImpactEur } }`;
                const data = await gqlRequest(query, { massId: category.cofogMajors[0] });
                setLevers(data.suggestLevers);
            } catch (error) {
                console.error("Failed to fetch levers", error);
            }
        }
        fetchLevers();
    }, [category]);

    const handleApplyTarget = () => {
        const amount = parseFloat(targetAmount);
        if (!isNaN(amount)) {
            onApplyChange(category.id, amount, true); // true for target
        }
    };

    return (
        <div className="selected-category">
            <button onClick={onBack} className="fr-btn fr-btn--secondary fr-btn--sm" style={{ marginBottom: '1rem' }}>
                &larr; Back
            </button>
            <div className="category-header">
                <div className="category-name">{category.label}</div>
                <div className="category-amount">
                    {category.amountEur ? `€${(category.amountEur / 1e9).toFixed(1)}B` : 'N/A'}
                </div>
            </div>
            <div className="target-controls">
                <span className="target-label">Set Target (EUR):</span>
                <input
                    type="text"
                    className="target-input"
                    placeholder="+1000000000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                />
                <button className="target-button" onClick={handleApplyTarget}>Set</button>
            </div>
            <div className="reforms-section">
                <div className="section-title">Suggested Reforms</div>
                {levers.map(lever => (
                    <div key={lever.id} className="reform-item" onClick={() => onAddLever(lever)}>
                        <div className="reform-name">{lever.label}</div>
                        <div className="reform-description">{lever.description}</div>
                        <div className="reform-impact">
                            <span>Impact: €{(lever.fixedImpactEur / 1e9).toFixed(2)}B</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function BuildPage() {
    const { t } = useI18n();
    const [spendingPieces, setSpendingPieces] = useState<LegoPiece[]>([]);
    const [revenuePieces, setRevenuePieces] = useState<LegoPiece[]>([]);
    const [baselinePieces, setBaselinePieces] = useState<LegoPiece[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<LegoPiece | null>(null);
    const [scenarioDsl, setScenarioDsl] = useState<ScenarioDsl>(INITIAL_DSL);
    const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const query = `
                    query($year: Int!) {
                        legoPieces(year: $year) { id label type amountEur cofogMajors }
                    }
                `;
                const data = await gqlRequest(query, { year: 2026 });
                const pieces: LegoPiece[] = data.legoPieces;
                setBaselinePieces(pieces);
                setSpendingPieces(pieces.filter(p => p.type === 'expenditure'));
                setRevenuePieces(pieces.filter(p => p.type === 'revenue'));
            } catch (err) {
                setError('Failed to load budget data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const runScenario = async () => {
        setIsRunning(true);
        setError(null);
        try {
            const mutation = `
                mutation Run($dsl: String!) {
                    runScenario(input: { dsl: $dsl }) {
                        accounting { deficitPath debtPath }
                        compliance { eu3pct eu60pct netExpenditure localBalance }
                        resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
                        macro { deltaGDP }
                    }
                }
            `;
            const dsl = toBase64(scenarioDsl);
            const data = await gqlRequest(mutation, { dsl });
            setScenarioResult(data.runScenario);
        } catch (e: any) {
            setError(e?.message || 'Failed to run scenario');
        } finally {
            setIsRunning(false);
        }
    };

    const addDslAction = (action: ScenarioAction) => {
        setScenarioDsl(prevDsl => ({
            ...prevDsl,
            actions: [...prevDsl.actions, action],
        }));
    };

    const handleApplyChange = (pieceId: string, amount: number, isTarget: boolean) => {
        const op = amount >= 0 ? 'increase' : 'decrease';
        const action: ScenarioAction = {
            id: `${isTarget ? 'target' : 'change'}_${pieceId}_${Date.now()}`,
            target: `piece.${pieceId}`,
            op: op,
            amount_eur: Math.abs(amount),
            recurring: true,
        };
        if (isTarget) {
            action.role = 'target';
        }
        addDslAction(action);
        setSelectedCategory(null);
    };

    const handleAddLever = (lever: PolicyLever) => {
        const action: ScenarioAction = {
            id: lever.id,
            target: `lever.${lever.id}`, // Convention for lever actions
            op: 'set', // Levers have fixed impact
        };
        addDslAction(action);
        setSelectedCategory(null);
    };

    const treemapData = useMemo(() => {
        const scenarioAmounts = new Map(baselinePieces.map(p => [p.id, p.amountEur || 0]));
        scenarioDsl.actions.forEach(action => {
            if (action.target.startsWith('piece.')) {
                const pieceId = action.target.substring(6);
                if (scenarioAmounts.has(pieceId) && !action.role) {
                    const current = scenarioAmounts.get(pieceId)!;
                    const change = action.amount_eur || 0;
                    const newAmount = action.op === 'increase' ? current + change : current - change;
                    scenarioAmounts.set(pieceId, newAmount);
                }
            }
        });

        return spendingPieces.map(p => ({
            name: p.label,
            value: scenarioAmounts.get(p.id) || 0,
            code: p.id,
            label: p.label,
            share: 0
        }));
    }, [baselinePieces, spendingPieces, scenarioDsl]);


    if (loading) return <div>Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    const resolutionPct = scenarioResult?.resolution?.overallPct ?? 0;

    return (
        <div className="build-page-container">
            <div className="hud-bar">
                <div className="hud-left">
                    <div className="logo">Citizen Budget Lab</div>
                    <div className="resolution-meter">
                        <span className="meter-label">Resolution:</span>
                        <div className="meter-bar">
                            <div className="meter-fill" style={{ width: `${resolutionPct * 100}%` }}></div>
                        </div>
                        <span className="meter-value">{`${(resolutionPct * 100).toFixed(0)}%`}</span>
                    </div>
                </div>
                <div className="hud-right">
                    <button className="fr-btn" onClick={runScenario} disabled={isRunning}>
                        {isRunning ? 'Running...' : 'Run Scenario'}
                    </button>
                    <RuleLights {...scenarioResult?.compliance} />
                    <div className="nav-controls">
                        <button className="nav-button" title="Reset" onClick={() => setScenarioDsl(INITIAL_DSL)}><span>&#x21BB;</span></button>
                    </div>
                </div>
            </div>

            <div className="main-content">
                <div className="left-panel">
                    {selectedCategory ? (
                        <ExpandedCategoryView
                            category={selectedCategory}
                            onBack={() => setSelectedCategory(null)}
                            onApplyChange={handleApplyChange}
                            onAddLever={handleAddLever}
                        />
                    ) : (
                        <>
                            <div className="panel-header">Spending Targets & Reforms</div>
                            {spendingPieces.map((cat) => (
                                <div key={cat.id} className="spending-category" onClick={() => setSelectedCategory(cat)}>
                                    <div className="category-header">
                                        <div className="category-name">{cat.label}</div>
                                        <div className="category-amount">
                                            {cat.amountEur ? `€${(cat.amountEur / 1e9).toFixed(1)}B` : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="center-panel">
                    <div className="lens-switcher">
                        <div className="lens-option active">By Mass</div>
                        <div className="lens-option">By Family</div>
                        <div className="lens-option">By Reform</div>
                    </div>
                    <div className="treemap-container">
                        <AllocationChart rows={treemapData} kind="treemap" />
                    </div>
                    <div className="scenario-charts">
                        <div className="chart">
                            <div className="chart-title">Debt Path</div>
                            <DeficitPathChart deficit={[]} debt={scenarioResult?.accounting?.debtPath || []} />
                        </div>
                        <div className="chart">
                            <div className="chart-title">Deficit</div>
                            <DeficitPathChart deficit={scenarioResult?.accounting?.deficitPath || []} debt={[]} />
                        </div>
                        <div className="chart">
                            <div className="chart-title">Growth (ΔGDP)</div>
                            <DeficitPathChart deficit={scenarioResult?.macro?.deltaGDP || []} debt={[]} />
                        </div>
                    </div>
                </div>

                <div className="right-panel">
                    <div className="panel-header">Revenues</div>
                    {revenuePieces.map((cat) => (
                        <div key={cat.id} className="revenue-category">
                            <div className="category-header">
                                <div className="category-name">{cat.label}</div>
                                <div className="category-amount">
                                    {cat.amountEur ? `€${(cat.amountEur / 1e9).toFixed(1)}B` : 'N/A'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}