import type { CSSProperties } from 'react';
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
          className="mission-card"
          onClick={() => onSelect(category)}
          style={{ '--card-accent': accent } as CSSProperties}
        >
          <div className="mission-card__body">
            <div className="mission-card__identity">
              <span className="mission-card__icon" aria-hidden="true" style={{ backgroundColor: tint, color: accent }}>
                {category.icon || '🏛️'}
              </span>
              <div className="mission-card__titles">
                <div className="mission-card__title">{category.name}</div>
                <div className="mission-card__metric">
                  {displayMode === 'share' ? formatShare(category.share) : formatCurrency(category.amount)}
                </div>
              </div>
            </div>
            <i className="material-icons mission-card__chevron" aria-hidden="true">chevron_right</i>
          </div>
          <div className="mission-card__footer">
            <span className="mission-card__action">Set target</span>
            <span className="mission-card__action">View reforms</span>
          </div>
        </div>
      )})}
    </>
  );
}
