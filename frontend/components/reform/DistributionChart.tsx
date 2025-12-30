
import React from 'react';

interface DistributionChartProps {
    d1: number;
    d10: number;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ d1, d10 }) => {
    // Normalize values to fit in a small chart.
    // Find max absolute value to set scale.
    const maxVal = Math.max(Math.abs(d1), Math.abs(d10), 100);

    const renderBar = (val: number, label: string) => {
        const isGain = val >= 0;
        const color = isGain ? 'bg-emerald-500' : 'bg-rose-500';
        const textColor = isGain ? 'text-emerald-700' : 'text-rose-700';
        const widthPct = Math.min(100, (Math.abs(val) / maxVal) * 100);

        return (
            <div className="flex items-center text-xs gap-2 mb-1.5 last:mb-0">
                <div className="w-16 text-slate-500 text-xs shrink-0">{label}</div>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${widthPct}%` }}
                    />
                </div>
                <div className={`w-12 text-right shrink-0 font-medium ${textColor}`}>
                    {val > 0 ? '+' : ''}{Math.round(val)}€
                </div>
            </div>
        )
    };

    return (
        <div className="w-full pt-2 mt-2 border-t border-slate-100">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2 font-semibold flex justify-between">
                <span>Impact Pouvoir d&apos;Achat</span>
                <span className="font-normal normal-case text-slate-300">(par an)</span>
            </div>
            {renderBar(d1, "10% Pauvres")}
            {renderBar(d10, "10% Riches")}
        </div>
    );
};
