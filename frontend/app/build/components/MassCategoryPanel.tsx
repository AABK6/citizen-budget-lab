import type { PolicyLever, PopularIntent, MassCategory } from '../types';
import type { CSSProperties } from 'react';

export type MassCategoryPanelProps = {
  category: MassCategory;
  targetInput: string;
  onTargetChange: (value: string) => void;
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
  targetInput,
  onTargetChange,
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
      <button className="fr-btn fr-btn--secondary fr-btn--sm" onClick={onClose} style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>Back</button>
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
            <span className="target-label">Target:</span>
            <input
              type="text"
              className="target-input"
              value={targetInput}
              onChange={(e) => onTargetChange(e.target.value)}
              placeholder="+10B, -500M..."
            />
            <button className="target-button" onClick={onApplyTarget}>Apply</button>
            <button className="target-button fr-btn--secondary" onClick={onClearTarget}>Clear</button>
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
