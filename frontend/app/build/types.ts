export type LegoPiece = {
  id: string;
  label: string;
  description?: string;
  type: 'expenditure' | 'revenue';
  cofogMajors: string[];
  missions: MissionWeight[];
  amountEur?: number;
};

export type MissionWeight = {
  code: string;
  weight: number;
};

export type MassLabel = {
  id: string;
  displayLabel: string;
  color?: string;
  icon?: string;
};

export type MissionLabel = {
  id: string;
  displayLabel: string;
  description?: string;
  color?: string;
  icon?: string;
};

export type PolicyLever = {
  id: string;
  label: string;
  description?: string;
  fixedImpactEur?: number;
  family: string;
  budgetSide?: 'SPENDING' | 'REVENUE' | 'BOTH';
  majorAmendment?: boolean;
  shortLabel?: string;
  popularity?: number;
  massMapping?: Record<string, number> | undefined;
  missionMapping?: Record<string, number> | undefined;
  impact?: {
    householdsImpacted?: number;
    decile1ImpactEur?: number;
    decile10ImpactEur?: number;
    gdpImpactPct?: number;
    jobsImpactCount?: number;
  };
};

export type PopularIntent = {
  id: string;
  label: string;
  emoji?: string;
  massId: string;
  seed: any;
};

export type DslAction = {
  id: string;
  target: string;
  op: 'increase' | 'decrease' | 'set';
  amount_eur: number;
  role?: 'target';
  recurring?: boolean;
};

export type DslObject = {
  version: number;
  baseline_year: number;
  assumptions: {
    horizon_years: number;
    lens?: AggregationLens;
  };
  actions: DslAction[];
};

export const INITIAL_DSL_OBJECT: DslObject = {
  version: 0.1,
  baseline_year: 2026,
  assumptions: {
    horizon_years: 5,
    lens: 'MISSION',
  },
  actions: [],
};

export type AggregationLens = 'MISSION' | 'COFOG';

export type BuildLens = 'mass' | 'family' | 'reform';

export type MassCategory = {
  id: string;
  name: string;
  amount: number;
  share: number;
  baselineAmount: number;
  baselineShare: number;
  deltaAmount: number;
  unspecifiedAmount: number;
  color?: string;
  icon?: string;
  pieces: LegoPiece[];
};
