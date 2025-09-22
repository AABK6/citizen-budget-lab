"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { gqlRequest } from '@/lib/graphql';

const scenarioCompareQuery = `
  query ScenarioCompare($a: ID!, $b: ID) {
    scenarioCompare(a: $a, b: $b) {
      a {
        id
        scenarioId
        accounting { deficitPath debtPath commitmentsPath }
        compliance { eu3pct eu60pct netExpenditure localBalance }
        macro { deltaGDP deltaEmployment deltaDeficit }
        resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
      }
      b {
        id
        scenarioId
        accounting { deficitPath debtPath commitmentsPath }
        compliance { eu3pct eu60pct netExpenditure localBalance }
        macro { deltaGDP deltaEmployment deltaDeficit }
        resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
      }
      waterfall
      ribbons
      pieceLabels
      massLabels
    }
  }
`;

type RunScenario = {
  id: string;
  scenarioId: string;
  accounting: { deficitPath: number[]; debtPath: number[]; commitmentsPath?: number[] };
  compliance: { eu3pct: string[]; eu60pct: string[]; netExpenditure: string[]; localBalance: string[] };
  macro: { deltaGDP: number[]; deltaEmployment: number[]; deltaDeficit: number[] };
  resolution: { overallPct: number; byMass: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[] };
};

type WaterfallEntry = { massId: string; deltaEur: number };
type RibbonEntry = { pieceId: string; massId: string; amountEur: number };

type ScenarioComparePayload = {
  a: RunScenario;
  b: RunScenario;
  waterfall: WaterfallEntry[];
  ribbons: RibbonEntry[];
  pieceLabels: Record<string, string>;
  massLabels: Record<string, string>;
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return currencyFormatter.format(value);
}

function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

function first<T>(arr: T[] | undefined, fallback = 0): T | typeof fallback {
  if (!arr || arr.length === 0) return fallback;
  return arr[0] ?? fallback;
}

