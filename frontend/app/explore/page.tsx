"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { Select } from '@/components/Select'
import { YearPicker } from '@/components/YearPicker'
import { DataTable } from '@/components/Table'
import { AllocationChart } from '@/components/AllocationChart'
import { useI18n } from '@/lib/i18n'

type Lens = 'ADMIN' | 'COFOG'
type Basis = 'CP' | 'AE'

type MissionRow = { code: string; label: string; amountEur: number; share: number }

export default function ExplorePage() {
  const { t } = useI18n()
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
        if (!cancelled) setError(e?.message || t('error.generic'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [year, lens, basis])

  return (
    <div className="stack">
      <h2>{t('explore.title')}</h2>
      <div className="row gap">
        <YearPicker value={year} onChange={setYear} label={t('label.year')} />
        <Select label={t('explore.basis')} value={basis} onChange={v => setBasis(v as Basis)} options={[{ label: t('basis.cp'), value: 'CP' }, { label: t('basis.ae'), value: 'AE' }]} />
        <Select label={t('explore.lens')} value={lens} onChange={v => setLens(v as Lens)} options={[{ label: t('lens.admin'), value: 'ADMIN' }, { label: t('lens.cofog'), value: 'COFOG' }]} />
        <Select label={t('explore.chart')} value={chartType} onChange={v => setChartType(v as any)} options={[{ label: t('chart.sunburst'), value: 'sunburst' }, { label: t('chart.treemap'), value: 'treemap' }]} />
      </div>
      {loading && <p>{t('loading')}</p>}
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
