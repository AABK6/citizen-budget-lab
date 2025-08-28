import { useEffect, useState } from 'react';
import { graphqlFetch } from '../lib/graphqlFetch';

type Item = {
  supplier: { siren: string; name: string };
  amountEur: number;
  cpv?: string | null;
  procedureType?: string | null;
};

type Data = { procurement: Item[] };

const QUERY = `#graphql
query Procurement($year: Int!, $region: String!){
  procurement(year: $year, region: $region){
    supplier { siren name }
    amountEur
    cpv
    procedureType
  }
}`;

export default function Procurement() {
  const [year, setYear] = useState<number>(2024);
  const [region, setRegion] = useState<string>('75');
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlFetch<Data>({ query: QUERY, variables: { year, region } });
      setRows(data.procurement);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <h2>Procurement</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Year
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value || '0', 10))} style={{ marginLeft: 8 }} />
        </label>
        <label>
          Dépt/Region prefix
          <input value={region} onChange={(e) => setRegion(e.target.value)} style={{ marginLeft: 8, width: 80 }} />
        </label>
        <button onClick={load}>Refresh</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>SIREN</th>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'right' }}>Amount (EUR)</th>
            <th>CPV</th>
            <th>Procedure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => (
            <tr key={it.supplier.siren}>
              <td>{it.supplier.siren}</td>
              <td>{it.supplier.name}</td>
              <td style={{ textAlign: 'right' }}>{it.amountEur.toLocaleString('fr-FR')}</td>
              <td>{it.cpv || ''}</td>
              <td>{it.procedureType || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

