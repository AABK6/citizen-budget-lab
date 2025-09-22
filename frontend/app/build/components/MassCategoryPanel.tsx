import type { PolicyLever, PopularIntent, MassCategory } from '../types';

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
}: MassCategoryPanelProps) {
  return (
    <>
      <button className="fr-btn fr-btn--secondary fr-btn--sm" onClick={onClose} style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>Back</button>
      <div className="panel-header">{category.name} Reforms &amp; Targets</div>
      <div className="selected-category">
        <div className="category-header">
          <div className="category-name">{category.name}</div>
          <div className="category-amount">{formatCurrency(category.amount)}</div>
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
              <div key={intent.id} className="reform-pill" onClick={() => onIntentClick(intent)}>
                {intent.emoji} {intent.label}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
