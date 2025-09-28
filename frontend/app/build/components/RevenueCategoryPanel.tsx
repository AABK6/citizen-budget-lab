import type { CSSProperties } from 'react';
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
  targetInput: string;
  onTargetChange: (value: string) => void;
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
  targetInput,
  onTargetChange,
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
      <button className="fr-btn fr-btn--secondary fr-btn--sm mass-panel__back" onClick={onBack}>Back</button>
      <div className="mission-panel" style={accentStyle}>
        <div className="mission-panel-header">
          <span className="mission-panel-icon" aria-hidden="true" style={{ backgroundColor: iconTint, color: accentColor }}>
            {visual?.icon || '💶'}
          </span>
          <div className="mission-panel-copy">
            <div className="mission-panel-title">{category.label}</div>
            <div className="mission-panel-subtitle">{formatCurrency(category.amountEur || 0)}</div>
          </div>
        </div>
        <div className="selected-category">
          <div className="category-header">
            <div className="category-name">{category.label}</div>
            <div className="category-amount">{formatCurrency(category.amountEur || 0)}</div>
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
            <div className="section-title">Available Measures</div>
            {(filteredLevers.length ? filteredLevers : suggestedLevers).map((reform) => (
              <div key={reform.id} className={`reform-item ${isLeverSelected(reform.id) ? 'applied' : ''}`}>
                <div className="reform-details">
                  <div className="reform-name">{reform.label}</div>
                  <div className="reform-description">{reform.description}</div>
                </div>
                <div className="reform-actions">
                  <div className="reform-impact">
                    <span className={
                      reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'impact-positive' : 'impact-negative'
                    }>
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
          {relevantIntents.length > 0 && (
            <div className="popular-reforms">
              <div className="section-title">Popular Scenarios</div>
              {relevantIntents.map((intent) => (
                <div
                  key={intent.id}
                  className="reform-pill"
                  style={{ backgroundColor: pillTint, color: accentColor }}
                  onClick={() => onIntentClick(intent)}
                >
                  {intent.emoji} {intent.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
