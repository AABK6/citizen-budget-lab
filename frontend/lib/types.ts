export type ScenarioResult = {
  id: string;
  accounting: {
    deficitPath: number[];
    debtPath: number[];
    commitmentsPath?: number[];
    deficitDeltaPath?: number[];
    debtDeltaPath?: number[];
    baselineDeficitPath?: number[];
    baselineDebtPath?: number[];
    gdpPath?: number[];
    deficitRatioPath?: number[];
    baselineDeficitRatioPath?: number[];
    debtRatioPath?: number[];
    baselineDebtRatioPath?: number[];
  };
  compliance: {
    eu3pct: string[];
    eu60pct: string[];
    netExpenditure: string[];
    localBalance: string[];
  };
  macro: { deltaGDP: number[]; deltaEmployment: number[]; deltaDeficit: number[]; assumptions: any; };
  resolution: { overallPct: number; byMass: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number; }[]; };
};
