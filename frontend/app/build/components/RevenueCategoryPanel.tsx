import { useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import type { LegoPiece, PolicyLever, PopularIntent, DslAction, RevenueFamily } from '../types';
import { ReformDetailDrawer } from './ReformDetailDrawer';

const lightenColor = (hex: string, amount = 0.25) => {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const value = parseInt(hex.slice(1), 16);
  const base = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = base((value >> 16) & 255);
  const g = base((value >> 8) & 255);
  const b = base(value & 255);
  return `rgb(${r}, ${g}, ${b})`;
};

export type RevenuePanelVisual = {
  color: string;
  icon: string;
};

export type RevenueCategoryPanelProps = {
  category: LegoPiece;
  family?: RevenueFamily;
  visual?: RevenuePanelVisual;
  targetPercent: number;
  targetRangeMax: number;
  onTargetPercentChange: (value: number) => void;
  onRangeChange: (nextMax: number) => void;
  onApplyTarget: () => void;
  onClearTarget: () => void;
  onBack: () => void;
  suggestedLevers: PolicyLever[];
  onLeverToggle: (lever: PolicyLever) => void;
  isLeverSelected: (leverId: string) => boolean;
  popularIntents: PopularIntent[];
  onIntentClick: (intent: PopularIntent) => void;
  formatCurrency: (value: number) => string;
  formatShare: (value: number) => string;
  displayMode: 'amount' | 'share';
};

export function RevenueCategoryPanel({
  category,
  family,
  visual,
  targetPercent,
  targetRangeMax,
  onTargetPercentChange,
  onRangeChange,
  onApplyTarget,
  onClearTarget,
  onBack,
  suggestedLevers,
  onLeverToggle,
  isLeverSelected,
  popularIntents,
  onIntentClick,
  formatCurrency,
  formatShare,
  displayMode,
}: RevenueCategoryPanelProps) {
  const [viewingReform, setViewingReform] = useState<PolicyLever | null>(null);

  const percentStep = 0.5;
  const defaultRange = 10;
  const expandedRange = 25;
  const isExpanded = targetRangeMax > defaultRange;
  const percentLabel = `${targetPercent > 0 ? '+' : targetPercent < 0 ? '' : ''}${targetPercent.toFixed(1)}%`;
  const targetAmount = (category.amountEur || 0) * targetPercent / 100;
  const amountLabel = `${targetAmount > 0 ? '+' : ''}${formatCurrency(targetAmount)}`;
  const rangeLabel = isExpanded ? '±25% ◂' : '±10% ▸';
  const clampToRange = (value: number) => Math.max(-targetRangeMax, Math.min(targetRangeMax, value));
  const roundToStep = (value: number) => Math.round(value / percentStep) * percentStep;
  const applyPercent = (value: number) => {
    const rounded = roundToStep(clampToRange(value));
    onTargetPercentChange(Number(rounded.toFixed(1)));
  };
  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyPercent(Number(event.target.value));
  };
  const handleNudge = (direction: -1 | 1) => {
    applyPercent(targetPercent + direction * percentStep);
  };
  const handleRangeToggle = () => {
    onRangeChange(isExpanded ? defaultRange : expandedRange);
  };
  const handleClear = () => {
    onTargetPercentChange(0);
    onClearTarget();
  };
  const atMin = targetPercent <= -targetRangeMax + 1e-9;
  const atMax = targetPercent >= targetRangeMax - 1e-9;

  const accentColor = visual?.color || '#0ea5e9';
  const iconTint = lightenColor(accentColor, 0.88);
  const pillTint = lightenColor(accentColor, 0.82);
  const accentStyle = { '--panel-accent': accentColor } as CSSProperties;
  const filteredLevers = suggestedLevers.filter((lever) => {
    // If specifically targeting this revenue category, include it
    if (lever.targetRevenueCategoryId === category.id) return true;
    
    // If no specific mapping exists (empty object or undefined), and it was suggested, include it
    if (!lever.cofogMapping || Object.keys(lever.cofogMapping).length === 0) return true;

    // Otherwise check for explicit COFOG mapping overlap
    const share = lever.cofogMapping[category.id];
    return typeof share === 'number' && share > 0;
  });

  // Calculate Resolved Amount from selected reforms
  const resolvedAmount = (filteredLevers.length ? filteredLevers : suggestedLevers)
    .filter(l => isLeverSelected(l.id))
    .reduce((sum, l) => sum + (l.fixedImpactEur || 0), 0);

  const relevantIntents = popularIntents.filter((intent) => {
    const actions = intent.seed?.actions as DslAction[] | undefined;
    return actions?.some((action) => action.target === `piece.${category.id}`) ?? false;
  });

  return (
    <>
      <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/60 shadow-xl bg-white/90 backdrop-blur-xl transition-all duration-300" style={accentStyle}>
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

        {/* Header Section - Compact */}
        <div className="relative px-4 py-3 border-b border-slate-100 shrink-0 bg-white/50 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
              onClick={onBack}
            >
              <i className="material-icons text-xl">arrow_back</i>
            </button>
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg text-lg shadow-sm ring-1 ring-black/5 flex-shrink-0"
              aria-hidden="true"
              style={{ backgroundColor: iconTint, color: accentColor }}
            >
              {visual?.icon || '💶'}
            </span>
            <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
              <h2 className="text-base font-bold text-slate-800 truncate">{category.label}</h2>
              <div className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {formatCurrency(category.amountEur || 0)} <span className="text-slate-300">•</span> {formatShare(category.share || 0)}
              </div>
            </div>
          </div>
          
          {/* Vigilance Points (from Family) */}
          {family?.vigilancePoints && family.vigilancePoints.length > 0 && (
            <div className="mt-1 bg-amber-50/80 border border-amber-100 rounded-lg p-2 text-[10px] text-amber-800 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-1.5 font-bold mb-1 uppercase tracking-wide opacity-80">
                <i className="material-icons text-xs">warning</i> Points de vigilance
              </div>
              <ul className="list-disc list-outside ml-3 space-y-0.5 opacity-90">
                {family.vigilancePoints.slice(0, 2).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Controls Section - Scrollable Area */}
        <div className="relative flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 custom-scrollbar">

          {/* Unified Simulator Card */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 shadow-sm space-y-3">

            {/* Row 1: Label + Toggles */}
            {/* Row 1: Label + Scale Selector */}
            <div className="flex items-center justify-between h-6">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <i className="material-icons text-xs">tune</i> Objectif
                </label>
                <div className={`text-sm font-bold ${targetPercent === 0 ? 'text-slate-300' : (targetPercent > 0 ? 'text-emerald-500' : 'text-rose-500')}`}>
                  {targetPercent > 0 ? '+' : ''}{targetPercent.toFixed(1)}%
                </div>
              </div>

              {/* Scale Selector */}
              <div className="flex bg-slate-200/50 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => onRangeChange(defaultRange)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${!isExpanded ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ±10%
                </button>
                <button
                  type="button"
                  onClick={() => onRangeChange(expandedRange)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${isExpanded ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ±25%
                </button>
              </div>
            </div>

            {/* Row 2: Slider + Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-400 disabled:opacity-30"
                onClick={() => handleNudge(-1)}
                disabled={atMin}
              >
                <i className="material-icons text-xs">remove</i>
              </button>
              <div className="flex-1 relative h-7 sm:h-6 flex items-center">
                <div className="absolute left-0 right-0 h-1.5 sm:h-1 bg-slate-200 rounded-full overflow-hidden">
                  {/* Center mark */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 -translate-x-1/2" />
                  {/* Fill - Inverted colors for Revenue: Positive % is Green (more revenue), Negative is Red */}
                  <div
                    className={`absolute h-full ${targetPercent > 0 ? 'bg-emerald-400' : 'bg-rose-400'} transition-all`}
                    style={{
                      left: targetPercent < 0 ? `${50 + (targetPercent / targetRangeMax) * 50}%` : '50%',
                      right: targetPercent > 0 ? `${50 - (targetPercent / targetRangeMax) * 50}%` : '50%'
                    }}
                  />
                </div>
                <input
                  type="range"
                  className="relative w-full h-7 sm:h-6 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 sm:[&::-webkit-slider-thumb]:w-3 sm:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                  min={-targetRangeMax}
                  max={targetRangeMax}
                  step={percentStep}
                  value={targetPercent}
                  onChange={handleSliderChange}
                />
              </div>
              <button
                type="button"
                className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-400 disabled:opacity-30"
                onClick={() => handleNudge(1)}
                disabled={atMax}
              >
                <i className="material-icons text-xs">add</i>
              </button>
            </div>

            {/* Row 3: Metrics & Visualization (Only show if active) */}
            {targetAmount !== 0 && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between items-end mb-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">Changement souhaité</span>
                    <span className={`text-sm font-bold ${targetAmount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {targetAmount > 0 ? '+' : ''}{formatCurrency(targetAmount)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Couvert par des mesures concrètes
                    </span>
                    <span className={`text-sm font-bold ${resolvedAmount !== 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {resolvedAmount > 0 ? '+' : ''}{formatCurrency(resolvedAmount)}
                    </span>
                  </div>
                </div>
                {/* Mini Bar */}
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden flex w-full">
                  <div className="h-full bg-slate-500 transition-all text-opacity-50" style={{ width: `${Math.min(100, Math.abs(resolvedAmount / targetAmount) * 100)}%` }} />
                  <div className="h-full bg-slate-300/30 relative" style={{
                    width: `${Math.max(0, 100 - Math.min(100, Math.abs(resolvedAmount / targetAmount) * 100))}%`,
                  }} />
                </div>
              </div>
            )}

            {/* Row 4: Actions */}
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 h-10 sm:h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                onClick={onApplyTarget}
              >
                Appliquer
              </button>
              <button
                className="h-10 sm:h-8 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
                onClick={handleClear}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Reforms Section */}
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Réformes ({filteredLevers.length || suggestedLevers.length})</div>
            <div className="space-y-1.5">
              {(filteredLevers.length ? filteredLevers : suggestedLevers).map((reform) => (
                <div
                  key={reform.id}
                  className={`group relative p-2 px-3 rounded-lg border transition-all duration-200 cursor-pointer ${isLeverSelected(reform.id)
                    ? 'bg-emerald-50/50 border-emerald-200/50'
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  onClick={() => setViewingReform(reform)}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 truncate">{reform.label}</span>
                        {isLeverSelected(reform.id) && <i className="material-icons text-[10px] text-emerald-600">check_circle</i>}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate opacity-70 group-hover:opacity-100">{reform.description}</div>
                    </div>

                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 ${reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(reform.fixedImpactEur || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Reforms */}
          {relevantIntents.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Populaire</div>
              <div className="flex flex-wrap gap-1.5">
                {relevantIntents.map((intent) => (
                  <button
                    key={intent.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: pillTint, color: accentColor }}
                    onClick={() => onIntentClick(intent)}
                  >
                    <span className="text-xs">{intent.emoji}</span>
                    <span>{intent.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <ReformDetailDrawer
        reform={viewingReform}
        onClose={() => setViewingReform(null)}
        onToggle={onLeverToggle}
        isSelected={viewingReform ? isLeverSelected(viewingReform.id) : false}
        side="right" // Revenue panel is on the right
      />
    </>
  );
}
