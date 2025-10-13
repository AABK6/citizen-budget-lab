"use client"

import { useState, useEffect, useCallback } from 'react';
import { gqlRequest } from '@/lib/graphql';
import { useI18n } from '@/lib/i18n';
import { ScenarioResult } from '@/lib/types';

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
`;

export default function SharePage({ params }: { params: { id: string } }) {
  const { t } = useI18n();
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scenarioId = params.id;

  const fetchData = useCallback(async () => {
    if (!scenarioId) {
      setError("Scenario ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await gqlRequest(getScenarioQuery, { id: scenarioId });
      setScenario(data.scenario);
    } catch (err: any) {
      setError(err.message || "Failed to fetch scenario data");
    }

    setLoading(false);
  }, [scenarioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div>{t('share.loading')}</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container">
      <h1>{t('share.title')}</h1>
      <pre>{JSON.stringify(scenario, null, 2)}</pre>
    </div>
  );
}
