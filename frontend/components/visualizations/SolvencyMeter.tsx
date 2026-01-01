"use client";

import React from "react";

interface SolvencyMeterProps {
    deficitPercentage: number; // e.g., 4.5 for 4.5%
}

export const SolvencyMeter: React.FC<SolvencyMeterProps> = ({
    deficitPercentage,
}) => {
    // Target is 3%.
    // We want to visualize a range, e.g., from 0% to 10%.
    const maxRange = 8;
    const clampedValue = Math.min(Math.max(deficitPercentage, 0), maxRange);
    const percentage = (clampedValue / maxRange) * 100;
    const targetPosition = (3 / maxRange) * 100;

    // Determine color based on the 3% threshold
    const isSafe = deficitPercentage <= 3;
    const barColor = isSafe ? "bg-green-500" : "bg-red-500";
    const glowColor = isSafe ? "shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "shadow-[0_0_10px_rgba(239,68,68,0.5)]";

    return (
        <div className="flex flex-col gap-1 min-w-[140px]">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted">
                <span>Solvabilité</span>
                <span className={isSafe ? "text-green-600" : "text-red-600"}>
                    {deficitPercentage.toFixed(1)}%
                </span>
            </div>
            <div className="relative h-3 w-full bg-gray-200 rounded-sm overflow-hidden">
                {/* Target Line (3%) */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-black/20 z-10"
                    style={{ left: `${targetPosition}%` }}
                    title="Cible : 3 %"
                />

                {/* Progress Bar */}
                <div
                    className={`h-full transition-all duration-500 ease-out ${barColor} ${glowColor}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-muted opacity-70">
                <span>0%</span>
                <span>3%</span>
                <span>{maxRange}%+</span>
            </div>
        </div>
    );
};
