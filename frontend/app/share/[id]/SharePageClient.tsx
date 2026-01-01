"use client"

import { useState, useEffect, useCallback } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { ScenarioResult } from '@/lib/types'

const getScenarioQuery = `
  query GetScenario($id: ID!) {
    scenario(id: $id) {
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
      resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
    }
  }
`

export default function SharePageClient({ scenarioId }: { scenarioId: string }) {
  const [scenario, setScenario] = useState<ScenarioResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!scenarioId) {
      setError('L\'identifiant de scénario est requis')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await gqlRequest(getScenarioQuery, { id: scenarioId })
      setScenario(data.scenario)
    } catch (err: any) {
      setError(err.message || 'Échec du chargement des données du scénario')
    }

    setLoading(false)
  }, [scenarioId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <div>Chargement…</div>
  }

  if (error) {
    return <div>Erreur : {error}</div>
  }

  return (
    <div className="container">
      <h1>Carte de partage</h1>
      <pre>{JSON.stringify(scenario, null, 2)}</pre>
    </div>
  )
}
