import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Scoreboard } from './Scoreboard';

const defaultProps = {
  scenarioResult: null,
  baselineTotals: { spending: 100, revenue: 90 },
  currentTotals: { spending: 100, revenue: 90 },
  actions: [],
  policyLevers: [],
  onReset: vi.fn(),
  onShare: vi.fn(),
  year: 2026,
  displayMode: 'amount' as const,
  setDisplayMode: vi.fn(),
};

describe('Scoreboard', () => {
  it('toggles the details panel on mobile', () => {
    const { getByRole, getByTestId } = render(<Scoreboard {...defaultProps} />);

    const toggle = getByRole('button', { name: /details/i });
    const details = getByTestId('scoreboard-details');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(details.className).toMatch(/\bhidden\b/);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(details.className).toMatch(/\bblock\b/);
  });
});
