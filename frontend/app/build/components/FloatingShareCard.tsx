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
  year,
  shareUrl,
}: FloatingShareCardProps) {
  if (!isOpen) return null;

  const hasDeficit = Number.isFinite(deficit);
  const safeDeficit = hasDeficit ? (deficit as number) : 0;
  const ratio = Number.isFinite(deficitRatio) ? (deficitRatio as number) : null;

  // Premium Gradient Logic for Deficit
  const isImproved = deficitDelta > 0; // Deficit reduction (mathematically usually +delta means improvement in balance if balance is negative? Wait, usually deficit is negative number. reducing deficit means making it closer to 0 or positive. So delta > 0 is good.)
  // Actually let's just use the value.
  const deficitColor = safeDeficit < -3 ? 'from-rose-400 to-orange-400' : 'from-emerald-400 to-teal-400';
  const shareText = "J'ai voté mon budget citoyen sur Citizen Budget Lab. À vous de jouer !";

  // Extract top reforms for display
  const topReforms = useMemo(() => {
    const leverMap = new Map(policyLevers.map(l => [l.id, l]));
    const activeReforms = actions
      .map(a => leverMap.get(a.id))
      .filter(l => l !== undefined) as PolicyLever[];

    // Sort by impact if possible, or just take first 3
    return activeReforms.slice(0, 3);
  }, [actions, policyLevers]);

  return (
    <div className="fixed inset-x-4 bottom-4 z-[120] pointer-events-none sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:w-[420px]">

      {/* GLOW EFFECT BEHIND */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none transform translate-y-10"></div>

      <div className="relative w-full rounded-[2rem] border border-slate-800 bg-[#0B1121]/95 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-6 pointer-events-auto font-['Outfit'] animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden ring-1 ring-white/10">

        {/* DECORATIVE TOP GRADIENT LINE */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 w-fit">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Session Clôturée</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Mon Budget {year}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="group p-2 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-transparent hover:border-slate-600"
            aria-label="Fermer"
          >
            <span className="material-icons text-lg group-hover:rotate-90 transition-transform">close</span>
          </button>
        </div>

        {/* MAIN STATS CARD */}
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-5 mb-5 group hover:border-indigo-500/30 transition-colors">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nouvelle Trajectoire</p>
              <div className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${deficitColor}`}>
                {hasDeficit ? `${safeDeficit > 0 ? '+' : ''}${formatCurrencyShort(safeDeficit)}` : '—'}
              </div>
            </div>
            {ratio !== null && (
              <div className="text-right pb-1">
                <div className="text-2xl font-bold text-slate-200">{formatPercent(ratio)}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">du PIB</div>
              </div>
            )}
          </div>

          {/* MICRO-CHART / SPARKLINE DECORATION */}
          <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-slate-600 w-1/3 opacity-30"></div>
            <div className={`h-full bg-gradient-to-r ${deficitColor} w-2/3 opacity-80`}></div>
          </div>
        </div>

        {/* TOP REFORMS LIST */}
        {topReforms.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Mesures Phares</p>
            {topReforms.map((reform) => (
              <div key={reform.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30 text-slate-300 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                <span className="font-medium truncate">{reform.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* CALL TO ACTION */}
        <div className="bg-indigo-600/10 rounded-xl p-4 border border-indigo-500/20 mb-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/20 blur-2xl rounded-full"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons text-indigo-400 text-sm">public</span>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Votre voix compte</span>
            </div>
            <p className="text-sm text-indigo-100/80 leading-snug">
              Pour peser dans le débat, nous visons <strong>10 000 participants</strong>. Invitez vos proches à relever le défi.
            </p>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="space-y-3">
          <ShareButtons shareUrl={shareUrl} message={shareText} onCopy={onCopyLink} />

          <div className="flex items-center justify-center gap-2 pt-2 opacity-50 hover:opacity-100 transition-opacity cursor-help">
            <span className="material-icons text-[10px] text-slate-500">lock</span>
            <span className="text-[10px] font-medium text-slate-500">Comparaison collective bientôt disponible</span>
          </div>
        </div>

      </div>
    </div>
  );
}
