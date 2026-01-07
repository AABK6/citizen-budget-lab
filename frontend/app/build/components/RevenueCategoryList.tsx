import type { CSSProperties } from 'react';
import type { LegoPiece, RevenueFamily } from '../types';

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
  onSelect: (family: RevenueFamily) => void;
  formatCurrency: (amount: number) => string;
  visuals: RevenueVisualMap;
  families: RevenueFamily[];
};

export function RevenueCategoryList({ categories, onSelect, formatCurrency, visuals, families = [] }: RevenueCategoryListProps) {
  // Group by family
  const grouped = categories.reduce((acc, piece) => {
    const fid = piece.familyId || 'REV_OTHER';
    if (!acc[fid]) acc[fid] = [];
    acc[fid].push(piece);
    return acc;
  }, {} as Record<string, LegoPiece[]>);

  // Order families according to families definition order
  const sortedFamilyIds = families.map(f => f.id).filter(id => grouped[id]);
  // Add any ids found in pieces but not in definition (fallback)
  Object.keys(grouped).forEach(fid => {
    if (!sortedFamilyIds.includes(fid)) sortedFamilyIds.push(fid);
  });

  return (
    <div className="space-y-3 p-1">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-2">Familles de Recettes</div>
      
      {sortedFamilyIds.map(fid => {
        const familyDef = families.find(f => f.id === fid);
        // Fallback definition for unknown families
        const family: RevenueFamily = familyDef || {
          id: fid,
          displayLabel: fid === 'REV_OTHER' ? 'Autres recettes' : fid,
          color: '#64748b',
          icon: '📦',
          vigilancePoints: []
        };
        
        const pieces = grouped[fid] || [];
        const totalAmount = pieces.reduce((sum, p) => sum + (p.amountEur || 0), 0);
        
        const visual = { 
          color: family.color || '#0ea5e9', 
          icon: family.icon || '💶' 
        };
        const tint = tintBackground(visual.color, 0.12);
        
        return (
          <div
            key={fid}
            className="group relative bg-white hover:bg-white/90 border border-transparent hover:border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            onClick={() => onSelect(family)}
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
                <div className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{family.displayLabel}</div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <span>{formatCurrency(totalAmount)}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded-full">{pieces.length} source{pieces.length > 1 ? 's' : ''}</span>
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
