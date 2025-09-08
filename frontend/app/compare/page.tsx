"use client"

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { gqlRequest } from '@/lib/graphql';
import { ScenarioResult } from '@/app/build/page'; // Assuming this type is exported
import { useRouter } from 'next/navigation';

const scenarioCompareQuery = `
  query ScenarioCompare($a: ID!, $b: ID) {
    scenarioCompare(a: $a, b: $b) {
      a {
        id
        accounting { deficitPath debtPath }
        compliance { eu3pct eu60pct netExpenditure localBalance }
        macro { deltaGDP deltaEmployment deltaDeficit assumptions }
        resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
      }
      b {
        id
        accounting { deficitPath debtPath }
        compliance { eu3pct eu60pct netExpenditure localBalance }
        macro { deltaGDP deltaEmployment deltaDeficit assumptions }
        resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
      }
      waterfall
      ribbons
      pieceLabels
      massLabels
    }
  }
`;

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scenarioA, setScenarioA] = useState<ScenarioResult | null>(null);
  const [scenarioB, setScenarioB] = useState<ScenarioResult | null>(null);
  const [comparison, setComparison] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scenarioIdA = searchParams.get('a');
  const scenarioIdB = searchParams.get('b');

  const fetchData = useCallback(async () => {
    if (!scenarioIdA) {
      setError("Scenario A is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await gqlRequest(scenarioCompareQuery, { a: scenarioIdA, b: scenarioIdB });
      setComparison(data.scenarioCompare);
    } catch (err: any) {
      setError(err.message || "Failed to fetch comparison data");
    }

    setLoading(false);
  }, [scenarioIdA, scenarioIdB]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDuplicateAndEdit = (scenario: ScenarioResult) => {
    // The DSL is not returned by the scenarioCompare query.
    // I need to fetch it separately.
    // For now, I will redirect to the build page with the scenario ID.
    router.push(`/build?scenarioId=${scenario.id}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container">
      <h1>Scenario Comparison</h1>
      <pre>{JSON.stringify(comparison, null, 2)}</pre>
      <button className="fr-btn" onClick={() => handleDuplicateAndEdit(comparison.a.dsl)}>Duplicate & Edit Scenario A</button>
      {comparison.b && <button className="fr-btn" onClick={() => handleDuplicateAndEdit(comparison.b.dsl)}>Duplicate & Edit Scenario B</button>}
    </div>
  );
}
