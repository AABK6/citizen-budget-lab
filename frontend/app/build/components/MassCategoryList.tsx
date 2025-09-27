import type { MassCategory } from '../types';

export type MassCategoryListProps = {
  categories: MassCategory[];
  onSelect: (category: MassCategory) => void;
  formatCurrency: (amount: number) => string;
  formatShare: (value: number) => string;
  displayMode: 'amount' | 'share';
};

export function MassCategoryList({ categories, onSelect, formatCurrency, formatShare, displayMode }: MassCategoryListProps) {
  return (
    <>
      <div className="panel-header">Spending Targets &amp; Reforms</div>
      {categories.map((category, index) => {
        const accent = category.color || '#2563eb';
        const tint = accent.length === 7 ? `${accent}1A` : accent;
        return (
        <div
          key={category.id ?? index}
          className="spending-category mission-card"
          onClick={() => onSelect(category)}
          style={{ borderColor: category.color || '#2563eb' }}
        >
          <div className="mission-card-header">
            <div className="mission-identity">
              <span
                className="mission-icon"
                style={{ backgroundColor: category.color || '#2563eb' }}
                aria-hidden="true"
              >
                {category.icon || '🏛️'}
              </span>
              <div className="mission-titles">
                <div className="category-name">{category.name}</div>
                <div className="category-amount">
                  {displayMode === 'share' ? formatShare(category.share) : formatCurrency(category.amount)}
                </div>
              </div>
            </div>
            <i className="material-icons mission-chevron" aria-hidden="true">chevron_right</i>
          </div>
          <div className="category-controls">
            <div className="control-button" style={{ backgroundColor: tint, color: accent }}>Set target</div>
            <div className="control-button" style={{ backgroundColor: tint, color: accent }}>View reforms</div>
          </div>
        </div>
      )})}
    </>
  );
}
