"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { gqlRequest } from '@/lib/graphql';
import { ScenarioResult } from '@/lib/types';
import { useRouter } from 'next/navigation';

const scenarioCompareQuery = `
  query ScenarioCompare($a: ID!, $b: ID) {
    scenarioCompare(a: $a, b: $b) {
      a {
        accounting {
          deficitPath
        }
      }
      b {
        accounting {
          deficitPath
        }
      }
      waterfall {
        massId
        deltaEur
      }
    }
  }
`;

export default function ComparePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scenarioA, setScenarioA] = useState<ScenarioResult | null>(null);
  const [scenarioB, setScenarioB] = useState<ScenarioResult | null>(null);
  const [waterfall, setWaterfall] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scenarioIdA = searchParams.get('a');
    const scenarioIdB = searchParams.get('b');

    if (!scenarioIdA) {
      setError("Scenario A is required");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const data = await gqlRequest(scenarioCompareQuery, { a: scenarioIdA, b: scenarioIdB });
        setScenarioA(data.scenarioCompare.a);
        setScenarioB(data.scenarioCompare.b);
        setWaterfall(data.scenarioCompare.waterfall);
      } catch (err) {
        setError("Failed to fetch comparison data");
      }
      setLoading(false);
    };

    fetchData();
  }, [searchParams]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Scenario Comparison</h1>
      {/* Render your comparison data here */}
    </div>
  );
}
