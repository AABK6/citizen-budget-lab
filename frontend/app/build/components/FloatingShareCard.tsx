import { ScenarioDashboard } from './ScenarioDashboard';
import type { DslAction, PolicyLever } from '../types';

interface FloatingShareCardProps {
  isOpen: boolean;
  onClose: () => void;
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
}

const formatCurrencyShort = (amount: number) => {
  const abs = Math.abs(amount) / 1e9;
  return `${amount < 0 ? '-' : ''}${abs.toFixed(1)} Md€`;
};

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

export function FloatingShareCard({
  isOpen,
  onClose,
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
}: FloatingShareCardProps) {
  if (!isOpen) return null;

  const hasDeficit = Number.isFinite(deficit);
  const safeDeficit = hasDeficit ? (deficit as number) : 0;
  const ratio = Number.isFinite(deficitRatio) ? (deficitRatio as number) : null;
  const deficitTone = safeDeficit < 0 ? 'text-rose-600' : 'text-emerald-600';

  return (
    <div className="fixed inset-x-4 bottom-4 z-[120] flex justify-center pointer-events-none">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md p-4 pointer-events-auto font-['Outfit']">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Budget citoyen
            </span>
            <span className="text-lg font-black text-slate-900">Votre budget {year}</span>
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

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
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
      </div>
    </div>
  );
}