export default function ComparePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ScenarioComparePayload | null>(null);

  const fetchCompare = useCallback(async (aId: string, bId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest(scenarioCompareQuery, { a: aId, b: bId } as Record<string, any>);
      const raw = data.scenarioCompare;
      if (!raw?.a) {
        throw new Error('Comparison payload missing scenario A');
      }
      const waterfall: WaterfallEntry[] = Array.isArray(raw.waterfall)
        ? raw.waterfall.map((item: any) => ({
            massId: String(item.massId ?? ''),
            deltaEur: Number(item.deltaEur ?? 0),
          }))
        : [];
      const ribbons: RibbonEntry[] = Array.isArray(raw.ribbons)
        ? raw.ribbons.map((item: any) => ({
            pieceId: String(item.pieceId ?? ''),
            massId: String(item.massId ?? ''),
            amountEur: Number(item.amountEur ?? 0),
          }))
        : [];
      const massLabels: Record<string, string> = raw.massLabels ?? {};
      const pieceLabels: Record<string, string> = raw.pieceLabels ?? {};
      const ensureScenario = (sc: any): RunScenario => ({
        id: String(sc.id ?? ''),
        scenarioId: String(sc.scenarioId ?? ''),
        accounting: {
          deficitPath: (sc.accounting?.deficitPath ?? []).map((v: number) => Number(v)),
          debtPath: (sc.accounting?.debtPath ?? []).map((v: number) => Number(v)),
          commitmentsPath: sc.accounting?.commitmentsPath?.map((v: number) => Number(v)),
        },
        compliance: {
          eu3pct: sc.compliance?.eu3pct ?? [],
          eu60pct: sc.compliance?.eu60pct ?? [],
          netExpenditure: sc.compliance?.netExpenditure ?? [],
          localBalance: sc.compliance?.localBalance ?? [],
        },
        macro: {
          deltaGDP: (sc.macro?.deltaGDP ?? []).map((v: number) => Number(v)),
          deltaEmployment: (sc.macro?.deltaEmployment ?? []).map((v: number) => Number(v)),
          deltaDeficit: (sc.macro?.deltaDeficit ?? []).map((v: number) => Number(v)),
        },
        resolution: {
          overallPct: Number(sc.resolution?.overallPct ?? 0),
          byMass: (sc.resolution?.byMass ?? []).map((entry: any) => ({
            massId: String(entry.massId ?? ''),
            targetDeltaEur: Number(entry.targetDeltaEur ?? 0),
            specifiedDeltaEur: Number(entry.specifiedDeltaEur ?? 0),
          })),
        },
      });

      const scenarioA = ensureScenario(raw.a);
      const scenarioB = ensureScenario(raw.b ?? raw.a);

      setPayload({
        a: scenarioA,
        b: scenarioB,
        waterfall,
        ribbons,
        massLabels,
        pieceLabels,
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch comparison');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const aParam = searchParams.get('a');
    const bParam = searchParams.get('b');
    if (aParam) {
      setInputA(aParam);
      setInputB(bParam ?? '');
      fetchCompare(aParam, bParam);
    } else {
      setPayload(null);
      setError('Provide a scenarioId in the “A” slot to start the comparison.');
      setLoading(false);
    }
  }, [searchParams, fetchCompare]);

  const handleSubmit = useCallback(
    (evt: FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      if (!inputA.trim()) {
        setError('Scenario A is required');
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set('a', inputA.trim());
      if (inputB.trim()) {
        params.set('b', inputB.trim());
      } else {
        params.delete('b');
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [inputA, inputB, pathname, router, searchParams],
  );

  const handleSwap = useCallback(() => {
    const nextA = inputB;
    const nextB = inputA;
    setInputA(nextA);
    setInputB(nextB);
    const params = new URLSearchParams(searchParams.toString());
    if (nextA.trim()) {
      params.set('a', nextA.trim());
    } else {
      params.delete('a');
    }
    if (nextB.trim()) {
      params.set('b', nextB.trim());
    } else {
      params.delete('b');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [inputA, inputB, pathname, router, searchParams]);

  const comparisonSummary = useMemo(() => {
    if (!payload) {
      return null;
    }
    const firstYearA = Number(first(payload.a.accounting.deficitPath));
    const firstYearB = Number(first(payload.b.accounting.deficitPath));
    const commitmentsA = Number(first(payload.a.accounting.commitmentsPath));
    const commitmentsB = Number(first(payload.b.accounting.commitmentsPath));

    return {
      deficitFirstYear: {
        a: firstYearA,
        b: firstYearB,
        diff: firstYearA - firstYearB,
      },
      commitmentsFirstYear: {
        a: commitmentsA,
        b: commitmentsB,
        diff: commitmentsA - commitmentsB,
      },
      resolutionPct: {
        a: payload.a.resolution.overallPct,
        b: payload.b.resolution.overallPct,
        diff: payload.a.resolution.overallPct - payload.b.resolution.overallPct,
      },
    };
  }, [payload]);

  const topMasses = useMemo(() => {
    if (!payload) return [] as WaterfallEntry[];
    return [...payload.waterfall].sort((a, b) => Math.abs(b.deltaEur) - Math.abs(a.deltaEur)).slice(0, 8);
  }, [payload]);

  const topPieces = useMemo(() => {
    if (!payload) return [] as RibbonEntry[];
    return [...payload.ribbons].sort((a, b) => Math.abs(b.amountEur) - Math.abs(a.amountEur)).slice(0, 8);
  }, [payload]);

  return (
    <div className="compare-page">
      <header className="compare-header">
        <h1>Compare &amp; Remix</h1>
        <p className="compare-tagline">
          Load two saved scenarios to inspect their fiscal footprints side-by-side, understand the largest deltas by mission, and jump back into the builder for further tweaks.
        </p>
      </header>

      <section className="compare-controls">
        <form onSubmit={handleSubmit} className="compare-form">
          <div className="control-group">
            <label htmlFor="scenario-a">Scenario A</label>
            <input
              id="scenario-a"
              value={inputA}
              onChange={(evt) => setInputA(evt.target.value)}
              placeholder="scenarioId (required)"
              className="fr-input"
            />
          </div>
          <div className="control-group">
            <label htmlFor="scenario-b">Scenario B</label>
            <input
              id="scenario-b"
              value={inputB}
              onChange={(evt) => setInputB(evt.target.value)}
              placeholder="scenarioId (optional: leave blank for baseline)"
              className="fr-input"
            />
          </div>
          <div className="control-actions">
            <button type="submit" className="fr-btn">Compare</button>
            <button type="button" className="fr-btn fr-btn--secondary" onClick={handleSwap} disabled={!inputA && !inputB}>
              Swap
            </button>
          </div>
        </form>
      </section>

      {loading && (
        <div className="compare-status">Loading comparison…</div>
      )}

      {!loading && error && (
        <div className="compare-error fr-alert fr-alert--error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && payload && (
        <>
          <section className="compare-summary">
            <h2>Fiscal Snapshot (Year 1)</h2>
            {comparisonSummary && (
              <div className="summary-grid">
                <div className="summary-card">
                  <h3>Deficit Impact</h3>
                  <p className="summary-delta">{formatDelta(comparisonSummary.deficitFirstYear.diff)}</p>
                  <div className="summary-split">
                    <span>A: {formatCurrency(comparisonSummary.deficitFirstYear.a)}</span>
                    <span>B: {formatCurrency(comparisonSummary.deficitFirstYear.b)}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <h3>Commitments (AE)</h3>
                  <p className="summary-delta">{formatDelta(comparisonSummary.commitmentsFirstYear.diff)}</p>
                  <div className="summary-split">
                    <span>A: {formatCurrency(comparisonSummary.commitmentsFirstYear.a)}</span>
                    <span>B: {formatCurrency(comparisonSummary.commitmentsFirstYear.b)}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <h3>Resolution Coverage</h3>
                  <p className="summary-delta">{(comparisonSummary.resolutionPct.diff * 100).toFixed(1)}%</p>
                  <div className="summary-split">
                    <span>A: {(comparisonSummary.resolutionPct.a * 100).toFixed(1)}%</span>
                    <span>B: {(comparisonSummary.resolutionPct.b * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="compare-waterfall">
            <h2>Largest Mission Deltas</h2>
            <table className="fr-table compare-table">
              <thead>
                <tr>
                  <th>Mission (COFOG major)</th>
                  <th>Scenario A vs B</th>
                </tr>
              </thead>
              <tbody>
                {topMasses.length === 0 && (
                  <tr>
                    <td colSpan={2} className="empty">No mission deltas recorded.</td>
                  </tr>
                )}
                {topMasses.map((entry) => (
                  <tr key={entry.massId}>
                    <td>
                      <strong>{payload.massLabels[entry.massId] ?? `Mass ${entry.massId}`}</strong>
                      <div className="mass-id">#{entry.massId}</div>
                    </td>
                    <td className={entry.deltaEur >= 0 ? 'delta-positive' : 'delta-negative'}>
                      {formatDelta(entry.deltaEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="compare-pieces">
            <h2>Top Piece Contributions</h2>
            <table className="fr-table compare-table">
              <thead>
                <tr>
                  <th>Piece</th>
                  <th>Mission</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {topPieces.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty">No piece-level contributions were detected.</td>
                  </tr>
                )}
                {topPieces.map((entry) => (
                  <tr key={`${entry.pieceId}-${entry.massId}`}>
                    <td>{payload.pieceLabels[entry.pieceId] ?? entry.pieceId}</td>
                    <td>{payload.massLabels[entry.massId] ?? entry.massId}</td>
                    <td className={entry.amountEur >= 0 ? 'delta-positive' : 'delta-negative'}>{formatDelta(entry.amountEur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="compare-macro">
            <h2>Macro Impacts</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <h3>GDP delta (Year 1)</h3>
                <p className="summary-delta">
                  {formatDelta(Number(first(payload.a.macro.deltaGDP)) - Number(first(payload.b.macro.deltaGDP)))}
                </p>
                <div className="summary-split">
                  <span>A: {formatCurrency(Number(first(payload.a.macro.deltaGDP)))}</span>
                  <span>B: {formatCurrency(Number(first(payload.b.macro.deltaGDP)))}</span>
                </div>
              </div>
              <div className="summary-card">
                <h3>Employment index (Year 1)</h3>
                <p className="summary-delta">
                  {(Number(first(payload.a.macro.deltaEmployment)) - Number(first(payload.b.macro.deltaEmployment))).toFixed(2)} pts
                </p>
                <div className="summary-split">
                  <span>A: {Number(first(payload.a.macro.deltaEmployment)).toFixed(2)}</span>
                  <span>B: {Number(first(payload.b.macro.deltaEmployment)).toFixed(2)}</span>
                </div>
              </div>
              <div className="summary-card">
                <h3>Automatic stabilisers</h3>
                <p className="summary-delta">
                  {formatDelta(Number(first(payload.a.macro.deltaDeficit)) - Number(first(payload.b.macro.deltaDeficit)))}
                </p>
                <div className="summary-split">
                  <span>A: {formatCurrency(Number(first(payload.a.macro.deltaDeficit)))}</span>
                  <span>B: {formatCurrency(Number(first(payload.b.macro.deltaDeficit)))}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="compare-remix">
            <h2>Remix Scenarios</h2>
            <div className="remix-grid">
              <div className="remix-card">
                <h3>Scenario A</h3>
                <p>{inputA || payload.a.scenarioId}</p>
                <Link className="fr-btn fr-btn--secondary" href={`/build?scenarioId=${encodeURIComponent(payload.a.scenarioId)}`}>
                  Open in Builder
                </Link>
              </div>
              <div className="remix-card">
                <h3>Scenario B</h3>
                <p>{inputB || payload.b.scenarioId}</p>
                <Link className="fr-btn fr-btn--secondary" href={`/build?scenarioId=${encodeURIComponent(payload.b.scenarioId)}`}>
                  Open in Builder
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .compare-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 4rem;
        }
        .compare-header h1 {
          margin-bottom: 0.75rem;
        }
        .compare-tagline {
          color: var(--text-mention-grey);
          max-width: 60ch;
        }
        .compare-controls {
          background: var(--background-alt-grey);
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        .compare-form {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: flex-end;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          flex: 1 1 260px;
          gap: 0.5rem;
        }
        .control-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .compare-status {
          font-style: italic;
        }
        .compare-error {
          margin-top: 1rem;
        }
        .compare-summary h2,
        .compare-waterfall h2,
        .compare-pieces h2,
        .compare-macro h2,
        .compare-remix h2 {
          margin-bottom: 1rem;
        }
        .summary-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .summary-card {
          border: 1px solid var(--border-default-grey);
          border-radius: 0.5rem;
          padding: 1rem;
          background: white;
        }
        .summary-card h3 {
          margin-bottom: 0.5rem;
        }
        .summary-delta {
          font-size: 1.4rem;
          margin: 0.25rem 0 0.75rem 0;
        }
        .summary-split {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          color: var(--text-mention-grey);
        }
        .compare-table {
          width: 100%;
        }
        .compare-table .delta-positive {
          color: var(--text-success-green);
          font-weight: 600;
        }
        .compare-table .delta-negative {
          color: var(--text-default-error);
          font-weight: 600;
        }
        .compare-table .empty {
          text-align: center;
          font-style: italic;
          color: var(--text-mention-grey);
        }
        .mass-id {
          font-size: 0.85rem;
          color: var(--text-mention-grey);
        }
        .compare-remix .remix-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .remix-card {
          border: 1px solid var(--border-default-grey);
          border-radius: 0.5rem;
          padding: 1rem;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .remix-card p {
          word-break: break-all;
          margin: 0;
        }
        @media (max-width: 720px) {
          .compare-form {
            flex-direction: column;
            align-items: stretch;
          }
          .control-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
