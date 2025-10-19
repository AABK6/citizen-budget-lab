export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  JSON: { input: any; output: any };
};

export type Accounting = {
  __typename?: "Accounting";
  debtPath: Array<Scalars["Float"]["output"]>;
  deficitPath: Array<Scalars["Float"]["output"]>;
};

export type Allocation = {
  __typename?: "Allocation";
  beneficiary?: Maybe<Array<MissionAllocation>>;
  cofog?: Maybe<Array<MissionAllocation>>;
  mission: Array<MissionAllocation>;
};

export enum BasisEnum {
  Ae = "AE",
  Cp = "CP",
}

export type BuilderMassType = {
  __typename?: "BuilderMassType";
  amountEur: Scalars["Float"]["output"];
  massId: Scalars["String"]["output"];
  share: Scalars["Float"]["output"];
};

export type Compliance = {
  __typename?: "Compliance";
  eu3pct: Array<Scalars["String"]["output"]>;
  eu60pct: Array<Scalars["String"]["output"]>;
  localBalance: Array<Scalars["String"]["output"]>;
  netExpenditure: Array<Scalars["String"]["output"]>;
};

export type DecileImpact = {
  __typename?: "DecileImpact";
  d: Scalars["Int"]["output"];
  deltaNetIncomePct: Scalars["Float"]["output"];
};

export type Distance = {
  __typename?: "Distance";
  byPiece: Array<DistanceByPiece>;
  score: Scalars["Float"]["output"];
};

export type DistanceByPiece = {
  __typename?: "DistanceByPiece";
  id: Scalars["ID"]["output"];
  shareDelta: Scalars["Float"]["output"];
};

export type Distribution = {
  __typename?: "Distribution";
  assumptions: Scalars["JSON"]["output"];
  decile: Array<DecileImpact>;
  giniDelta: Scalars["Float"]["output"];
  povertyRateDeltaPp: Scalars["Float"]["output"];
};

export type EuCountryCofog = {
  __typename?: "EUCountryCofog";
  amountEur: Scalars["Float"]["output"];
  code: Scalars["String"]["output"];
  country: Scalars["String"]["output"];
  label: Scalars["String"]["output"];
  share: Scalars["Float"]["output"];
};

export type FiscalPath = {
  __typename?: "FiscalPath";
  debtRatio: Array<Scalars["Float"]["output"]>;
  deficitRatio: Array<Scalars["Float"]["output"]>;
  years: Array<Scalars["Int"]["output"]>;
};

export type IntentType = {
  __typename?: "IntentType";
  emoji?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  massId: Scalars["String"]["output"];
  popularity: Scalars["Float"]["output"];
  seed: Scalars["JSON"]["output"];
  tags: Array<Scalars["String"]["output"]>;
};

export type LegoBaseline = {
  __typename?: "LegoBaseline";
  depensesTotal: Scalars["Float"]["output"];
  pib: Scalars["Float"]["output"];
  pieces: Array<LegoPiece>;
  recettesTotal: Scalars["Float"]["output"];
  scope: ScopeEnum;
  year: Scalars["Int"]["output"];
};

export type LegoPiece = {
  __typename?: "LegoPiece";
  amountEur?: Maybe<Scalars["Float"]["output"]>;
  beneficiaries: Scalars["JSON"]["output"];
  examples: Array<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  locked: Scalars["Boolean"]["output"];
  missions: Array<MissionWeight>;
  share?: Maybe<Scalars["Float"]["output"]>;
  sources: Array<Scalars["String"]["output"]>;
  type: Scalars["String"]["output"];
};

export enum LensEnum {
  Admin = "ADMIN",
  Beneficiary = "BENEFICIARY",
  Cofog = "COFOG",
}

export type Macro = {
  __typename?: "Macro";
  assumptions: Scalars["JSON"]["output"];
  deltaDeficit: Array<Scalars["Float"]["output"]>;
  deltaEmployment: Array<Scalars["Float"]["output"]>;
  deltaGDP: Array<Scalars["Float"]["output"]>;
};

export type MassLabelType = {
  __typename?: "MassLabelType";
  color?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  displayLabel: Scalars["String"]["output"];
  examples: Array<Scalars["String"]["output"]>;
  icon?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  synonyms: Array<Scalars["String"]["output"]>;
};

export type MassTargetType = {
  __typename?: "MassTargetType";
  massId: Scalars["String"]["output"];
  specifiedDeltaEur: Scalars["Float"]["output"];
  targetDeltaEur: Scalars["Float"]["output"];
};

export type MissionAllocation = {
  __typename?: "MissionAllocation";
  amountEur: Scalars["Float"]["output"];
  code: Scalars["String"]["output"];
  label: Scalars["String"]["output"];
  share: Scalars["Float"]["output"];
};

