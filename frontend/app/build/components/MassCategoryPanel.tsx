import { useState } from 'react';
import type { PolicyLever, PopularIntent, MassCategory } from '../types';
import type { CSSProperties, ChangeEvent } from 'react';
import { ReformDetailDrawer } from './ReformDetailDrawer';

export type MassCategoryPanelProps = {
  category: MassCategory;
  targetPercent: number;
  targetRangeMax: number;
  onTargetPercentChange: (value: number) => void;
  onRangeChange: (nextMax: number) => void;
  onApplyTarget: () => void;
  onClearTarget: () => void;
  onClose: () => void;
  suggestedLevers: PolicyLever[];
  onLeverToggle: (lever: PolicyLever) => void;
  isLeverSelected: (leverId: string) => boolean;
  popularIntents: PopularIntent[];
  onIntentClick: (intent: PopularIntent) => void;
  formatCurrency: (value: number) => string;
  formatShare: (value: number) => string;
  displayMode: 'amount' | 'share';
};

export function MassCategoryPanel({
  category,
  targetPercent,
  targetRangeMax,
  onTargetPercentChange,
  onRangeChange,
  onApplyTarget,
  onClearTarget,
  onClose,
  suggestedLevers,
  onLeverToggle,
  isLeverSelected,
  popularIntents,
  onIntentClick,
  formatCurrency,
  formatShare,
  displayMode,
}: MassCategoryPanelProps) {
  const [viewingReform, setViewingReform] = useState<PolicyLever | null>(null);

  const percentStep = 0.5;
  const defaultRange = 10;
  const expandedRange = 25;
  const isExpanded = targetRangeMax > defaultRange;
  const percentLabel = `${targetPercent > 0 ? '+' : targetPercent < 0 ? '' : ''}${targetPercent.toFixed(1)}%`;
  const baselineAmount = category.baselineAmount ?? category.amount ?? 0;
  const targetAmount = (baselineAmount) * targetPercent / 100;

  // Calculate Resolved Amount from selected reforms
  const resolvedAmount = suggestedLevers
    .filter(l => isLeverSelected(l.id))
    .reduce((sum, l) => sum + (l.fixedImpactEur || 0), 0);

  // Unresolved is the difference between the Target and the Resolved reforms
  // Note: targetAmount is signed (negative for cuts). resolvedAmount is also signed (negative for savings).
  // If target is -5B and resolved is -2B, unresolved is -3B.
  // If target is -5B and resolved is -6B, unresolved is 0 (or surplus).
  const unresolvedAmount = targetAmount - resolvedAmount;

  // Context: Top 3 pieces
  const topPieces = [...(category.pieces || [])]
    .sort((a, b) => (b.amountEur || 0) - (a.amountEur || 0))
    .slice(0, 3);

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

  const lightenColor = (hex: string, amount = 0.25) => {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    const value = parseInt(hex.slice(1), 16);
    const base = (channel: number) => Math.round(channel + (255 - channel) * amount);
    const r = base((value >> 16) & 255);
    const g = base((value >> 8) & 255);
    const b = base(value & 255);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const headerColor = category.color || '#1d4ed8';
  const pillTint = lightenColor(headerColor, 0.82);
  const iconTint = lightenColor(headerColor, 0.9);
  const accentStyle = { '--panel-accent': headerColor } as CSSProperties;

  return (
    <>
      <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/60 shadow-xl bg-white/90 backdrop-blur-xl transition-all duration-300" style={accentStyle}>
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

        {/* Header Section - Compact */}
        <div className="relative px-4 py-3 border-b border-slate-100 shrink-0 bg-white/50 flex items-center gap-3">
          <button
            className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
            onClick={onClose}
          >
            <i className="material-icons text-xl">arrow_back</i>
          </button>
          <span
            className="flex items-center justify-center w-8 h-8 rounded-lg text-lg shadow-sm ring-1 ring-black/5 flex-shrink-0"
            aria-hidden="true"
            style={{ backgroundColor: iconTint, color: headerColor }}
          >
            {category.icon || '🏛️'}
          </span>
          <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
            <h2 className="text-base font-bold text-slate-800 truncate">{category.name}</h2>
            <div className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {formatCurrency(category.amount)} <span className="text-slate-300">•</span> {formatShare(category.share)}
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 custom-scrollbar">

          {category.id === 'M_DEBT' ? (
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                  <i className="material-icons text-xl text-amber-600">lock</i>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">Dépense Obligatoire</h3>
                  <p className="text-xs leading-relaxed text-slate-700">
                    La charge de la dette (50+ Md€) correspond aux intérêts que l'État doit verser à ses créanciers.
                  </p>
                </div>
              </div>

              <div className="pl-[44px] space-y-2">
                <p className="text-xs leading-relaxed text-slate-600">
                  <strong className="font-semibold text-slate-800">Pourquoi ne peut-on pas la baisser ?</strong><br />
                  Décider unilatéralement de ne pas payer ces intérêts reviendrait à faire <span className="font-bold text-amber-700">défaut</span> sur la dette de la France. Cela couperait immédiatement l'État des marchés financiers et l'empêcherait de financer ses services publics (hôpitaux, écoles...).
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-amber-700 italic">
                  <i className="material-icons text-[14px]">trending_down</i>
                  <span>Seul un désendettement à long terme permet de la réduire.</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Unified Simulator Card */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 shadow-sm space-y-3">

                {/* Row 1: Label + Toggles */}
                {/* Row 1: Label + Scale Selector */}
                <div className="flex items-center justify-between h-6">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <i className="material-icons text-xs">tune</i> Objectif
                    </label>
                    <div className={`text-sm font-bold ${targetPercent === 0 ? 'text-slate-300' : (targetPercent > 0 ? 'text-rose-500' : 'text-emerald-500')}`}>
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
                <div className="flex items-center gap-2" id="mission-target-slider">
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
                      {/* Fill */}
                      <div
                        className={`absolute h-full ${targetPercent > 0 ? 'bg-rose-400' : 'bg-emerald-400'} transition-all`}
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
                        <span className={`text-sm font-bold ${targetAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
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

              {/* Reforms List - Compact */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Réformes ({suggestedLevers.length})</div>
                <div className="space-y-1.5">
                  {suggestedLevers.map((reform) => (
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

              {/* Popular Reforms - Pills */}
              {popularIntents.some(intent => intent.massId === category.id) && (
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Populaire</div>
                  <div className="flex flex-wrap gap-1.5">
                    {popularIntents
                      .filter(intent => intent.massId === category.id)
                      .map((intent) => (
                        <button
                          key={intent.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 shadow-sm ring-1 ring-black/5"
                          style={{ backgroundColor: pillTint, color: headerColor }}
                          onClick={() => onIntentClick(intent)}
                        >
                          <span className="text-xs">{intent.emoji}</span>
                          <span>{intent.label}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Detail Drawer */}
      <ReformDetailDrawer
        reform={viewingReform}
        onClose={() => setViewingReform(null)}
        onToggle={onLeverToggle}
        isSelected={viewingReform ? isLeverSelected(viewingReform.id) : false}
        side="left" // Usually left panel is on left
      />
    </>
  );
}
