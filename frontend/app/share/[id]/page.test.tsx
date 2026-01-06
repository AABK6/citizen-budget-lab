import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SharePageClient from './SharePageClient';
import { gqlRequest } from '@/lib/graphql';

vi.mock('@/lib/graphql', () => ({
  gqlRequest: vi.fn(),
}));

const scenarioResponse = {
  scenario: {
    id: 'abc12345',
    accounting: {
      deficitPath: [-60000000000],
      debtPath: [1200000000000],
      commitmentsPath: [],
      deficitDeltaPath: [10000000000],
      debtDeltaPath: [15000000000],
      baselineDeficitPath: [-50000000000],
      baselineDebtPath: [1185000000000],
      gdpPath: [2000000000000],
      deficitRatioPath: [-0.03],
      baselineDeficitRatioPath: [-0.025],
      debtRatioPath: [0.6],
      baselineDebtRatioPath: [0.58],
    },
    compliance: {
      eu3pct: ['ok'],
      eu60pct: ['above'],
      netExpenditure: ['info'],
      localBalance: ['breach'],
    },
    macro: {
      deltaGDP: [0.002],
      deltaEmployment: [0.0005],
      deltaDeficit: [0],
      assumptions: {},
    },
    resolution: {
      overallPct: 0.8,
      byMass: [],
    },
  },
};

describe('SharePageClient', () => {
  beforeEach(() => {
    vi.mocked(gqlRequest).mockReset();
  });

  it('renders scenario summary after loading', async () => {
    vi.mocked(gqlRequest).mockResolvedValueOnce(scenarioResponse);

    render(<SharePageClient scenarioId="abc12345" />);

    expect(screen.getByText('Chargement…')).toBeInTheDocument();

    expect(await screen.findByText('Votre budget citoyen est prêt')).toBeInTheDocument();
    expect(screen.getByText('Scénario abc12345')).toBeInTheDocument();

    expect(screen.getByText('Solde public 2026')).toBeInTheDocument();
    expect(screen.getByText('-60.0 Md€')).toBeInTheDocument();

    expect(screen.getByText('Δ déficit vs référence')).toBeInTheDocument();
    expect(screen.getByText('-10.0 Md€')).toBeInTheDocument();

    expect(screen.getByText('Δ dette (fin)')).toBeInTheDocument();
    expect(screen.getByText('+15.0 Md€')).toBeInTheDocument();

    expect(screen.getByText('Budget financé')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('renders an error when the scenario fetch fails', async () => {
    vi.mocked(gqlRequest).mockRejectedValueOnce(new Error('boom'));

    render(<SharePageClient scenarioId="abc12345" />);

    expect(await screen.findByText(/boom/)).toBeInTheDocument();
  });
});
