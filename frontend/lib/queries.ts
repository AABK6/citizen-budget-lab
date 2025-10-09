
export const buildPageQuery = `
  query BuildPageData($year: Int!) {
    legoBaseline(year: $year) {
      pieces {
        id
        amountEur
        missions { code weight }
      }
    }
    legoPieces(year: $year) {
      id
      label
      type
      cofogMajors
      missions { code weight }
    }
    builderMassesAdmin: builderMasses(year: $year, lens: ADMIN) {
      massId
      amountEur
      share
    }
    builderMassesCofog: builderMasses(year: $year, lens: COFOG) {
      massId
      amountEur
      share
    }
    massLabels {
      id
      displayLabel
      color
      icon
    }
    missionLabels {
      id
      displayLabel
      description
      color
      icon
    }
    policyLevers {
      id
      family
      label
      description
      fixedImpactEur
      massMapping
      missionMapping
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
  mutation Run($dsl: String!, $lens: LensEnum!) {
    runScenario(input: { dsl: $dsl, lens: $lens }) {
      id
      accounting {
        deficitPath
        debtPath
        commitmentsPath
        deficitDeltaPath
        debtDeltaPath
        baselineDeficitPath
        baselineDebtPath
        gdpPath
        deficitRatioPath
        baselineDeficitRatioPath
        debtRatioPath
        baselineDebtRatioPath
      }
      compliance { eu3pct eu60pct netExpenditure localBalance }
      macro { deltaGDP deltaEmployment deltaDeficit assumptions }
      resolution { overallPct lens byMass { massId targetDeltaEur specifiedDeltaEur } }
    }
  }
`;

export const getScenarioDslQuery = `
  query GetScenarioDsl($id: ID!) {
    scenario(id: $id) {
      dsl
    }
  }
`;
