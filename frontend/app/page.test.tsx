import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import LandingPage from './page';
import { gqlRequest } from '@/lib/graphql';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/graphql', () => ({
  gqlRequest: vi.fn(async () => ({ voteSummary: [] })),
}));

vi.mock('@/lib/queries', () => ({
  voteSummaryQuery: 'voteSummaryQuery',
}));

vi.mock('recharts', () => {
  const Stub = () => <div />;
  return {
    ResponsiveContainer: Stub,
    ComposedChart: Stub,
    AreaChart: Stub,
    Area: Stub,
    Line: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    ReferenceLine: Stub,
    Legend: Stub,
  };
});

describe('LandingPage', () => {
  it('hides the hero visualization on mobile breakpoints', async () => {
    const { getByTestId } = render(<LandingPage />);
    await waitFor(() => expect(gqlRequest).toHaveBeenCalled());
    const heroVisual = getByTestId('landing-hero-visual');

    expect(heroVisual.className).toMatch(/\bhidden\b/);
    expect(heroVisual.className).toMatch(/\bmd:block\b/);
  });
});
