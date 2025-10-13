import type { CSSProperties } from 'react';
import { useI18n } from '@/lib/i18n';
import type { LegoPiece } from '../types';

const tintBackground = (hex: string, alpha = 0.18) => {
  if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
    return 'rgba(14, 165, 233, 0.14)';
  }
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export type RevenueVisualMap = Map<string, { color: string; icon: string }>; 

export type RevenueCategoryListProps = {
  categories: LegoPiece[];
  onSelect: (category: LegoPiece) => void;
  formatCurrency: (amount: number) => string;
  visuals: RevenueVisualMap;
};

export function RevenueCategoryList({ categories, onSelect, formatCurrency, visuals }: RevenueCategoryListProps) {
  const { t } = useI18n();
  return (
    <>
      <div className="panel-header">{t('build.revenues_panel_header')}</div>
      {categories.map((piece, index) => {
        const visual = visuals.get(piece.id) || { color: '#0ea5e9', icon: '💶' };
        const tint = tintBackground(visual.color, 0.16);
        return (
          <div
            key={piece.id ?? index}
            className="mission-card revenue-card"
            onClick={() => onSelect(piece)}
            style={{ '--card-accent': visual.color } as CSSProperties}
          >
            <div className="mission-card__body">
              <div className="mission-card__identity">
                <span className="mission-card__icon" aria-hidden="true" style={{ backgroundColor: tint, color: visual.color }}>
                  {visual.icon}
                </span>
                <div className="mission-card__titles">
                  <div className="mission-card__title">{piece.label}</div>
                  <div className="mission-card__metric">{formatCurrency(piece.amountEur || 0)}</div>
                </div>
              </div>
              <i className="material-icons mission-card__chevron" aria-hidden="true">chevron_right</i>
            </div>
            <div className="mission-card__footer">
              <span className="mission-card__action">{t('build.adjust_rate')}</span>
              <span className="mission-card__action">{t('build.view_reforms')}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
