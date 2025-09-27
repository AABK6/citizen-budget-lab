export type LegoPiece = {
  id: string;
  label: string;
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
};

export type MissionLabel = {
  id: string;
  displayLabel: string;
  description?: string;
};

export type PolicyLever = {
  id: string;
  label: string;
  description?: string;
  fixedImpactEur?: number;
  family: string;
  shortLabel?: string;
  popularity?: number;
  massMapping?: Record<string, number> | undefined;
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
  };
  actions: DslAction[];
};

export const INITIAL_DSL_OBJECT: DslObject = {
  version: 0.1,
  baseline_year: 2026,
  assumptions: {
    horizon_years: 5,
  },
  actions: [],
};

export type BuildLens = 'mass' | 'family' | 'reform';

export type MassCategory = {
  id: string;
  name: string;
  amount: number;
  pieces: LegoPiece[];
};
