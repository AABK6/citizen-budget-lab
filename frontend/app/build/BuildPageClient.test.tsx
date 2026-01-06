import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import BuildPageClient from './BuildPageClient';
import { gqlRequest } from '@/lib/graphql';

const mockActions = {
  setInitialLoading: vi.fn(),
  setScenarioLoading: vi.fn(),
  setError: vi.fn(),
  setScenarioError: vi.fn(),
  setScenarioResult: vi.fn(),
  setData: vi.fn(),
  setSuggestedLevers: vi.fn(),
  setTargetPercent: vi.fn(),
  setTargetRangeMax: vi.fn(),
  setRevenueTargetPercent: vi.fn(),
  setRevenueTargetRangeMax: vi.fn(),
  setSelectedCategory: vi.fn(),
  setSelectedRevenueCategory: vi.fn(),
  setLens: vi.fn(),
  setAggregationLens: vi.fn(),
  setMasses: vi.fn(),
  setLabels: vi.fn(),
  togglePanel: vi.fn(),
  toggleRevenuePanel: vi.fn(),
  toggleFamily: vi.fn(),
  setScenarioId: vi.fn(),
};

let mockState = {
  year: 2026,
  initialLoading: true,
  scenarioLoading: false,
  error: null,
  scenarioError: null,
  scenarioResult: null,
  scenarioId: null,
  spendingPieces: [],
  revenuePieces: [],
  masses: [],
  policyLevers: [],
  popularIntents: [],
  isPanelExpanded: false,
  isRevenuePanelExpanded: false,
  selectedCategory: null,
  selectedRevenueCategory: null,
  suggestedLevers: [],
  targetPercent: 0,
  targetRangeMax: 10,
  revenueTargetPercent: 0,
  revenueTargetRangeMax: 10,
  lens: 'mass',
  expandedFamilies: [],
  massLabels: {},
  missionLabels: {},
};

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/graphql', () => ({
  gqlRequest: vi.fn(),
}));

vi.mock('@/lib/dsl', () => ({
  parseDsl: vi.fn(() => ({
    version: 0.1,
    baseline_year: 2026,
    actions: [],
  })),
  serializeDsl: vi.fn(() => 'dsl'),
}));

vi.mock('@/lib/queries', () => ({
  buildPageQuery: 'buildPageQuery',
  suggestLeversQuery: 'suggestLeversQuery',
  getScenarioDslQuery: 'getScenarioDslQuery',
  submitVoteMutation: 'submitVoteMutation',
}));

vi.mock('@/lib/permalink', () => ({
  runScenarioForDsl: vi.fn(async () => ({ runScenario: null })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/build',
  useSearchParams: () => ({ toString: () => '' }),
}));

vi.mock('./useBuildState', () => ({
  useBuildState: () => ({
    state: mockState,
    actions: mockActions,
  }),
}));

beforeEach(() => {
  mockState = {
    ...mockState,
    initialLoading: true,
    error: null,
    scenarioError: null,
  };
  Object.values(mockActions).forEach((fn) => fn.mockClear());
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
  vi.mocked(gqlRequest).mockRejectedValue(new Error('fail'));
});

describe('BuildPageClient', () => {
  it('renders the build skeleton while loading', () => {
    const { container } = render(<BuildPageClient />);
    const shell = container.querySelector('.build-page-container');

    expect(shell).toBeInTheDocument();
  });
});
