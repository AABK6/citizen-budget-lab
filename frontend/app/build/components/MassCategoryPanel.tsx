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
  const rawAmount = (baselineAmount) * targetPercent / 100;
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
      <button className="fr-btn fr-btn--secondary fr-btn--sm mass-panel__back" onClick={onClose}>Back</button>
      <div className="mission-panel" style={accentStyle}>
        <div className="mission-panel-header">
          <span className="mission-panel-icon" aria-hidden="true" style={{ backgroundColor: iconTint, color: headerColor }}>
            {category.icon || '🏛️'}
          </span>
          <div className="mission-panel-copy">
            <div className="mission-panel-title">{category.name}</div>
            <div className="mission-panel-subtitle">
              {formatCurrency(category.amount)} · {formatShare(category.share)}
            </div>
          </div>
        </div>
        <div className="selected-category">
          <div className="category-header">
            <div className="category-name">{category.name}</div>
            <div className="category-amount">
              {displayMode === 'share' ? formatShare(category.share) : formatCurrency(category.amount)}
            </div>
          </div>
          <div className="target-controls">
            <div className="target-header">
              <span className="target-label">Target</span>
              <button type="button" className="target-range-toggle" onClick={handleRangeToggle}>
                {rangeLabel}
              </button>
            </div>
            <div className="target-track" role="group" aria-label="Adjust target">
              <button
                type="button"
                className="target-nudge"
                onClick={() => handleNudge(-1)}
                disabled={atMin}
                aria-label="Decrease target by 0.5 percentage point"
              >
                -
              </button>
              <input
                type="range"
                className="target-slider"
                min={-targetRangeMax}
                max={targetRangeMax}
                step={percentStep}
                value={targetPercent}
                onChange={handleSliderChange}
                aria-label="Target percentage"
              />
              <button
                type="button"
                className="target-nudge"
                onClick={() => handleNudge(1)}
                disabled={atMax}
                aria-label="Increase target by 0.5 percentage point"
              >
                +
              </button>
            </div>
            <div className="target-readout" aria-live="polite">
              <span className="target-value">{percentLabel}</span>
              <span className="target-separator">·</span>
              <span className="target-amount">{amountLabel}</span>
            </div>
            <div className="target-actions">
              <button className="target-button" onClick={onApplyTarget}>Apply</button>
              <button className="target-button target-button--ghost" onClick={handleClear}>Clear</button>
            </div>
          </div>
          <div className="reforms-section">
            <div className="section-title">Available Reforms</div>
            {suggestedLevers.map((reform) => (
              <div key={reform.id} className={`reform-item ${isLeverSelected(reform.id) ? 'applied' : ''}`}>
                <div className="reform-details">
                  <div className="reform-name">{reform.label}</div>
                  <div className="reform-description">{reform.description}</div>
                </div>
                <div className="reform-actions">
                  <div className="reform-impact">
                    <span className={reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'}>
                      {formatCurrency(reform.fixedImpactEur || 0)}
                    </span>
                  </div>
                  <button
                    className={`fr-btn fr-btn--${isLeverSelected(reform.id) ? 'secondary' : 'primary'}`}
                    onClick={() => onLeverToggle(reform)}
                  >
                    {isLeverSelected(reform.id) ? 'Remove' : 'Add'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="popular-reforms">
            <div className="section-title">Popular Reforms</div>
            {popularIntents
              .filter(intent => intent.massId === category.id)
              .map((intent) => (
                <div
                  key={intent.id}
                  className="reform-pill"
                  style={{ backgroundColor: pillTint, color: headerColor }}
                  onClick={() => onIntentClick(intent)}
                >
                  {intent.emoji} {intent.label}
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
