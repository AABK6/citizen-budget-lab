"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureScenarioIdFromDsl } from '@/lib/permalink';

type Challenge = {
  id: string;
  title: string;
  description: string;
  dsl: string;
};

const challenges: Challenge[] = [
  {
    id: 'reduce-debt',
    title: 'Reduce the Debt',
    description: 'Reduce the national debt by 10% in 5 years.',
    dsl: 'version: 0.1\nbaseline_year: 2026\nassumptions: { horizon_years: 5 }\nactions:\n  - id: p1\n    target: piece.ed_schools_staff_ops\n    op: decrease\n    amount_eur: 10000000000\n    recurring: true\n',
  },
  {
    id: 'boost-economy',
    title: 'Boost the Economy',
    description: 'Increase GDP by 5% in 5 years.',
    dsl: 'version: 0.1\nbaseline_year: 2026\nassumptions: { horizon_years: 5 }\nactions:\n  - id: p1\n    target: piece.rev_vat_standard\n    op: decrease\n    amount_eur: 20000000000\n    recurring: true\n',
  },
];

export default function ChallengesPage() {
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleChallengeClick = async (challenge: Challenge) => {
    try {
      setLoadingId(challenge.id);
      const scenarioId = await ensureScenarioIdFromDsl(challenge.dsl);
      router.push(`/build?scenarioId=${scenarioId}`);
    } catch (error) {
      console.error('Failed to prepare challenge scenario', error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="container">
      <h1>Challenges</h1>
      <div className="stack">
        {challenges.map(challenge => (
          <div
            key={challenge.id}
            className="card"
            onClick={() => handleChallengeClick(challenge)}
            aria-busy={loadingId === challenge.id}
            style={loadingId === challenge.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          >
            <h2>{challenge.title}</h2>
            <p>{challenge.description}</p>
            {loadingId === challenge.id && <p className="loading-hint">Preparing scenario…</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
