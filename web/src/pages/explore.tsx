import { useEffect, useState } from 'react';
import { graphqlFetch } from '../lib/graphqlFetch';

type Mission = { code: string; label: string; amountEur: number; share: number };
type AllocationData = { allocation: { mission: Mission[]; cofog?: Mission[] } };

const QUERY = `#graphql
query Allocation($year: Int!, $basis: BasisEnum, $lens: LensEnum){
  allocation(year: $year, basis: $basis, lens: $lens){
    mission { code label amountEur share }
    cofog { code label amountEur share }
  }
}`;

export default function Explore() {
  const [year, setYear] = useState<number>(2026);
  const [lens, setLens] = useState<'ADMIN' | 'COFOG'>('ADMIN');
  const [rows, setRows] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlFetch<AllocationData>({
        query: QUERY,
        variables: { year, basis: 'CP', lens },
      });
      setRows(lens === 'ADMIN' ? data.allocation.mission : data.allocation.cofog || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, lens]);

  return (
    <div>
      <h2>Explore €1</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Year
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value || '0', 10))} style={{ marginLeft: 8 }} />
        </label>
        <label>
          Lens
          <select value={lens} onChange={(e) => setLens(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="ADMIN">Administrative</option>
            <option value="COFOG">COFOG</option>
          </select>
        </label>
        <button onClick={load}>Refresh</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Code</th>
            <th style={{ textAlign: 'left' }}>Label</th>
            <th style={{ textAlign: 'right' }}>Amount (EUR)</th>
            <th style={{ textAlign: 'right' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.code}>
              <td>{m.code}</td>
              <td>{m.label}</td>
              <td style={{ textAlign: 'right' }}>{m.amountEur.toLocaleString('fr-FR')}</td>
              <td style={{ textAlign: 'right' }}>{(m.share * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

