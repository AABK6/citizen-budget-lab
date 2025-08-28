import { useState } from 'react';
import { graphqlFetch } from '../lib/graphqlFetch';

type RunScenarioData = {
  runScenario: {
    id: string;
    accounting: { deficitPath: number[]; debtPath: number[] };
    compliance: { eu3pct: string[]; eu60pct: string[]; netExpenditure: string[]; localBalance: string[] };
    macro: { deltaGDP: number[]; deltaEmployment: number[]; deltaDeficit: number[]; assumptions: Record<string, any> };
  };
};

const MUT = `#graphql
mutation RunScenario($dsl: String!){
  runScenario(input: { dsl: $dsl }){
    id
    accounting { deficitPath debtPath }
    compliance { eu3pct eu60pct netExpenditure localBalance }
    macro { deltaGDP deltaEmployment deltaDeficit assumptions }
  }
}`;

const SAMPLE = `version: 0.1
baseline_year: 2026
assumptions:
  horizon_years: 5
actions:
  - id: ed_invest_boost
    target: mission.education
    dimension: cp
    op: increase
    amount_eur: 1000000000
    recurring: true
  - id: ir_cut_T3
    target: tax.ir.bracket_T3
    dimension: tax
    op: rate_change
    delta_bps: -50
`;

function toBase64(text: string): string {
  if (typeof window === 'undefined') return '';
  return btoa(unescape(encodeURIComponent(text)));
}

export default function WhatIf() {
  const [yaml, setYaml] = useState<string>(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunScenarioData['runScenario'] | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const dsl = toBase64(yaml);
      const data = await graphqlFetch<RunScenarioData>({ query: MUT, variables: { dsl } });
      setResult(data.runScenario);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>What‑if (Scenario)</h2>
      <p>Paste YAML, we encode to base64 and call the API.</p>
      <textarea value={yaml} onChange={(e) => setYaml(e.target.value)} rows={16} style={{ width: '100%', fontFamily: 'monospace' }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={run}>Run scenario</button>
      </div>
      {loading && <p>Running…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <h3>Result {result.id}</h3>
          <div style={{ display: 'flex', gap: 24 }}>
            <section>
              <h4>Accounting</h4>
              <pre>{JSON.stringify(result.accounting, null, 2)}</pre>
            </section>
            <section>
              <h4>Compliance</h4>
              <pre>{JSON.stringify(result.compliance, null, 2)}</pre>
            </section>
            <section>
              <h4>Macro</h4>
              <pre>{JSON.stringify(result.macro, null, 2)}</pre>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

