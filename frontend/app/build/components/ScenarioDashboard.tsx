import { useMemo } from 'react';
import type { DslAction, PolicyLever } from '../types';

interface ScenarioDashboardProps {
  baselineTotals: { spending: number; revenue: number };
  currentTotals: { spending: number; revenue: number };
  deficitDelta: number;
  baselineMasses?: Map<string, { name: string; amount: number }>;
  piecesById?: Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>;
  actions: DslAction[];
  policyLevers: PolicyLever[];
}

const revenueFamilies = new Set(['TAXES', 'TAX_EXPENDITURES']);

const formatTotal = (value: number) => `${(Math.abs(value) / 1e9).toFixed(1)} Md€`;
const formatDelta = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${(Math.abs(value) / 1e9).toFixed(1)} Md€`;
};

const resolveBudgetSide = (lever: PolicyLever) =>
  lever.budgetSide ?? (revenueFamilies.has(lever.family) ? 'REVENUE' : 'SPENDING');

const resolveImpact = (action: DslAction, lever: PolicyLever) => {
  const leverImpact = Number(lever.fixedImpactEur ?? 0);
  if (Number.isFinite(leverImpact) && leverImpact !== 0) {
    return leverImpact;
  }
  const amount = Number(action.amount_eur ?? 0);
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }
  const side = resolveBudgetSide(lever);
  if (side === 'REVENUE') {
    return action.op === 'increase' ? amount : -amount;
  }
  if (side === 'SPENDING') {
    return action.op === 'increase' ? -amount : amount;
  }
  return action.op === 'increase' ? amount : -amount;
};

const resolveDelta = (action: DslAction) => {
  const amount = Number(action.amount_eur ?? 0);
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }
  if (action.op === 'increase') {
    return amount;
  }
  if (action.op === 'decrease') {
    return -amount;
  }
  return 0;
};

const formatOrientationLabel = (verb: string, percent: number | null, amount: number, label: string) => {
  if (Number.isFinite(percent)) {
    return `${verb} de ${percent!.toFixed(1)}% ${label}`;
  }
  return `${verb} ${formatTotal(amount)} ${label}`;
};

export function ScenarioDashboard({
  baselineTotals,
  currentTotals,
  deficitDelta,
  baselineMasses,
  piecesById,
  actions,
  policyLevers,
}: ScenarioDashboardProps) {
  const safeDeficitDelta = Number.isFinite(deficitDelta) ? deficitDelta : 0;
  const spendingDelta = currentTotals.spending - baselineTotals.spending;
  const revenueDelta = useMemo(() => {
    if (!actions?.length) return 0;
    const leverMap = new Map(policyLevers.map((lever) => [lever.id, lever]));
    let delta = 0;
    for (const action of actions) {
      const lever = leverMap.get(action.id);
      if (lever) {
        const side = resolveBudgetSide(lever);
        if (side === 'REVENUE' || side === 'BOTH') {
          delta += resolveImpact(action, lever);
        }
        continue;
      }
      if (!action.id?.startsWith('target_')) {
        continue;
      }
      const target = String(action.target || '');
      if (!target.startsWith('piece.')) {
        continue;
      }
      const pieceId = target.slice('piece.'.length);
      const piece = piecesById?.get(pieceId);
      if (piece?.type !== 'revenue') {
        continue;
      }
      delta += resolveDelta(action);
    }
    return delta;
  }, [actions, piecesById, policyLevers]);

  const levers = useMemo(() => {
    if (!actions?.length) return [];
    const leverMap = new Map(policyLevers.map((lever) => [lever.id, lever]));
    const seen = new Set<string>();
    const items: Array<{ id: string; label: string; fullLabel: string; impact: number }> = [];

    for (const action of actions) {
      const lever = leverMap.get(action.id);
      if (lever) {
        if (seen.has(lever.id)) continue;
        seen.add(lever.id);
        items.push({
          id: lever.id,
          label: lever.shortLabel || lever.label,
          fullLabel: lever.label,
          impact: resolveImpact(action, lever),
        });
        continue;
      }

      const target = String(action.target || '');
      const delta = resolveDelta(action);
      if (!delta) {
        continue;
      }
      const isOrientation = action.id?.startsWith('target_') || target.startsWith('mission.');
      if (!isOrientation) {
        continue;
      }

      if (target.startsWith('mission.')) {
        const massId = target.slice('mission.'.length).toUpperCase();
        const base = baselineMasses?.get(massId);
        const baseAmount = Math.abs(base?.amount ?? 0);
        const percent = baseAmount > 0 ? (Math.abs(delta) / baseAmount) * 100 : null;
        const name = base?.name ?? massId;
        const verb = delta >= 0 ? 'Augmenter' : 'Diminuer';
        const label = formatOrientationLabel(verb, percent, Math.abs(delta), name);
        const impact = -delta;
        const itemId = action.id || target;
        if (!seen.has(itemId)) {
          seen.add(itemId);
          items.push({ id: itemId, label, fullLabel: label, impact });
        }
        continue;
      }

      if (target.startsWith('piece.')) {
        const pieceId = target.slice('piece.'.length);
        const piece = piecesById?.get(pieceId);
        const baseAmount = Math.abs(piece?.amount ?? 0);
        const percent = baseAmount > 0 ? (Math.abs(delta) / baseAmount) * 100 : null;
        const name = piece?.label ?? pieceId;
        const verb = delta >= 0 ? 'Augmenter' : 'Diminuer';
        const label = formatOrientationLabel(verb, percent, Math.abs(delta), name);
        let impact = delta;
        if (piece?.type === 'expenditure') {
          impact = -delta;
        } else if (piece?.type === 'revenue') {
          impact = delta;
        }
        const itemId = action.id || target;
        if (!seen.has(itemId)) {
          seen.add(itemId);
          items.push({ id: itemId, label, fullLabel: label, impact });
        }
      }
    }

    return items.sort((a, b) => {
      const impactA = Math.abs(a.impact);
      const impactB = Math.abs(b.impact);
      if (impactA !== impactB) return impactB - impactA;
      return a.fullLabel.localeCompare(b.fullLabel, 'fr');
    });
  }, [actions, baselineMasses, piecesById, policyLevers]);

  const topLevers = levers.slice(0, 3);
  const extraLevers = Math.max(0, levers.length - topLevers.length);

  const spendingDeltaTone = spendingDelta > 0 ? 'text-rose-600' : spendingDelta < 0 ? 'text-emerald-600' : 'text-slate-500';
  const revenueDeltaTone = revenueDelta > 0 ? 'text-emerald-600' : revenueDelta < 0 ? 'text-rose-600' : 'text-slate-500';
  const balanceAbs = Math.abs(safeDeficitDelta);
  const trendLabel = safeDeficitDelta === 0
    ? 'déficit stable'
    : safeDeficitDelta > 0
      ? `déficit réduit de ${formatTotal(balanceAbs)}`
      : `déficit augmenté de ${formatTotal(balanceAbs)}`;
  const trendIcon = safeDeficitDelta >= 0 ? 'trending_up' : 'trending_down';
  const trendPill = safeDeficitDelta >= 0
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : 'bg-rose-50 border-rose-200 text-rose-700';

  return (
    <div className="w-full font-['Outfit']">
      <div className="flex flex-col lg:flex-row items-center bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-0.5 gap-3 lg:h-[64px] transition-all hover:shadow-md">

        {/* SECTION 1: TITLE & TREND */}
        <div className="flex flex-col items-start min-w-fit border-r border-slate-100 pr-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="material-icons text-[16px] text-slate-400">checklist</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">
              VOTRE BUDGET
            </span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${safeDeficitDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            <span className="material-icons text-[10px]">{safeDeficitDelta >= 0 ? 'trending_up' : 'trending_down'}</span>
            {trendLabel}
          </div>
        </div>

        {/* SECTION 2: KEY METRICS (SPENDING / REVENUE) */}
        <div className="flex items-center gap-3 min-w-fit flex-shrink-0">
          {/* Spending */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dépenses</span>
              {spendingDelta !== 0 && (
                <span className={`text-[9px] font-bold px-1.5 rounded-full ${spendingDelta > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {formatDelta(spendingDelta)}
                </span>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-sm font-bold text-slate-700">{formatTotal(currentTotals.spending)}</span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div className="w-px h-8 bg-slate-100"></div>

          {/* Revenue */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recettes</span>
              {revenueDelta !== 0 && (
                <span className={`text-[9px] font-bold px-1.5 rounded-full ${revenueDelta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {formatDelta(revenueDelta)}
                </span>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-sm font-bold text-slate-700">{formatTotal(currentTotals.revenue)}</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: PRINCIPAL CHANGES (VERTICAL LIST) */}
        <div className="flex-1 min-w-0 flex flex-col justify-center border-l border-slate-100 pl-3 h-full overflow-hidden">
          {topLevers.length > 0 ? (
            <div className="flex flex-col justify-center w-full">
              {/* No header, direct list */}
              <div className="flex flex-col gap-[1px]">
                {topLevers.map((lever) => (
                  <div key={lever.id} className="flex items-center gap-2 w-full">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${lever.impact > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <div className="flex items-baseline gap-1 min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-slate-700 truncate leading-none">
                        {lever.label}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap ml-auto leading-none">
                        {formatDelta(lever.impact)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 opacity-60">
              <span className="material-icons text-sm">auto_fix_off</span>
              <span className="text-xs font-medium italic">Aucune mesure activée</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

}
