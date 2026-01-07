import { useMemo, useRef, useEffect, useState } from 'react';
import type { ScenarioResult } from '@/lib/types';
import type { DslAction, PolicyLever } from '../types';
import { ScenarioDashboard } from './ScenarioDashboard';

interface ScoreboardProps {
    scenarioResult: ScenarioResult | null;
    baselineTotals: { spending: number; revenue: number };
    currentTotals: { spending: number; revenue: number };
    baselineMasses?: Map<string, { name: string; amount: number }>;
    piecesById?: Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>;
    actions: DslAction[];
    policyLevers: PolicyLever[];
    onReset: () => void;
    onShare: () => void;
    onRunTutorial?: () => void;
    onOpenSpendingPanel?: () => void;
    onOpenRevenuePanel?: () => void;
    year: number;
    previewDeficit?: number | null;
    displayMode: 'amount' | 'share';
    setDisplayMode: (mode: 'amount' | 'share') => void;
    activeMobileTab?: 'spending' | 'revenue' | 'none';
}

const formatCurrencyShort = (amount: number) => {
    const abs = Math.abs(amount) / 1e9;
    return `${(amount < 0 ? '-' : '')}${abs.toFixed(1)} Md€`;
};

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

export function Scoreboard({
    scenarioResult,
    baselineTotals,
    currentTotals,
    baselineMasses,
    piecesById,
    actions,
    policyLevers,
    onReset,
    onShare,
    onRunTutorial,
    onOpenSpendingPanel,
    onOpenRevenuePanel,
    year,
    previewDeficit,
    displayMode,
    setDisplayMode,
    activeMobileTab = 'none',
}: ScoreboardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Extract critical metrics from the scenario result (or fallback to baseline)
    const stats = useMemo(() => {
        // Default to baseline if no run result yet
        let deficit = (baselineTotals.revenue - baselineTotals.spending);
        let deficitRatio = null;

        if (scenarioResult?.accounting) {
            const { accounting } = scenarioResult;

            if (accounting.deficitPath && accounting.deficitPath.length > 0) {
                deficit = accounting.deficitPath[0];
            }

            if (accounting.deficitRatioPath && accounting.deficitRatioPath.length > 0) {
                deficitRatio = accounting.deficitRatioPath[0];
            }
        }

        return { deficit, deficitRatio };
    }, [scenarioResult, baselineTotals]);

    // Confetti Effect on Milestones
    const prevDeficitRatio = useRef(stats.deficitRatio);
    const hasTriggeredSuccess = useRef(false);

    useEffect(() => {
        if (stats.deficitRatio !== null && prevDeficitRatio.current !== null) {
            // Check if we just crossed -3% (from worse to better)
            if (prevDeficitRatio.current < -0.03 && stats.deficitRatio >= -0.03 && !hasTriggeredSuccess.current) {
                import('canvas-confetti').then((confetti) => {
                    confetti.default({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                });
                hasTriggeredSuccess.current = true;
            }
        }
        prevDeficitRatio.current = stats.deficitRatio;
    }, [stats.deficitRatio]);

    // Preview Logic
    const showPreview = previewDeficit !== undefined && previewDeficit !== null && previewDeficit !== stats.deficit;
    const previewDiff = showPreview ? (previewDeficit! - stats.deficit) : 0;

    const baselineDeficit = useMemo(() => {
        const basePath = scenarioResult?.accounting?.baselineDeficitPath;
        if (Array.isArray(basePath) && basePath.length > 0) {
            const val = Number(basePath[0]);
            if (Number.isFinite(val)) {
                return val;
            }
        }
        return baselineTotals.revenue - baselineTotals.spending;
    }, [baselineTotals, scenarioResult]);

    const deficitDelta = useMemo(() => {
        const val = stats.deficit - baselineDeficit;
        return Number.isFinite(val) ? val : 0;
    }, [baselineDeficit, stats.deficit]);
    return (
        <div className="w-full bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm sticky top-0 z-50 px-3 py-2 sm:px-6 sm:py-4 font-['Outfit']">

            {/* MOBILE LAYOUT (< md) - "Option A Refined" */}
            <div className="flex flex-col gap-2 md:hidden w-full pb-1">
                {/* Row 1: Deficit & Voter Button */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Solde</span>
                        <span className={`text-2xl font-extrabold tracking-tight ${stats.deficit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {stats.deficit > 0 ? '+' : ''}{formatCurrencyShort(stats.deficit)}
                        </span>
                        {stats.deficitRatio !== null && (
                            <span className={`text-xs font-semibold ${stats.deficitRatio < -0.03 ? 'text-red-500' : 'text-slate-500'}`}>
                                ({formatPercent(stats.deficitRatio)})
                            </span>
                        )}
                    </div>

                    <button
                        id="scoreboard-vote-btn-mobile"
                        onClick={onShare}
                        className="px-4 py-1.5 bg-blue-600 active:bg-blue-700 text-white rounded-full font-bold text-xs shadow-sm shadow-blue-200"
                    >
                        Voter
                    </button>
                </div>

                {/* Row 2: Main Toggle (Budget vs Recettes) - Pill Style with Explicit Active States */}
                <div className="flex bg-slate-200/80 p-1 rounded-full w-full relative h-[34px]">
                    <button
                        onClick={onOpenSpendingPanel}
                        className={`flex-1 rounded-full text-[11px] font-bold transition-all duration-200 flex items-center justify-center z-10 ${activeMobileTab === 'spending'
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Dépenses
                    </button>
                    <button
                        onClick={onOpenRevenuePanel}
                        className={`flex-1 rounded-full text-[11px] font-bold transition-all duration-200 flex items-center justify-center z-10 ${activeMobileTab === 'revenue'
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Recettes
                    </button>
                </div>

                {/* Row 3: Compact Action Toolbar */}
                <div className="flex items-center justify-between px-2 pt-1">
                    <button
                        onClick={() => setIsDetailsOpen((prev) => !prev)}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors min-w-[50px] ${isDetailsOpen ? 'text-blue-600' : 'text-slate-400 active:bg-slate-50'}`}
                    >
                        <span className="material-icons text-lg">insights</span>
                        <span className="text-[8px] font-bold uppercase tracking-wide">Détails</span>
                    </button>

                    <button
                        onClick={() => setDisplayMode(displayMode === 'amount' ? 'share' : 'amount')}
                        className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-slate-400 active:bg-slate-50 min-w-[50px]"
                    >
                        <div className="h-4 w-4 flex items-center justify-center font-bold text-[10px] border border-current rounded bg-transparent">
                            {displayMode === 'amount' ? '%' : '€'}
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wide">Unité</span>
                    </button>

                    {onRunTutorial && (
                        <button
                            onClick={onRunTutorial}
                            className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-slate-400 active:bg-slate-50 min-w-[50px]"
                        >
                            <span className="material-icons text-lg">help_outline</span>
                            <span className="text-[8px] font-bold uppercase tracking-wide">Aide</span>
                        </button>
                    )}

                    <button
                        onClick={onReset}
                        className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-slate-400 active:bg-slate-50 hover:text-red-500 min-w-[50px]"
                    >
                        <span className="material-icons text-lg">restart_alt</span>
                        <span className="text-[8px] font-bold uppercase tracking-wide">Reset</span>
                    </button>
                </div>

                {/* Mobile Dashboard Detail View (Collapsible) */}
                {isDetailsOpen && (
                    <div className="mt-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2">
                        <ScenarioDashboard
                            baselineTotals={baselineTotals}
                            currentTotals={currentTotals}
                            deficitDelta={deficitDelta}
                            baselineMasses={baselineMasses}
                            piecesById={piecesById}
                            actions={actions}
                            policyLevers={policyLevers}
                        />
                    </div>
                )}
            </div>


            {/* DESKTOP LAYOUT (md+) - Existing Layout Preserved */}
            <div className="hidden md:flex flex-row items-center justify-between gap-4 w-full">
                {/* LEFT: Context & Year */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget</span>
                        <span className="text-2xl font-bold text-slate-800">{year}</span>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                    {/* Primary Metric: BALANCE / DEFICIT */}
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solde Public</span>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-3">
                                    <span id="scoreboard-deficit" className={`text-3xl font-extrabold tracking-tight transition-all duration-300 ${showPreview ? 'opacity-40 blur-[1px]' : ''} ${stats.deficit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {stats.deficit > 0 ? '+' : ''}{formatCurrencyShort(stats.deficit)}
                                    </span>
                                    {showPreview && (
                                        <span className={`text-3xl font-extrabold tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-200 ${previewDeficit! < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {previewDeficit! > 0 ? '+' : ''}{formatCurrencyShort(previewDeficit!)}
                                        </span>
                                    )}
                                </div>
                                <div className="min-h-5">
                                    {showPreview ? (
                                        <span className={`text-xs font-bold leading-tight ${previewDiff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {previewDiff > 0 ? '▲' : '▼'} Impact: {previewDiff > 0 ? '+' : ''}{formatCurrencyShort(previewDiff)}
                                        </span>
                                    ) : stats.deficitRatio !== null ? (
                                        <span className={`text-sm font-medium leading-tight ${stats.deficitRatio < -0.03 ? 'text-red-500' : 'text-slate-500'}`}>
                                            {formatPercent(stats.deficitRatio)} du PIB
                                        </span>
                                    ) : (
                                        <span className="text-sm text-transparent">.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER: Scenario Dashboard */}
                <div
                    id="scoreboard-resolution"
                    className={`flex-1 max-w-2xl mx-6 block`}
                >
                    <ScenarioDashboard
                        baselineTotals={baselineTotals}
                        currentTotals={currentTotals}
                        deficitDelta={deficitDelta}
                        baselineMasses={baselineMasses}
                        piecesById={piecesById}
                        actions={actions}
                        policyLevers={policyLevers}
                    />
                </div>

                {/* RIGHT: Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2 border border-slate-200">
                        <button
                            onClick={() => setDisplayMode('amount')}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${displayMode === 'amount' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Voir en Montants (€)"
                        >
                            €
                        </button>
                        <button
                            onClick={() => setDisplayMode('share')}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${displayMode === 'share' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Voir en Pourcentages (%)"
                        >
                            %
                        </button>
                    </div>

                    {onRunTutorial && (
                        <button
                            onClick={onRunTutorial}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Relancer le tutoriel"
                        >
                            <span className="material-icons">help_outline</span>
                        </button>
                    )}
                    <button
                        onClick={onReset}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Réinitialiser la simulation"
                    >
                        <span className="material-icons">restart_alt</span>
                    </button>

                    <button
                        id="scoreboard-vote-btn"
                        onClick={onShare}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105"
                    >
                        <span className="material-icons text-sm">how_to_vote</span>
                        Voter
                    </button>
                </div>
            </div>
        </div>
    );

}
