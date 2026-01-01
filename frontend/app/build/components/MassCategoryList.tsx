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
    <div className="space-y-3 p-1">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-2">Objectifs de dépenses &amp; réformes</div>
      {categories.map((category, index) => {
        const accent = category.color || '#2563eb';
        const tint = tintBackground(accent, 0.12);
        return (
          <div
            key={category.id ?? index}
            className="group relative bg-white hover:bg-white/90 border border-transparent hover:border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            onClick={() => onSelect(category)}
            style={{ '--card-accent': accent } as CSSProperties}
          >
            <div className="p-4 flex items-center gap-4">
              <div className="relative">
                <span
                  className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl transition-transform group-hover:scale-110 duration-300"
                  aria-hidden="true"
                  style={{ backgroundColor: tint, color: accent }}
                >
                  {category.icon || '🏛️'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{category.name}</div>
                <div className="text-sm font-medium text-gray-500">
                  {displayMode === 'share' ? formatShare(category.share) : formatCurrency(category.amount)}
                </div>
              </div>

              <i className="material-icons text-gray-300 group-hover:text-blue-400 transition-colors" aria-hidden="true">chevron_right</i>
            </div>

            {/* Hover Actions Hint */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )
      })}
    </div>
  );
}
