import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DslAction, PolicyLever } from '../types';
import { DebriefModal } from './DebriefModal';

describe('DebriefModal', () => {
  it('renders a scrollable, impact-sorted measure list', () => {
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

    render(
      <DebriefModal
        isOpen
        onClose={vi.fn()}
        onConfirmVote={vi.fn()}
        scenarioResult={null}
        deficit={-80_000_000_000}
        actions={actions}
        policyLevers={policyLevers}
        year={2026}
      />,
    );

    const modalCard = screen.getByTestId('debrief-modal-card');
    const modalBody = screen.getByTestId('debrief-modal-body');
    const scrollArea = screen.getByTestId('debrief-measures-scroll');

    expect(modalCard.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(modalBody.className).toContain('overflow-y-auto');
    expect(scrollArea).toBeInTheDocument();

    const labels = Array.from(scrollArea?.querySelectorAll('li span.text-sm.font-medium.text-slate-700.leading-snug') ?? [])
      .map((node) => node.textContent);
    expect(labels).toEqual(['Grande réforme', 'Petite réforme']);
  });
});
