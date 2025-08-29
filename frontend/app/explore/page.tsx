"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { Select } from '@/components/Select'
import { YearPicker } from '@/components/YearPicker'
import { DataTable } from '@/components/Table'
import { AllocationChart } from '@/components/AllocationChart'

type Lens = 'ADMIN' | 'COFOG'
type Basis = 'CP' | 'AE'

type MissionRow = { code: string; label: string; amountEur: number; share: number }

export default function ExplorePage() {
  const [year, setYear] = useState<number>(2026)
  const [lens, setLens] = useState<Lens>('ADMIN')
  const [basis, setBasis] = useState<Basis>('CP')
  const [rows, setRows] = useState<MissionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'sunburst' | 'treemap'>('sunburst')

  const columns = useMemo(() => [
    { key: 'code', label: 'Code' },
    { key: 'label', label: 'Label' },
    { key: 'amountEur', label: 'Amount (EUR)', format: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { key: 'share', label: 'Share', format: (v: number) => (v * 100).toFixed(2) + '%' }
  ], [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const query = `
          query Allocation($year: Int!, $basis: BasisEnum!, $lens: LensEnum!) {
            allocation(year: $year, basis: $basis, lens: $lens) {
              mission { code label amountEur share }
              cofog { code label amountEur share }
            }
          }
        `
        const data = await gqlRequest(query, { year, basis, lens })
        const list: MissionRow[] = lens === 'ADMIN' ? data.allocation.mission : (data.allocation.cofog || [])
        if (!cancelled) setRows(list)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [year, lens, basis])

  return (
    <div className="stack">
      <h2>Explore €1</h2>
      <div className="row gap">
        <YearPicker value={year} onChange={setYear} />
        <Select label="Basis" value={basis} onChange={v => setBasis(v as Basis)} options={[{ label: 'CP', value: 'CP' }, { label: 'AE', value: 'AE' }]} />
        <Select label="Lens" value={lens} onChange={v => setLens(v as Lens)} options={[{ label: 'Administrative', value: 'ADMIN' }, { label: 'COFOG', value: 'COFOG' }]} />
        <Select label="Chart" value={chartType} onChange={v => setChartType(v as any)} options={[{ label: 'Sunburst', value: 'sunburst' }, { label: 'Treemap', value: 'treemap' }]} />
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          <AllocationChart rows={rows} kind={chartType} />
          <DataTable columns={columns} rows={rows} />
        </>
      )}
      <details>
        <summary>Show GraphQL</summary>
        <pre className="code">allocation(year: {year}, basis: {basis}, lens: {lens})</pre>
      </details>
    </div>
  )
}

