import type { CSSProperties } from 'react';
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
  return (
    <div className="space-y-3 p-1">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-2">Sources de recettes &amp; réformes</div>
      {categories.map((piece, index) => {
        const visual = visuals.get(piece.id) || { color: '#0ea5e9', icon: '💶' };
        const tint = tintBackground(visual.color, 0.12);
        return (
          <div
            key={piece.id ?? index}
            className="group relative bg-white hover:bg-white/90 border border-transparent hover:border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            onClick={() => onSelect(piece)}
            style={{ '--card-accent': visual.color } as CSSProperties}
          >
            <div className="p-4 flex items-center gap-4">
              <div className="relative">
                <span
                  className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl transition-transform group-hover:scale-110 duration-300"
                  aria-hidden="true"
                  style={{ backgroundColor: tint, color: visual.color }}
                >
                  {visual.icon}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{piece.label}</div>
                <div className="text-sm font-medium text-gray-500">
                  {formatCurrency(piece.amountEur || 0)}
                </div>
              </div>

              <i className="material-icons text-gray-300 group-hover:text-blue-400 transition-colors" aria-hidden="true">chevron_right</i>
            </div>

            {/* Hover Actions Hint */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
}
