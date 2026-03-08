import type { DslAction, PolicyLever } from './types';

const revenueFamilies = new Set(['TAXES', 'TAX_EXPENDITURES']);

export type BudgetSide = 'SPENDING' | 'REVENUE' | 'BOTH';

export type ScenarioActionSummary = {
  id: string;
  label: string;
  fullLabel: string;
  impact: number;
};

type SummaryParams = {
  actions: DslAction[];
  baselineMasses?: Map<string, { name: string; amount: number }>;
  piecesById?: Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>;
  policyLevers: PolicyLever[];
  year?: number;
};

export function resolveBudgetSide(lever: PolicyLever): BudgetSide {
  return lever.budgetSide ?? (revenueFamilies.has(lever.family) ? 'REVENUE' : 'SPENDING');
}

export function getLeverFiscalImpactEur(lever: PolicyLever, year?: number): number {
  if (year !== undefined && lever.multiYearImpact) {
    const key = String(year);
    const candidate = lever.multiYearImpact[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  const fallback = Number(lever.fixedImpactEur ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
}

export function getImpactTone(impact: number) {
  if (impact > 0) {
    return {
      badge: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-700',
      mutedText: 'text-emerald-600',
      dot: 'bg-emerald-500',
    };
  }
  if (impact < 0) {
    return {
      badge: 'bg-rose-100 text-rose-700',
      text: 'text-rose-700',
      mutedText: 'text-rose-600',
      dot: 'bg-rose-500',
    };
  }
  return {
    badge: 'bg-slate-100 text-slate-500',
    text: 'text-slate-500',
    mutedText: 'text-slate-500',
    dot: 'bg-slate-300',
  };
}

export function formatImpactEur(impact: number): string {
  const sign = impact > 0 ? '+' : impact < 0 ? '-' : '';
  return `${sign}${(Math.abs(impact) / 1e9).toFixed(1)} Md€`;
}

export function getLeverMissionDeltaEur(
  lever: PolicyLever,
  missionId: string,
  year?: number,
): number {
  if (resolveBudgetSide(lever) === 'REVENUE') {
    return 0;
  }
  const missionMapping = lever.missionMapping ?? {};
  const weight = Number(missionMapping[missionId] ?? 0);
  if (!Number.isFinite(weight) || weight <= 0) {
    return 0;
  }
  return -getLeverFiscalImpactEur(lever, year) * weight;
}

export function getLeverRevenueDeltaForCategoryEur(
  lever: PolicyLever,
  categoryId: string,
  year?: number,
): number {
  if (resolveBudgetSide(lever) === 'SPENDING') {
    return 0;
  }
  return lever.targetRevenueCategoryId === categoryId ? getLeverFiscalImpactEur(lever, year) : 0;
}

export function getLeverRevenueDeltaForFamilyEur(
  lever: PolicyLever,
  categoryIds: Set<string>,
  year?: number,
): number {
  if (resolveBudgetSide(lever) === 'SPENDING') {
    return 0;
  }
  const targetId = lever.targetRevenueCategoryId;
  if (!targetId || !categoryIds.has(targetId)) {
    return 0;
  }
  return getLeverFiscalImpactEur(lever, year);
}

export function findConflictingLeverIds(
  lever: PolicyLever,
  selectedIds: Iterable<string>,
  leversById: Map<string, PolicyLever>,
): string[] {
  const selected = new Set(selectedIds);
  const directConflicts = new Set(lever.conflictsWith ?? []);
  const conflicts: string[] = [];

  for (const selectedId of selected) {
    const selectedLever = leversById.get(selectedId);
    if (!selectedLever) {
      continue;
    }
    if (directConflicts.has(selectedId) || (selectedLever.conflictsWith ?? []).includes(lever.id)) {
      conflicts.push(selectedId);
    }
  }

  return conflicts;
}

function resolveActionDelta(action: DslAction): number {
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
}

function formatTotal(amount: number) {
  return `${(Math.abs(amount) / 1e9).toFixed(1)} Md€`;
}

function formatOrientationLabel(verb: string, percent: number | null, amount: number, label: string) {
  if (Number.isFinite(percent)) {
    return `${verb} de ${percent!.toFixed(1)}% ${label}`;
  }
  return `${verb} ${formatTotal(amount)} ${label}`;
}

export function summarizeScenarioActions({
  actions,
  baselineMasses,
  piecesById,
  policyLevers,
  year,
}: SummaryParams): ScenarioActionSummary[] {
  if (!actions?.length) {
    return [];
  }

  const leverMap = new Map(policyLevers.map((lever) => [lever.id, lever]));
  const seen = new Set<string>();
  const items: ScenarioActionSummary[] = [];

  for (const action of actions) {
    const lever = leverMap.get(action.id);
    if (lever) {
      if (seen.has(lever.id)) {
        continue;
      }
      seen.add(lever.id);
      items.push({
        id: lever.id,
        label: lever.shortLabel || lever.label,
        fullLabel: lever.label,
        impact: getLeverFiscalImpactEur(lever, year),
      });
      continue;
    }

    const target = String(action.target || '');
    const delta = resolveActionDelta(action);
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
    if (impactA !== impactB) {
      return impactB - impactA;
    }
    return a.fullLabel.localeCompare(b.fullLabel, 'fr');
  });
}
