import type { ChangeEvent, CSSProperties } from 'react';
import { useState } from 'react';
import type { LegoPiece, PolicyLever, RevenueFamily } from '../types';
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

export type RevenueFamilyPanelProps = {
  family: RevenueFamily;
  pieces: LegoPiece[];
  levers: PolicyLever[]; // Concrete measures relevant to this family
  targetPercent: number;
  targetRangeMax: number;
  onTargetPercentChange: (value: number) => void;
  onRangeChange: (nextMax: number) => void;
  onApplyTarget: () => void; // Now opens the confirmation modal
  onClearTarget: () => void;
  onBack: () => void;
  onLeverToggle: (lever: PolicyLever) => void;
  isLeverSelected: (leverId: string) => boolean;
  formatCurrency: (value: number) => string;
  formatShare: (value: number) => string;
};

export function RevenueFamilyPanel({
  family,
  pieces,
  levers,
  targetPercent,
  targetRangeMax,
  onTargetPercentChange,
  onRangeChange,
  onApplyTarget,
  onClearTarget,
  onBack,
  onLeverToggle,
  isLeverSelected,
  formatCurrency,
  formatShare,
}: RevenueFamilyPanelProps) {
  const [viewingReform, setViewingReform] = useState<PolicyLever | null>(null);
  
  const percentStep = 0.5;
  const defaultRange = 10;
  const expandedRange = 25;
  const isExpanded = targetRangeMax > defaultRange;
  
  // Aggregate data
  const totalAmount = pieces.reduce((sum, p) => sum + (p.amountEur || 0), 0);
  const targetAmount = totalAmount * targetPercent / 100;
  const atMin = targetPercent <= -targetRangeMax + 1e-9;
  const atMax = targetPercent >= targetRangeMax - 1e-9;

  const accentColor = family.color || '#0ea5e9';
  const iconTint = lightenColor(accentColor, 0.88);
  const accentStyle = { '--panel-accent': accentColor } as CSSProperties;

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const val = Number(event.target.value);
    const rounded = Math.round(val / percentStep) * percentStep;
    onTargetPercentChange(rounded);
  };

  const handleNudge = (direction: -1 | 1) => {
    onTargetPercentChange(targetPercent + direction * percentStep);
  };

  const handleClear = () => {
    onTargetPercentChange(0);
    onClearTarget();
  };

  return (
    <>
      <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/60 shadow-xl bg-white/90 backdrop-blur-xl transition-all duration-300" style={accentStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

        {/* Header */}
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
              {family.icon || '💶'}
            </span>
            <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
              <h2 className="text-base font-bold text-slate-800 truncate">{family.displayLabel}</h2>
              <div className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0 custom-scrollbar">
          
          {/* 1. Compact Breakdown (As requested: just under title, before slider) */}
          <div className="flex flex-wrap gap-1.5">
            {pieces.map((p) => (
              <div key={p.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-100 text-[10px] text-slate-600 shadow-sm">
                <span className="font-semibold">{p.label}</span>
                <span className="text-slate-400 border-l border-slate-200 pl-1.5 ml-0.5 shrink-0">{formatCurrency(p.amountEur || 0)}</span>
              </div>
            ))}
          </div>

          {/* 2. Slider Card */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between h-6">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <i className="material-icons text-xs">tune</i> Objectif Famille
                </label>
                <div className={`text-sm font-bold ${targetPercent === 0 ? 'text-slate-300' : (targetPercent > 0 ? 'text-emerald-500' : 'text-rose-500')}`}>
                  {targetPercent > 0 ? '+' : ''}{targetPercent.toFixed(1)}%
                </div>
              </div>
              <div className="flex bg-slate-200/50 p-0.5 rounded-md">
                <button type="button" onClick={() => onRangeChange(defaultRange)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${!isExpanded ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>±10%</button>
                <button type="button" onClick={() => onRangeChange(expandedRange)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${isExpanded ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>±25%</button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-400 disabled:opacity-30" onClick={() => handleNudge(-1)} disabled={atMin}><i className="material-icons text-xs">remove</i></button>
              <div className="flex-1 relative h-7 sm:h-6 flex items-center">
                <div className="absolute left-0 right-0 h-1.5 sm:h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 -translate-x-1/2" />
                  <div className={`absolute h-full ${targetPercent > 0 ? 'bg-emerald-400' : 'bg-rose-400'} transition-all`} style={{ left: targetPercent < 0 ? `${50 + (targetPercent / targetRangeMax) * 50}%` : '50%', right: targetPercent > 0 ? `${50 - (targetPercent / targetRangeMax) * 50}%` : '50%' }} />
                </div>
                <input type="range" className="relative w-full h-7 sm:h-6 bg-transparent appearance-none cursor-pointer focus:outline-none z-10" min={-targetRangeMax} max={targetRangeMax} step={percentStep} value={targetPercent} onChange={handleSliderChange} />
              </div>
              <button type="button" className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-400 disabled:opacity-30" onClick={() => handleNudge(1)} disabled={atMax}><i className="material-icons text-xs">add</i></button>
            </div>

            {targetAmount !== 0 && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between items-end mb-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">Impact global</span>
                    <span className={`text-sm font-bold ${targetAmount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {targetAmount > 0 ? '+' : ''}{formatCurrency(targetAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button className="flex-1 h-10 sm:h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all" onClick={onApplyTarget}>Appliquer</button>
              <button className="h-10 sm:h-8 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-colors border border-transparent" onClick={handleClear}>Reset</button>
            </div>
          </div>

          {/* 3. Concrete Measures (Reforms) */}
          {levers.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Mesures concrètes ({levers.length})</div>
              <div className="space-y-1.5">
                {levers.map((reform) => (
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
          )}
        </div>
      </div>

      {/* Detail Drawer for Concrete Measures */}
      <ReformDetailDrawer
        reform={viewingReform}
        onClose={() => setViewingReform(null)}
        onToggle={onLeverToggle}
        isSelected={viewingReform ? isLeverSelected(viewingReform.id) : false}
        side="right"
      />
    </>
  );
}