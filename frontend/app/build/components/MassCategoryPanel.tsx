import type { PolicyLever, PopularIntent, MassCategory } from '../types';
import type { CSSProperties, ChangeEvent } from 'react';

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
      <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/40 shadow-2xl bg-white/60 backdrop-blur-2xl transition-all duration-300" style={accentStyle}>
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

        {/* Header Section */}
        <div className="relative p-4 border-b border-gray-100/50 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-black/5 rounded-lg transition-colors"
              onClick={onClose}
            >
              <i className="material-icons text-xl">arrow_back</i>
            </button>
            <span
              className="flex items-center justify-center w-10 h-10 rounded-xl text-xl shadow-inner"
              aria-hidden="true"
              style={{ backgroundColor: iconTint, color: headerColor }}
            >
              {category.icon || '🏛️'}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate leading-tight">{category.name}</h2>
              <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                <span>{formatCurrency(category.amount)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{formatShare(category.share)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section - Scrollable Area */}
        <div className="relative flex-1 overflow-y-auto p-4 space-y-6 min-h-0">

          {/* The Equation: Target vs Reforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Budget Target</label>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                onClick={handleRangeToggle}
              >
                {rangeLabel}
              </button>
            </div>

            {/* Slider Control */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleNudge(-1)}
                disabled={atMin}
              >
                <i className="material-icons text-sm">remove</i>
              </button>
              <div className="flex-1 relative h-8 flex items-center">
                <input
                  type="range"
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  min={-targetRangeMax}
                  max={targetRangeMax}
                  step={percentStep}
                  value={targetPercent}
                  onChange={handleSliderChange}
                />
              </div>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleNudge(1)}
                disabled={atMax}
              >
                <i className="material-icons text-sm">add</i>
              </button>
            </div>

            {/* The Gap Visualization */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 shadow-inner space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-xs font-medium text-gray-600">Total Effort</div>
                <div className={`text-lg font-mono font-bold ${targetAmount > 0 ? 'text-red-600' : targetAmount < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formatCurrency(targetAmount)}
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex relative">
                {/* Resolved Part */}
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.abs(resolvedAmount / (targetAmount || 1)) * 100)}%` }}
                />
                {/* Unresolved Part (Hatched) */}
                <div
                  className="h-full bg-gray-300 transition-all duration-500 relative"
                  style={{
                    width: `${Math.max(0, Math.min(100, Math.abs(unresolvedAmount / (targetAmount || 1)) * 100))}%`,
                    backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)',
                    backgroundSize: '8px 8px'
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-600">Resolved: <b>{formatCurrency(resolvedAmount)}</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-300" style={{ backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }} />
                  <span className="text-gray-600">Unresolved: <b>{formatCurrency(unresolvedAmount)}</b></span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
                onClick={onApplyTarget}
              >
                Apply Target
              </button>
              <button
                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                onClick={handleClear}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Reforms Section */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Available Reforms</div>
            <div className="space-y-2">
              {suggestedLevers.map((reform) => (
                <div
                  key={reform.id}
                  className={`group relative p-3 rounded-xl border transition-all duration-200 ${isLeverSelected(reform.id)
                    ? 'bg-green-50/80 border-green-200 shadow-sm'
                    : 'bg-white/60 border-gray-100 hover:border-gray-200 hover:bg-white/80'
                    }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{reform.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{reform.description}</div>
                    </div>
                    <div className={`text-xs font-mono font-bold whitespace-nowrap ${reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {formatCurrency(reform.fixedImpactEur || 0)}
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <button
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${isLeverSelected(reform.id)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 group-hover:bg-white group-hover:shadow-sm'
                        }`}
                      onClick={() => onLeverToggle(reform)}
                    >
                      {isLeverSelected(reform.id) ? 'Remove' : 'Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Reforms */}
          {popularIntents.some(intent => intent.massId === category.id) && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Popular Choices</div>
              <div className="flex flex-wrap gap-2">
                {popularIntents
                  .filter(intent => intent.massId === category.id)
                  .map((intent) => (
                    <button
                      key={intent.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: pillTint, color: headerColor }}
                      onClick={() => onIntentClick(intent)}
                    >
                      <span>{intent.emoji}</span>
                      <span>{intent.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
