import type { CSSProperties, ChangeEvent } from 'react';
import type { LegoPiece, PolicyLever, PopularIntent, DslAction } from '../types';

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
};

export function RevenueCategoryPanel({
  category,
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
}: RevenueCategoryPanelProps) {
  const percentStep = 0.5;
  const defaultRange = 10;
  const expandedRange = 25;
  const isExpanded = targetRangeMax > defaultRange;
  const percentLabel = `${targetPercent > 0 ? '+' : targetPercent < 0 ? '' : ''}${targetPercent.toFixed(1)}%`;
  const rawAmount = (category.amountEur || 0) * targetPercent / 100;
  const amountLabel = `${rawAmount > 0 ? '+' : ''}${formatCurrency(rawAmount)}`;
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
    if (!lever.massMapping) return true;
    const share = lever.massMapping[category.id];
    return typeof share === 'number' && share > 0;
  });

  const relevantIntents = popularIntents.filter((intent) => {
    const actions = intent.seed?.actions as DslAction[] | undefined;
    return actions?.some((action) => action.target === `piece.${category.id}`) ?? false;
  });

  return (
    <>
      <button
        className="mb-4 px-4 py-2 text-sm font-medium text-gray-600 bg-white/40 hover:bg-white/70 backdrop-blur-md rounded-xl transition-all shadow-sm hover:shadow-md border border-white/30 flex items-center gap-2 group"
        onClick={onBack}
      >
        <i className="material-icons text-sm transition-transform group-hover:-translate-x-1" aria-hidden="true">arrow_back</i>
        Back
      </button>

      <div className="relative overflow-hidden rounded-3xl border border-white/40 shadow-2xl bg-white/60 backdrop-blur-2xl transition-all duration-300" style={accentStyle}>
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

        {/* Header Section */}
        <div className="relative p-6 border-b border-gray-100/50">
          <div className="flex items-start gap-4">
            <span
              className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl shadow-inner"
              aria-hidden="true"
              style={{ backgroundColor: iconTint, color: accentColor }}
            >
              {visual?.icon || '💶'}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">{category.label}</h2>
              <div className="mt-1 text-sm font-medium text-gray-500">
                {formatCurrency(category.amountEur || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="relative p-6 space-y-6">

          {/* Target Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Revenue Target</label>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                onClick={handleRangeToggle}
              >
                {rangeLabel}
              </button>
            </div>

            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 shadow-inner">
              <div className="flex items-center gap-4 mb-4">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleNudge(-1)}
                  disabled={atMin}
                  aria-label="Decrease target"
                >
                  <i className="material-icons text-sm">remove</i>
                </button>

                <div className="flex-1 relative h-10 flex items-center">
                  <input
                    type="range"
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    min={-targetRangeMax}
                    max={targetRangeMax}
                    step={percentStep}
                    value={targetPercent}
                    onChange={handleSliderChange}
                    aria-label="Target percentage"
                  />
                </div>

                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleNudge(1)}
                  disabled={atMax}
                  aria-label="Increase target"
                >
                  <i className="material-icons text-sm">add</i>
                </button>
              </div>

              <div className="flex items-baseline justify-between" aria-live="polite">
                <div className={`text-2xl font-mono font-bold ${targetPercent > 0 ? 'text-green-600' : targetPercent < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {percentLabel}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {amountLabel}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
                onClick={onApplyTarget}
              >
                Apply Target
              </button>
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                onClick={handleClear}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Reforms Section */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Available Measures</div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {(filteredLevers.length ? filteredLevers : suggestedLevers).map((reform) => (
                <div
                  key={reform.id}
                  className={`group relative p-3 rounded-xl border transition-all duration-200 ${isLeverSelected(reform.id)
                    ? 'bg-blue-50/80 border-blue-200 shadow-sm'
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

                  <div className="mt-3 flex justify-end">
                    <button
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isLeverSelected(reform.id)
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
          {relevantIntents.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Popular Scenarios</div>
              <div className="flex flex-wrap gap-2">
                {relevantIntents.map((intent) => (
                  <button
                    key={intent.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: pillTint, color: accentColor }}
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
