"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { YearPicker } from '@/components/YearPicker'
import { Select } from '@/components/Select'
import { DataTable } from '@/components/Table'

type Row = {
  supplier: { siren: string; name: string }
  amountEur: number
  cpv?: string | null
  procedureType?: string | null
}

const DEPARTMENTS = [
  { label: '75 — Paris', value: '75' },
  { label: '69 — Rhône', value: '69' },
  { label: '13 — Bouches-du-Rhône', value: '13' },
  { label: '33 — Gironde', value: '33' }
]

export default function ProcurementPage() {
  const [year, setYear] = useState(2024)
  const [region, setRegion] = useState('75')
  const [cpvPrefix, setCpvPrefix] = useState('')
  const [minAmount, setMinAmount] = useState<number | ''>('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const columns = useMemo(() => [
    { key: 'supplier.name', label: 'Supplier' },
    { key: 'supplier.siren', label: 'SIREN' },
    { key: 'cpv', label: 'CPV' },
    { key: 'procedureType', label: 'Procedure' },
    { key: 'amountEur', label: 'Amount (EUR)', format: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }) }
  ], [])

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
          }
        }
      `
      const data = await gqlRequest(query, {
        y: year,
        r: region,
        cpv: cpvPrefix || null,
        min: typeof minAmount === 'number' ? minAmount : null
      })
      setRows(data.procurement)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="stack">
      <h2>Who gets paid? (Procurement)</h2>
      <div className="row gap">
        <YearPicker value={year} onChange={setYear} />
        <Select label="Department" value={region} options={DEPARTMENTS} onChange={setRegion} />
        <label className="field">
          <span>CPV prefix</span>
          <input value={cpvPrefix} onChange={e => setCpvPrefix(e.target.value)} placeholder="e.g. 30" />
        </label>
        <label className="field">
          <span>Min amount (EUR)</span>
          <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value === '' ? '' : Number(e.target.value))} />
        </label>
        <button onClick={load}>Apply</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <DataTable columns={columns} rows={rows} />}
    </div>
  )
}

