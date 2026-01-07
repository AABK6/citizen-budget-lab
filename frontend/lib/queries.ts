
export const buildPageQuery = `
  query BuildPageData($year: Int!) {
    legoBaseline(year: $year) {
      pib
      depensesTotal
      recettesTotal
      pieces {
        id
        amountEur
        missions { code weight }
      }
    }
    legoPieces(year: $year) {
      id
      label
      description
      type
      cofogMajors
      missions { code weight }
    }
    builderMassesAdmin: builderMasses(year: $year, lens: ADMIN) {
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
      budgetSide
      majorAmendment
      label
      description
      fixedImpactEur
      cofogMapping
      missionMapping
      impact {
        householdsImpacted
        decile1ImpactEur
        decile10ImpactEur
        gdpImpactPct
        jobsImpactCount
      }
      multiYearImpact
      pushbacks {
        type
        description
        source
      }
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
      targetRevenueCategoryId
      cofogMapping
      multiYearImpact
      pushbacks {
        type
        description
        source
      }
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
      resolution { overallPct lens byMass { massId targetDeltaEur specifiedDeltaEur cpTargetDeltaEur cpSpecifiedDeltaEur cpDeltaEur unspecifiedCpDeltaEur } }
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

export const submitVoteMutation = `
  mutation SubmitVote($scenarioId: ID!, $userEmail: String) {
    submitVote(scenarioId: $scenarioId, userEmail: $userEmail)
  }
`;

export const voteSummaryQuery = `
  query VoteSummary {
    voteSummary(limit: 1000) {
      votes
    }
  }
`;
