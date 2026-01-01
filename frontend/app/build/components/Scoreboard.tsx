import { useMemo, useRef, useEffect } from 'react';
import type { ScenarioResult } from '@/lib/types';
import { MacroPathChart } from './MacroPathChart';

interface ScoreboardProps {
    scenarioResult: ScenarioResult | null;
    baselineTotals: { spending: number; revenue: number };
    onReset: () => void;
    onShare: () => void;
    onRunTutorial?: () => void;
    year: number;
    previewDeficit?: number | null;
}

const formatCurrencyShort = (amount: number) => {
    const abs = Math.abs(amount) / 1e9;
    return `${(amount < 0 ? '-' : '')}${abs.toFixed(1)} Md€`;
};

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

export function Scoreboard({
    scenarioResult,
    baselineTotals,
    onReset,
    onShare,
    onRunTutorial,
    year,
    previewDeficit,
}: ScoreboardProps) {

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

    return (
        <div className="w-full bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between font-['Outfit']">

            {/* LEFT: Context & Year */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget</span>
                    <span className="text-2xl font-bold text-slate-800">{year}</span>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                {/* Primary Metric: BALANCE / DEFICIT */}
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solde Public</span>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-3">
                            {/* Current Value */}
                            <span id="scoreboard-deficit" className={`text-3xl font-extrabold tracking-tight transition-all duration-300 ${showPreview ? 'opacity-40 blur-[1px]' : ''} ${stats.deficit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {stats.deficit > 0 ? '+' : ''}{formatCurrencyShort(stats.deficit)}
                            </span>

                            {/* Ghost / Preview Value */}
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

            {/* CENTER: Macro Trajectory Chart */}
            <div id="scoreboard-resolution" className="flex-1 max-w-lg mx-8 h-full">
                <MacroPathChart scenarioResult={scenarioResult} year={year} />
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-3">
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
    );
}
