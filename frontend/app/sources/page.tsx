"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { DataTable } from '@/components/Table'

type Row = {
  id: string
  datasetName: string
  url: string
  license: string
  refreshCadence: string
  vintage: string
}

export default function SourcesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const columns = useMemo(() => [
    { key: 'datasetName', label: 'Dataset' },
    { key: 'license', label: 'License' },
    { key: 'refreshCadence', label: 'Cadence' },
    { key: 'vintage', label: 'Vintage' },
    { key: 'url', label: 'Link', render: (v: string) => <a href={v} target="_blank" rel="noreferrer">Open</a> }
  ], [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const data = await gqlRequest(`{ sources { id datasetName url license refreshCadence vintage } }`)
        if (!cancelled) setRows(data.sources)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      r.datasetName.toLowerCase().includes(s) ||
      r.license.toLowerCase().includes(s) ||
      r.refreshCadence.toLowerCase().includes(s) ||
      r.vintage.toLowerCase().includes(s)
    )
  }, [rows, q])

  return (
    <div className="stack">
      <h2>Sources</h2>
      <label className="field">
        <span>Search</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter datasets..." />
      </label>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <DataTable columns={columns} rows={filtered} sortable pageSize={10} />}
    </div>
  )
}
