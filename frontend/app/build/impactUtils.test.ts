import { describe, expect, it } from 'vitest';

import type { DslAction, PolicyLever } from './types';
import {
  findConflictingLeverIds,
  getLeverMissionDeltaEur,
  summarizeScenarioActions,
} from './impactUtils';

describe('impactUtils', () => {
  it('detects conflicts even when only the selected lever declares them', () => {
    const selected: PolicyLever = {
      id: 'freeze_tax_brackets',
      label: 'Freeze brackets',
      family: 'TAXES',
      conflictsWith: ['amend_ir_bracket_indexation_1pct'],
      sources: [],
    };
    const next: PolicyLever = {
      id: 'amend_ir_bracket_indexation_1pct',
      label: 'Indexation 1.1%',
      family: 'TAXES',
      conflictsWith: [],
      sources: [],
    };

    const conflicts = findConflictingLeverIds(
      next,
      ['freeze_tax_brackets'],
      new Map([
        [selected.id, selected],
        [next.id, next],
      ]),
    );

    expect(conflicts).toEqual(['freeze_tax_brackets']);
  });

  it('computes spending deltas from fiscal impact and ignores revenue levers', () => {
    const spendingLever: PolicyLever = {
      id: 'def_senate_adjustment',
      label: 'Defense adjustment',
      family: 'DEFENSE',
      fixedImpactEur: 1_700_000_000,
      missionMapping: { M_DEFENSE: 1 },
      conflictsWith: [],
      sources: [],
    };
    const revenueLever: PolicyLever = {
      id: 'carbon_tax',
      label: 'Carbon tax',
      family: 'CLIMATE',
      budgetSide: 'REVENUE',
      fixedImpactEur: 4_000_000_000,
      missionMapping: { M_ENVIRONMENT: 1 },
      conflictsWith: [],
      sources: [],
    };

    expect(getLeverMissionDeltaEur(spendingLever, 'M_DEFENSE', 2026)).toBe(-1_700_000_000);
    expect(getLeverMissionDeltaEur(revenueLever, 'M_ENVIRONMENT', 2026)).toBe(0);
  });

  it('sorts scenario summaries by absolute impact', () => {
    const actions: DslAction[] = [
      { id: 'small_reform', target: 'piece.small_reform', op: 'decrease', amount_eur: 1_000_000_000 },
      { id: 'big_reform', target: 'piece.big_reform', op: 'decrease', amount_eur: 6_000_000_000 },
    ];
    const policyLevers: PolicyLever[] = [
      {
        id: 'small_reform',
        label: 'Petite réforme',
        family: 'DEFENSE',
        fixedImpactEur: 1_000_000_000,
        conflictsWith: [],
        sources: [],
      },
      {
        id: 'big_reform',
        label: 'Grande réforme',
        family: 'TAXES',
        fixedImpactEur: 6_000_000_000,
        conflictsWith: [],
        sources: [],
      },
    ];

    const summaries = summarizeScenarioActions({
      actions,
      policyLevers,
      year: 2026,
    });

    expect(summaries.map((item) => item.fullLabel)).toEqual([
      'Grande réforme',
      'Petite réforme',
    ]);
  });
});
