GraphQL Schema Contract (SDL)

Overview

- This document defines the GraphQL schema (SDL) targeted for MVP → V1 → V2.
- Implement resolvers incrementally; client codegen uses `graphql/schema.sdl.graphql`.

SDL

```graphql
schema {
  query: Query
  mutation: Mutation
}

enum BasisEnum { CP AE }
enum LensEnum { ADMIN COFOG BENEFICIARY }

type MissionAllocation {
  code: String!
  label: String!
  amountEur: Float!
  share: Float!
}

type Allocation {
  mission: [MissionAllocation!]!
  cofog: [MissionAllocation!]
  beneficiary: [MissionAllocation!]
}

type Supplier {
  siren: String!
  name: String!
}

type ProcurementItem {
  supplier: Supplier!
  amountEur: Float!
  cpv: String
  procedureType: String
  locationCode: String
  sourceUrl: String
}

type Accounting {
  deficitPath: [Float!]!
  debtPath: [Float!]!
}

type Compliance {
  eu3pct: [String!]!
  eu60pct: [String!]!
  netExpenditure: [String!]!
  localBalance: [String!]!
}

type Macro {
  deltaGDP: [Float!]!
  deltaEmployment: [Float!]!
  deltaDeficit: [Float!]!
  assumptions: JSON!
}

scalar JSON

"""
MVP+ (LEGO Builder) additions
"""

enum ScopeEnum { S13 CENTRAL }

type LegoPiece {
  id: ID!
  label: String!
  type: String! # "expenditure" | "revenue"
  amountEur: Float
  share: Float
  beneficiaries: JSON!
  examples: [String!]!
  sources: [String!]!
}

type LegoBaseline {
  year: Int!
  scope: ScopeEnum!
  pib: Float!
  depensesTotal: Float!
  pieces: [LegoPiece!]!
}

type DistanceByPiece { id: ID!, shareDelta: Float! }
type Distance { score: Float!, byPiece: [DistanceByPiece!]! }

type Distribution {
  decile: [DecileImpact!]!
  giniDelta: Float!
  povertyRateDeltaPp: Float!
  assumptions: JSON!
}

type DecileImpact {
  d: Int!
  deltaNetIncomePct: Float!
}

type Source {
  id: ID!
  datasetName: String!
  url: String!
  license: String!
  refreshCadence: String!
  vintage: String!
}

input RunScenarioInput {
  dsl: String! # base64-encoded YAML
}

type RunScenarioPayload {
  id: ID!
  accounting: Accounting!
  compliance: Compliance!
  macro: Macro!
  distribution: Distribution # V1
}

type EUCountryCofog {
  country: String!
  code: String!
  label: String!
  amountEur: Float!
  share: Float!
}

type FiscalPath {
  years: [Int!]!
  deficitRatio: [Float!]!
  debtRatio: [Float!]!
}

type Query {
  allocation(year: Int!, basis: BasisEnum = CP, lens: LensEnum = ADMIN): Allocation!
  procurement(
    year: Int!
    region: String!
    cpvPrefix: String
    procedureType: String
    minAmountEur: Float
    maxAmountEur: Float
  ): [ProcurementItem!]!
  sources: [Source!]!

  # Official API convenience
  sirene(siren: String!): JSON!
  inseeSeries(dataset: String!, series: [String!]!, sinceYear: Int): JSON!
  dataGouvSearch(query: String!, pageSize: Int = 5): JSON!
  communes(department: String!): JSON!

  # V1: EU comparisons
  euCofogCompare(year: Int!, countries: [String!]!, level: Int = 1): [EUCountryCofog!]!
  euFiscalPath(country: String!, years: [Int!]!): FiscalPath!

  # MVP+: LEGO Builder
  legoPieces(year: Int!, scope: ScopeEnum = S13): [LegoPiece!]!
  legoBaseline(year: Int!, scope: ScopeEnum = S13): LegoBaseline!
  legoDistance(year: Int!, dsl: String!, scope: ScopeEnum = S13): Distance!
}

type Mutation {
  runScenario(input: RunScenarioInput!): RunScenarioPayload!
  saveScenario(id: ID!, title: String, description: String): Boolean! # persist permalink
  deleteScenario(id: ID!): Boolean!
}
```

Notes

- Distribution field in `RunScenarioPayload` is V1. Return null in MVP.
- EU queries are V1; they can stub to static responses until Eurostat integration lands.
- `sources` should be backed by the Source registry table as ingestion moves to warehouse.

Client Codegen

- See `graphql/codegen.yml` for TS React client generation.
