import { ShareButtons } from '@/components/ShareButtons';
import type { DslAction, PolicyLever } from '../types';
import { useMemo } from 'react';

interface FloatingShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyLink: () => void;
  deficit: number | null;
  deficitRatio: number | null;
  deficitDelta: number;
  baselineTotals: { spending: number; revenue: number };
  currentTotals: { spending: number; revenue: number };
  baselineMasses?: Map<string, { name: string; amount: number }>;
  piecesById?: Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>;
  actions: DslAction[];
  policyLevers: PolicyLever[];
  year: number;
  shareUrl: string | null;
}

const formatCurrencyShort = (amount: number) => {
  const abs = Math.abs(amount) / 1e9;
  return `${amount < 0 ? '-' : ''}${abs.toFixed(1)} Md€`;
};

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

export function FloatingShareCard({
  isOpen,
  onClose,
  onCopyLink,
  deficit,
  deficitRatio,
  deficitDelta,
  actions,
  policyLevers,
  piecesById,
  year,
  shareUrl,
}: FloatingShareCardProps) {
  if (!isOpen) return null;

  const hasDeficit = Number.isFinite(deficit);
  const safeDeficit = hasDeficit ? (deficit as number) : 0;
  const ratio = Number.isFinite(deficitRatio) ? (deficitRatio as number) : null;

  // Logic for colors
  const deficitColor = safeDeficit < -3 ? 'text-rose-600' : 'text-emerald-600';
  const shareText = "J'ai voté mon budget citoyen sur Citizen Budget Lab. À vous de jouer !";

  // Robustly extract top reforms for display
  const topReforms = useMemo(() => {
    const leverMap = new Map(policyLevers.map(l => [l.id, l]));
    const items: Array<{ id: string; label: string }> = [];

    for (const action of actions) {
      // 1. Try direct match with PolicyLever
      if (action.id && leverMap.has(action.id)) {
        const l = leverMap.get(action.id)!;
        items.push({ id: l.id, label: l.label });
        continue;
      }
      // 2. Try parsing target piece
      if (action.target?.startsWith('piece.')) {
        const id = action.target.replace('piece.', '');
        // Try matching lever again by ID
        if (leverMap.has(id)) {
          const l = leverMap.get(id)!;
          items.push({ id: l.id, label: l.label });
          continue;
        }
        // Fallback to piece label
        if (piecesById?.has(id)) {
          const p = piecesById.get(id)!;
          items.push({ id, label: p.label });
        }
      }
    }

    // Deduplicate by ID and slice
    const unique = new Map<string, { id: string; label: string }>();
    items.forEach(i => unique.set(i.id, i));
    return Array.from(unique.values()).slice(0, 5);
  }, [actions, policyLevers, piecesById]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-['Outfit']">
      {/* Backboard Blur */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Main Card (Compact) */}
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">

        {/* Header */}
        <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white">
              <span className="material-icons text-xs">how_to_vote</span>
            </div>
            <h2 className="text-white font-bold text-lg tracking-tight">Budget {year} Validé</h2>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1 w-7 h-7 flex items-center justify-center"
          >
            <span className="material-icons text-base">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Main Key Figures - Compact Grid */}
          <div className="flex items-stretch gap-4">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Solde Public</span>
              <span className={`text-2xl font-black tracking-tight ${deficitColor}`}>
                {hasDeficit ? `${safeDeficit > 0 ? '+' : ''}${formatCurrencyShort(safeDeficit)}` : '—'}
              </span>
            </div>
            <div className="w-px bg-slate-100"></div>
            <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Déficit / PIB</span>
              <span className="text-xl font-bold text-slate-700">
                {ratio !== null ? formatPercent(ratio) : '—'}
              </span>
            </div>
          </div>

          {/* Reform List - Simplified */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px flex-1 bg-slate-200"></span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Vos Choix Clés</span>
              <span className="h-px flex-1 bg-slate-200"></span>
            </div>

            {topReforms.length > 0 ? (
              <ul className="space-y-2">
                {topReforms.map(reform => (
                  <li key={reform.id} className="flex items-start gap-2.5 text-sm text-slate-700 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <span className="material-icons text-[16px] text-emerald-500 mt-0.5 shrink-0">check_circle</span>
                    <span className="leading-snug font-medium line-clamp-2">{reform.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <p className="text-xs text-slate-400 italic">Aucune mesure spécifique activée.</p>
              </div>
            )}
          </div>

          {/* Share Actions */}
          <div className="pt-2">
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50 text-center">
              <p className="text-xs font-medium text-indigo-800 mb-3">
                Participez au débat national en partageant votre scénario.
              </p>
              <div className="flex justify-center scale-95 origin-top">
                <ShareButtons shareUrl={shareUrl} message={shareText} onCopy={onCopyLink} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
