"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { YearPicker } from '@/components/YearPicker'
import { Select } from '@/components/Select'
import { DataTable } from '@/components/Table'
import dynamic from 'next/dynamic'
const ProcurementMap = dynamic(() => import('@/components/ProcurementMap').then(m => m.ProcurementMap), { ssr: false }) as any
import { downloadCSV } from '@/lib/csv'
import { StatCards } from '@/components/StatCards'
import { SourceLink } from '@/components/SourceLink'
import { useI18n } from '@/lib/i18n'

type Row = {
  supplier: { siren: string; name: string }
  amountEur: number
  cpv?: string | null
  procedureType?: string | null
  locationCode?: string | null
  sourceUrl?: string | null
}

const DEPARTMENTS = [
  { label: '75 — Paris', value: '75' },
  { label: '69 — Rhône', value: '69' },
  { label: '13 — Bouches-du-Rhône', value: '13' },
  { label: '33 — Gironde', value: '33' }
]

export default function ProcurementPage() {
  const { t } = useI18n()
  const [year, setYear] = useState(2024)
  const [region, setRegion] = useState('75')
  const [cpvPrefix, setCpvPrefix] = useState('')
  const [minAmount, setMinAmount] = useState<number | ''>('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'map'>('table')
  const [stats, setStats] = useState<{ total: number; suppliers: number; median: number }>({ total: 0, suppliers: 0, median: 0 })

  const columns = useMemo(() => [
    { key: 'supplier.name', label: t('proc.supplier') || 'Supplier' },
    { key: 'supplier.siren', label: 'SIREN' },
    { key: 'cpv', label: 'CPV' },
    { key: 'procedureType', label: t('proc.procedure') || 'Procedure' },
    { key: 'amountEur', label: t('proc.amount') || 'Amount (EUR)', format: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { key: 'sourceUrl', label: t('proc.source') || 'Source', render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">Open</a> : '' }
  ], [t])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const query = `
        query Proc($y: Int!, $r: String!, $cpv: String, $min: Float) {
          procurement(year: $y, region: $r, cpvPrefix: $cpv, minAmountEur: $min) {
            supplier { siren name }
            amountEur
            cpv
            procedureType
            locationCode
            sourceUrl
            naf
          }
        }
      `
      const data = await gqlRequest(query, {
        y: year,
        r: region,
        cpv: cpvPrefix || null,
        min: typeof minAmount === 'number' ? minAmount : null
      })
      const arr: Row[] = data.procurement
      setRows(arr)
      // Compute stats
      const total = arr.reduce((s, r) => s + (r.amountEur || 0), 0)
      const uniq = new Set(arr.map(r => r.supplier?.siren)).size
      const amounts = arr.map(r => r.amountEur || 0).sort((a, b) => a - b)
      const median = amounts.length ? (amounts.length % 2 ? amounts[(amounts.length - 1) / 2] : (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2) : 0
      setStats({ total, suppliers: uniq, median })
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="stack">
      <h2 className="fr-h2">{t('proc.title') || 'Who gets paid? (Procurement)'}</h2>
      <StatCards items={[
        { label: 'Total', value: stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' €' },
        { label: 'Suppliers', value: String(stats.suppliers) },
        { label: 'Median', value: stats.median.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' €' },
      ]} />
      <div style={{ marginTop: '.5rem' }}>
        <SourceLink ids={[ 'procurement_sample' ]} />
      </div>
      <div className="row gap">
        <YearPicker value={year} onChange={setYear} />
        <Select label={t('proc.department') || 'Department'} value={region} options={DEPARTMENTS} onChange={setRegion} />
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="cpv-input">{t('proc.cpv') || 'CPV prefix'}</label>
          <input id="cpv-input" className="fr-input" value={cpvPrefix} onChange={e => setCpvPrefix(e.target.value)} placeholder="e.g. 30" />
        </div>
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="min-input">{t('proc.min') || 'Min amount (EUR)'}</label>
          <input id="min-input" className="fr-input" type="number" value={minAmount} onChange={e => setMinAmount(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
        <button className="fr-btn" onClick={load}>{t('proc.apply') || 'Apply'}</button>
        <Select label={t('proc.view') || 'View'} value={view} onChange={v => setView(v as any)} options={[{ label: t('proc.table') || 'Table', value: 'table' }, { label: t('proc.map') || 'Map', value: 'map' }]} />
        <button className="fr-btn fr-btn--secondary" onClick={() => downloadCSV(`procurement_${region}_${year}.csv`, [
          { key: 'supplier.name', label: t('proc.supplier') || 'Supplier' },
          { key: 'supplier.siren', label: 'SIREN' },
          { key: 'cpv', label: 'CPV' },
          { key: 'procedureType', label: t('proc.procedure') || 'Procedure' },
          { key: 'amountEur', label: t('proc.amount') || 'Amount (EUR)' },
        ], rows as any)}>{t('proc.export') || 'Export CSV'}</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        view === 'table'
          ? <DataTable columns={columns} rows={rows} sortable pageSize={10} />
          : <ProcurementMap rows={rows as any} region={region} />
      )}
    </div>
  )
}
