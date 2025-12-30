import { useMemo, useRef, useEffect } from 'react';
import type { ScenarioResult } from '@/lib/types';

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
        let spending = baselineTotals.spending;
        let revenue = baselineTotals.revenue;
        let deficitRatio = null;
        let resolution = 0;

        if (scenarioResult?.accounting) {
            const { accounting, resolution: res } = scenarioResult;

            // Deficit is typically provided in the path. We take the first year (current).
            // Note: accounting.deficitPath is usually positive for deficit in this app? 
            // Let's check logic: usually revenue - spending. 
            // If the engine returns "deficit", it might be positive. 
            // Let's trust the "deficitPath" from the engine if available.

            if (accounting.deficitPath && accounting.deficitPath.length > 0) {
                // In this app, "deficitPath" seems to track the Balance (Solde).
                // If it's negative, it's a deficit. We should use it directly.
                deficit = accounting.deficitPath[0];
            }

            // Ratios
            if (accounting.deficitRatioPath && accounting.deficitRatioPath.length > 0) {
                deficitRatio = accounting.deficitRatioPath[0];
            }

            // Resolution
            if (res?.overallPct !== undefined) {
                resolution = res.overallPct;
            }
        }

        return { deficit, spending, revenue, deficitRatio, resolution };
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

    const isDeficitBad = stats.deficit < -3.0; // Arbitrary visualization threshold (e.g. -3% GDP is huge)
    // Actually, usually deficit is negative balance. So < 0 is red.

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

            {/* CENTER: Resolution Meter */}
            <div id="scoreboard-resolution" className="flex-1 max-w-lg mx-8 flex flex-col justify-center">
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>Objectif Résolution</span>
                    <span>{Math.round(stats.resolution * 100)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, stats.resolution * 100))}%` }}
                    />
                </div>
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
                    onClick={onShare}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm transition-all shadow-md hover:shadow-lg"
                >
                    <span className="material-icons text-sm">share</span>
                    Partager
                </button>
            </div>
        </div>
    );
}
