import { ScenarioDashboard } from './ScenarioDashboard';
import type { DslAction, PolicyLever } from '../types';

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
  baselineTotals,
  currentTotals,
  baselineMasses,
  piecesById,
  actions,
  policyLevers,
  year,
  shareUrl,
}: FloatingShareCardProps) {
  if (!isOpen) return null;

  const hasDeficit = Number.isFinite(deficit);
  const safeDeficit = hasDeficit ? (deficit as number) : 0;
  const ratio = Number.isFinite(deficitRatio) ? (deficitRatio as number) : null;
  const deficitTone = safeDeficit < 0 ? 'text-rose-600' : 'text-emerald-600';
  const shareDisabled = !shareUrl;
  const shareText = "J'ai voté mon budget citoyen. Plus nous serons nombreux, plus cette consultation pèsera.";
  const sharePayload = shareUrl ? `${shareText} ${shareUrl}` : shareText;
  const encodedPayload = encodeURIComponent(sharePayload);
  const encodedUrl = shareUrl ? encodeURIComponent(shareUrl) : '';
  const shareClasses = `px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
    shareDisabled
      ? 'border-slate-200 text-slate-400 bg-slate-100 pointer-events-none'
      : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
  }`;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[120] pointer-events-none sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:w-[460px]">
      <div className="relative w-full rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-md p-5 pointer-events-auto font-['Outfit'] animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-icons text-lg">how_to_vote</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Session citoyenne
              </span>
              <span className="text-lg font-black text-slate-900">Votre budget {year}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fermer le récapitulatif"
          >
            <span className="material-icons text-base">close</span>
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Solde public
          </span>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-extrabold tracking-tight ${deficitTone}`}>
              {hasDeficit ? `${safeDeficit > 0 ? '+' : ''}${formatCurrencyShort(safeDeficit)}` : '—'}
            </span>
            {ratio !== null && (
              <span className="text-sm font-semibold text-slate-500">
                {formatPercent(ratio)} du PIB
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <ScenarioDashboard
            baselineTotals={baselineTotals}
            currentTotals={currentTotals}
            deficitDelta={deficitDelta}
            baselineMasses={baselineMasses}
            piecesById={piecesById}
            actions={actions}
            policyLevers={policyLevers}
          />
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            Plus nous serons nombreux à voter, plus cette consultation pèsera dans le débat public.
            Invitez 2-3 personnes à tester la simulation.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={shareUrl ? `https://x.com/intent/tweet?text=${encodedPayload}` : '#'}
              target="_blank"
              rel="noreferrer"
              className={shareClasses}
              aria-disabled={shareDisabled}
            >
              Partager sur X
            </a>
            <a
              href={shareUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` : '#'}
              target="_blank"
              rel="noreferrer"
              className={shareClasses}
              aria-disabled={shareDisabled}
            >
              LinkedIn
            </a>
            <a
              href={shareUrl ? `https://wa.me/?text=${encodedPayload}` : '#'}
              target="_blank"
              rel="noreferrer"
              className={shareClasses}
              aria-disabled={shareDisabled}
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={onCopyLink}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                shareDisabled
                  ? 'border-slate-200 text-slate-400 bg-slate-100'
                  : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
              }`}
              disabled={shareDisabled}
            >
              Copier le lien
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="material-icons text-xs">lock</span>
            Comparaison collective débloquée à 10&nbsp;000 votes.
          </div>
        </div>
      </div>
    </div>
  );
}
