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
  isDetailsOpen: false,
  onToggleDetails: vi.fn(),
};

describe('Scoreboard', () => {
  it('renders details panel from props and triggers toggle callback', () => {
    const onToggleDetails = vi.fn();
    const { container, rerender } = render(
      <Scoreboard {...defaultProps} isDetailsOpen={false} onToggleDetails={onToggleDetails} />,
    );

    const toggle = container.querySelector('#scoreboard-details-toggle');
    expect(toggle).toBeInTheDocument();
    expect(container.querySelector('#scoreboard-dashboard-mobile')).not.toBeInTheDocument();

    fireEvent.click(toggle as Element);
    expect(onToggleDetails).toHaveBeenCalledTimes(1);

    rerender(<Scoreboard {...defaultProps} isDetailsOpen={true} onToggleDetails={onToggleDetails} />);
    expect(container.querySelector('#scoreboard-dashboard-mobile')).toBeInTheDocument();
  });
});
