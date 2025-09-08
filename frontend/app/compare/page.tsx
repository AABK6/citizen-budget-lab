"use client"

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { gqlRequest } from '@/lib/graphql';
import { ScenarioResult } from '@/app/build/page'; // Assuming this type is exported

const scenarioCompareQuery = `
  query ScenarioCompare($a: ID!, $b: ID) {
    scenarioCompare(a: $a, b: $b)
  }
`;

export default function ComparePage() {
  const searchParams = useSearchParams();
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
    </div>
  );
}
