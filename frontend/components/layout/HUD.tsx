"use client";

import React from "react";
import { SolvencyMeter } from "../visualizations/SolvencyMeter";

interface HUDProps {
    deficit: number; // in Billions
    revenue: number; // in Billions
    spending: number; // in Billions
    deficitPercentage: number; // % of GDP
    // Controls
    aggregationLens: string;
    displayMode: 'amount' | 'share';
    lens: 'mass' | 'family' | 'reform';
    ghostMode: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onLensSwitch: (lens: string) => void;
    onDisplayModeChange: (mode: 'amount' | 'share') => void;
    onViewLensChange: (lens: 'mass' | 'family' | 'reform') => void;
    onGhostModeToggle: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onReset: () => void;
    onShare: () => void;
}

export const HUD: React.FC<HUDProps> = ({
    deficit,
    revenue,
    spending,
    deficitPercentage,
    aggregationLens,
    displayMode,
    lens,
    ghostMode,
    canUndo,
    canRedo,
    onLensSwitch,
    onDisplayModeChange,
    onViewLensChange,
    onGhostModeToggle,
    onUndo,
    onRedo,
    onReset,
    onShare,
}) => {
    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg supports-[backdrop-filter]:bg-white/60 transition-all duration-300">
            <div className="max-w-[1920px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
                {/* Left: Brand & Primary Controls */}
                <div className="flex items-center gap-8">
                    <div className="flex flex-col shrink-0">
                        <div className="font-black text-xl text-dsfr-blue tracking-tighter leading-none">
                            MISSION CONTROL
                        </div>
                        <div className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] leading-none mt-1">
                            Citizen Budget Lab
                        </div>
                    </div>

                    <div className="h-8 w-px bg-gray-200" />

                    {/* View Controls */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100/50 rounded-lg p-1 gap-1 border border-gray-200/50">
                            <button
                                onClick={() => onLensSwitch('MISSION')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${aggregationLens === 'MISSION' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                ADMIN
                            </button>
                            <button
                                onClick={() => onLensSwitch('COFOG')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${aggregationLens === 'COFOG' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                FUNCTION
                            </button>
                        </div>

                        <div className="flex bg-gray-100/50 rounded-lg p-1 gap-1 border border-gray-200/50">
                            <button
                                onClick={() => onDisplayModeChange('amount')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayMode === 'amount' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                €
                            </button>
                            <button
                                onClick={() => onDisplayModeChange('share')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayMode === 'share' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                %
                            </button>
                        </div>

                        <div className="h-8 w-px bg-gray-200" />

                        <div className="flex bg-gray-100/50 rounded-lg p-1 gap-1 border border-gray-200/50">
                            <button
                                onClick={() => onViewLensChange('mass')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${lens === 'mass' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                MISSION
                            </button>
                            <button
                                onClick={() => onViewLensChange('family')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${lens === 'family' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                FAMILY
                            </button>
                            <button
                                onClick={() => onViewLensChange('reform')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${lens === 'reform' ? 'bg-white text-dsfr-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                REFORM
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center: Key Metrics */}
                <div className="flex items-center gap-8 bg-white/50 px-6 py-1.5 rounded-2xl border border-white/40 shadow-sm backdrop-blur-md">
                    <MetricBox label="Revenue" value={revenue / 1e9} color="text-dsfr-blue" icon="trending_up" />
                    <div className="h-8 w-px bg-gray-300/50" />
                    <MetricBox label="Spending" value={spending / 1e9} color="text-dsfr-grey" icon="trending_down" />
                    <div className="h-8 w-px bg-gray-300/50" />
                    <div className="flex flex-col items-end min-w-[100px]" title={deficit > 0 ? "Budget Deficit" : "Budget Surplus"}>
                        <span className="text-[9px] font-bold uppercase text-muted tracking-wider mb-0.5">
                            {deficit > 0 ? 'Deficit' : 'Surplus'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-xl font-mono font-bold tracking-tight leading-none ${deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {deficit > 0 ? '-' : '+'}{Math.abs(deficit / 1e9).toFixed(1)}B€
                            </span>
                            <span className="text-xs font-medium text-gray-500">
                                ({deficitPercentage.toFixed(1)}% GDP)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions & Gauge */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onGhostModeToggle}
                            className={`p-2 rounded-lg transition-all ${ghostMode ? 'bg-purple-100 text-purple-700 shadow-inner' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                            title="Ghost Mode (Compare Baseline)"
                        >
                            <i className="material-icons text-lg">visibility</i>
                        </button>
                        <div className="h-6 w-px bg-gray-200" />
                        <button onClick={onUndo} disabled={!canUndo} className="p-2 text-gray-400 hover:text-dsfr-blue disabled:opacity-30 transition-colors">
                            <i className="material-icons text-lg">undo</i>
                        </button>
                        <button onClick={onRedo} disabled={!canRedo} className="p-2 text-gray-400 hover:text-dsfr-blue disabled:opacity-30 transition-colors">
                            <i className="material-icons text-lg">redo</i>
                        </button>
                        <button onClick={onReset} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Reset">
                            <i className="material-icons text-lg">refresh</i>
                        </button>
                        <button onClick={onShare} className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-dsfr-blue text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                            <i className="material-icons text-sm">ios_share</i>
                            SHARE
                        </button>
                    </div>
                    <div className="pl-4 border-l border-gray-200">
                        <SolvencyMeter deficitPercentage={deficitPercentage} />
                    </div>
                </div>
            </div>
        </header>
    );
};

const MetricBox = ({ label, value, color, icon }: { label: string; value: number; color: string, icon: string }) => (
    <div className="flex items-center gap-3 group cursor-help" title={`${label}: ${value.toFixed(1)} Billion Euros`}>
        <div className={`p-1.5 rounded-lg bg-white shadow-sm border border-gray-100 ${color} bg-opacity-10`}>
            <i className="material-icons text-lg opacity-80">{icon}</i>
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-muted tracking-wider mb-0.5">{label}</span>
            <span className={`text-lg font-mono font-bold leading-none ${color}`}>
                {value.toFixed(1)}B€
            </span>
        </div>
    </div>
);
