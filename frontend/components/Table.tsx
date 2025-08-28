"use client"

type Column<T> = {
  key: string
  label: string
  format?: (v: any, row?: T) => string
  render?: (v: any, row?: T) => React.ReactNode
}

function getValueByKeyPath(obj: any, keyPath: string) {
  return keyPath.split('.').reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj)
}

export function DataTable<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
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
    </div>
  )
}