export type MissionLabelType = {
  __typename?: "MissionLabelType";
  color?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  displayLabel: Scalars["String"]["output"];
  examples: Array<Scalars["String"]["output"]>;
  icon?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  synonyms: Array<Scalars["String"]["output"]>;
};

export type MissionWeight = {
  __typename?: "MissionWeight";
  code: Scalars["String"]["output"];
  weight: Scalars["Float"]["output"];
};

export type Mutation = {
  __typename?: "Mutation";
  deleteScenario: Scalars["Boolean"]["output"];
  runScenario: RunScenarioPayload;
  saveScenario: Scalars["Boolean"]["output"];
};

export type MutationDeleteScenarioArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationRunScenarioArgs = {
  input: RunScenarioInput;
};

export type MutationSaveScenarioArgs = {
  description?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export enum PolicyFamilyEnum {
  Climate = "CLIMATE",
  Defense = "DEFENSE",
  Health = "HEALTH",
  Operations = "OPERATIONS",
  Other = "OTHER",
  Pensions = "PENSIONS",
  Procurement = "PROCUREMENT",
  SocialSecurity = "SOCIAL_SECURITY",
  Staffing = "STAFFING",
  Subsidies = "SUBSIDIES",
  TaxExpenditures = "TAX_EXPENDITURES",
  Taxes = "TAXES",
}

export type PolicyLeverType = {
  __typename?: "PolicyLeverType";
  conflictsWith: Array<Scalars["ID"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  family: PolicyFamilyEnum;
  feasibility: Scalars["JSON"]["output"];
  fixedImpactEur?: Maybe<Scalars["Float"]["output"]>;
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  massMapping?: Maybe<Scalars["JSON"]["output"]>;
  missionMapping?: Maybe<Scalars["JSON"]["output"]>;
  paramsSchema: Scalars["JSON"]["output"];
  popularity?: Maybe<Scalars["Float"]["output"]>;
  shortLabel?: Maybe<Scalars["String"]["output"]>;
  sources: Array<Scalars["String"]["output"]>;
};

export type ProcurementItem = {
  __typename?: "ProcurementItem";
  amountEur: Scalars["Float"]["output"];
  cpv?: Maybe<Scalars["String"]["output"]>;
  locationCode?: Maybe<Scalars["String"]["output"]>;
  procedureType?: Maybe<Scalars["String"]["output"]>;
  sourceUrl?: Maybe<Scalars["String"]["output"]>;
  supplier: Supplier;
};

export type Query = {
  __typename?: "Query";
  allocation: Allocation;
  builderMasses: Array<BuilderMassType>;
  communes: Scalars["JSON"]["output"];
  dataGouvSearch: Scalars["JSON"]["output"];
  euCofogCompare: Array<EuCountryCofog>;
  euFiscalPath: FiscalPath;
  inseeSeries: Scalars["JSON"]["output"];
  legoBaseline: LegoBaseline;
  legoDistance: Distance;
  legoPieces: Array<LegoPiece>;
  massLabels: Array<MassLabelType>;
  missionLabels: Array<MissionLabelType>;
  policyLevers: Array<PolicyLeverType>;
  popularIntents: Array<IntentType>;
  procurement: Array<ProcurementItem>;
  scenario: RunScenarioPayload;
  scenarioCompare: ScenarioCompareResult;
  shareCard: ShareSummary;
  sirene: Scalars["JSON"]["output"];
  sources: Array<Source>;
  suggestLevers: Array<PolicyLeverType>;
};

export type QueryAllocationArgs = {
  basis?: InputMaybe<BasisEnum>;
  lens?: InputMaybe<LensEnum>;
  year: Scalars["Int"]["input"];
};

export type QueryBuilderMassesArgs = {
  lens?: InputMaybe<LensEnum>;
  year: Scalars["Int"]["input"];
};

export type QueryCommunesArgs = {
  department: Scalars["String"]["input"];
};

export type QueryDataGouvSearchArgs = {
  pageSize?: InputMaybe<Scalars["Int"]["input"]>;
  query: Scalars["String"]["input"];
};

export type QueryEuCofogCompareArgs = {
  countries: Array<Scalars["String"]["input"]>;
  level?: InputMaybe<Scalars["Int"]["input"]>;
  year: Scalars["Int"]["input"];
};

export type QueryEuFiscalPathArgs = {
  country: Scalars["String"]["input"];
  years: Array<Scalars["Int"]["input"]>;
};

export type QueryInseeSeriesArgs = {
  dataset: Scalars["String"]["input"];
  series: Array<Scalars["String"]["input"]>;
  sinceYear?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryLegoBaselineArgs = {
  scope?: InputMaybe<ScopeEnum>;
  year: Scalars["Int"]["input"];
};

export type QueryLegoDistanceArgs = {
  dsl: Scalars["String"]["input"];
  scope?: InputMaybe<ScopeEnum>;
  year: Scalars["Int"]["input"];
};

export type QueryLegoPiecesArgs = {
  scope?: InputMaybe<ScopeEnum>;
  year: Scalars["Int"]["input"];
};

export type QueryPolicyLeversArgs = {
  family?: InputMaybe<PolicyFamilyEnum>;
  search?: InputMaybe<Scalars["String"]["input"]>;
};

export type QueryPopularIntentsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryProcurementArgs = {
  cpvPrefix?: InputMaybe<Scalars["String"]["input"]>;
  maxAmountEur?: InputMaybe<Scalars["Float"]["input"]>;
  minAmountEur?: InputMaybe<Scalars["Float"]["input"]>;
  procedureType?: InputMaybe<Scalars["String"]["input"]>;
  region: Scalars["String"]["input"];
  year: Scalars["Int"]["input"];
};

export type QueryScenarioArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryScenarioCompareArgs = {
  a: Scalars["ID"]["input"];
  b?: InputMaybe<Scalars["ID"]["input"]>;
};

export type QueryShareCardArgs = {
  scenarioId: Scalars["ID"]["input"];
};

export type QuerySireneArgs = {
  siren: Scalars["String"]["input"];
};

export type QuerySuggestLeversArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  massId: Scalars["String"]["input"];
};

export type ResolutionType = {
  __typename?: "ResolutionType";
  byMass: Array<MassTargetType>;
  lens: LensEnum;
  overallPct: Scalars["Float"]["output"];
};

export type RunScenarioInput = {
  dsl: Scalars["String"]["input"];
  lens?: InputMaybe<LensEnum>;
};

export type RunScenarioPayload = {
  __typename?: "RunScenarioPayload";
  accounting: Accounting;
  compliance: Compliance;
  distanceScore?: Maybe<Scalars["Float"]["output"]>;
  distribution?: Maybe<Distribution>;
  dsl?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  macro: Macro;
  resolution?: Maybe<ResolutionType>;
  scenarioId: Scalars["ID"]["output"];
  shareSummary?: Maybe<ShareSummary>;
  warnings?: Maybe<Array<Scalars["String"]["output"]>>;
};

export type ScenarioCompareResult = {
  __typename?: "ScenarioCompareResult";
  a: RunScenarioPayload;
  b?: Maybe<RunScenarioPayload>;
  massLabels: Scalars["JSON"]["output"];
  pieceLabels: Scalars["JSON"]["output"];
  ribbons: Scalars["JSON"]["output"];
  waterfall: Scalars["JSON"]["output"];
};

/** MVP+ (LEGO Builder) additions */
export enum ScopeEnum {
  Central = "CENTRAL",
  S13 = "S13",
}

export type ShareSummary = {
  __typename?: "ShareSummary";
  debtDeltaPct?: Maybe<Scalars["Float"]["output"]>;
  deficit: Scalars["Float"]["output"];
  eu3?: Maybe<Scalars["String"]["output"]>;
  eu60?: Maybe<Scalars["String"]["output"]>;
  highlight?: Maybe<Scalars["String"]["output"]>;
  masses?: Maybe<Scalars["JSON"]["output"]>;
  resolutionPct?: Maybe<Scalars["Float"]["output"]>;
  title: Scalars["String"]["output"];
};

export type Source = {
  __typename?: "Source";
  datasetName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  license: Scalars["String"]["output"];
  refreshCadence: Scalars["String"]["output"];
  url: Scalars["String"]["output"];
  vintage: Scalars["String"]["output"];
};

export type Supplier = {
  __typename?: "Supplier";
  name: Scalars["String"]["output"];
  siren: Scalars["String"]["output"];
};

export type GetAllocationQueryVariables = Exact<{
  year: Scalars["Int"]["input"];
  basis: BasisEnum;
  lens: LensEnum;
}>;

export type GetAllocationQuery = {
  __typename?: "Query";
  allocation: {
    __typename?: "Allocation";
    mission: Array<{
      __typename?: "MissionAllocation";
      code: string;
      label: string;
      amountEur: number;
      share: number;
    }>;
    cofog?: Array<{
      __typename?: "MissionAllocation";
      code: string;
      label: string;
      amountEur: number;
      share: number;
    }> | null;
    beneficiary?: Array<{
      __typename?: "MissionAllocation";
      code: string;
      label: string;
      amountEur: number;
      share: number;
    }> | null;
  };
};
