import type { MassCategory } from '../types';

const tintBackground = (hex: string, alpha = 0.18) => {
  if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
    return 'rgba(37, 99, 235, 0.12)';
  }
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
        const tint = tintBackground(accent, 0.16);
        return (
        <div
          key={category.id ?? index}
          className="spending-category mission-card"
          onClick={() => onSelect(category)}
          style={{ borderColor: '#e5e7eb', borderLeftColor: accent }}
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
