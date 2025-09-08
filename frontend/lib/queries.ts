
export const buildPageQuery = `
  query BuildPageData($year: Int!) {
    legoBaseline(year: $year) {
      pieces {
        id
        amountEur
      }
    }
    legoPieces(year: $year) {
      id
      label
      type
      cofogMajors
    }
    massLabels {
      id
      displayLabel
    }
    policyLevers {
      id
      family
      label
      description
      fixedImpactEur
    }
    popularIntents {
      id
      label
      emoji
      massId
      seed
    }
  }
`;

export const suggestLeversQuery = `
  query SuggestLevers($massId: String!) {
    suggestLevers(massId: $massId) {
      id
      label
      description
      fixedImpactEur
    }
  }
`;

export const runScenarioMutation = `
  mutation Run($dsl: String!) {
    runScenario(input: { dsl: $dsl }) {
      id
      accounting { deficitPath debtPath }
      compliance { eu3pct eu60pct netExpenditure localBalance }
      macro { deltaGDP deltaEmployment deltaDeficit assumptions }
      resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
    }
  }
`;
