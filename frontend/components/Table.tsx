"use client"

import React from 'react'

type Column<T> = {
  key: string
  label: string
  format?: (v: any, row?: T) => string
  render?: (v: any, row?: T) => React.ReactNode
}

function getValueByKeyPath(obj: any, keyPath: string) {
  return keyPath.split('.').reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj)
}

export function DataTable<T>({ columns, rows, sortable = false, pageSize = 0 }: { columns: Column<T>[]; rows: T[]; sortable?: boolean; pageSize?: number }) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [page, setPage] = React.useState(1)

  const sorted = React.useMemo(() => {
    if (!sortable || !sortKey) return rows
    const copy = [...rows]
    copy.sort((a: any, b: any) => {
      const va = getValueByKeyPath(a, sortKey)
      const vb = getValueByKeyPath(b, sortKey)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      const sa = String(va)
      const sb = String(vb)
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })
    return copy
  }, [rows, sortKey, sortDir, sortable])

  const paged = React.useMemo(() => {
    if (!pageSize || pageSize <= 0) return sorted
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  function onHeaderClick(key: string) {
    if (!sortable) return
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1

  return (
    <div className="table-wrap">
      <table className="fr-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} onClick={() => onHeaderClick(c.key)} style={{ cursor: sortable ? 'pointer' : 'default' }}>
                {c.label}{sortable && sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((row, i) => (
            <tr key={i}>
              {columns.map(c => {
                const raw = getValueByKeyPath(row, c.key)
                if (c.render) return <td key={c.key}>{c.render(raw, row)}</td>
                if (c.format) return <td key={c.key}>{c.format(raw, row)}</td>
                return <td key={c.key}>{String(raw ?? '')}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {pageSize > 0 && (
        <div className="row gap" style={{ padding: '.5rem' }}>
          <button className="fr-btn fr-btn--sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Précédent</button>
          <span style={{ alignSelf: 'center' }}>Page {page} / {totalPages}</span>
          <button className="fr-btn fr-btn--sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Suivant</button>
        </div>
      )}
    </div>
  )
}
