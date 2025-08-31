"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import dynamic from 'next/dynamic'

const EUCompareChart = dynamic(() => import('@/components/EUCompareChart').then(m => m.EUCompareChart), { ssr: false }) as any

type Row = { country: string; code: string; label: string; share: number }

export default function CompareEUPage() {
  const [data, setData] = useState<Row[]>([])
  const [year, setYear] = useState(2026)
  const [countries, setCountries] = useState('FR,DE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countryList = useMemo(() => countries.split(',').map(s => s.trim()).filter(Boolean), [countries])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const q = `query($y: Int!, $cs: [String!]!) { euCofogCompare(year: $y, countries: $cs) { country code label share } }`
      const js = await gqlRequest(q, { y: year, cs: countryList })
      setData(js.euCofogCompare)
    } catch (e: any) { setError(e?.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="stack">
      <h2>Compare EU — COFOG Shares</h2>
      <div className="row gap">
        <label className="field">
          <span>Year</span>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Countries (CSV)</span>
          <input value={countries} onChange={e => setCountries(e.target.value)} />
        </label>
        <button onClick={load}>Apply</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && data?.length > 0 && (
        <EUCompareChart data={data} />
      )}
    </div>
  )
}
