export type CSVCol = { key: string; label: string }

function get(obj: any, path: string) {
  return path.split('.').reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj)
}

export function toCSV(columns: CSVCol[], rows: any[]): string {
  const header = columns.map(c => JSON.stringify(c.label)).join(',')
  const data = rows.map(row => columns.map(c => {
    const v = get(row, c.key)
    if (v == null) return ''
    if (typeof v === 'number') return String(v)
    return JSON.stringify(String(v))
  }).join(',')).join('\n')
  return header + '\n' + data
}

export function downloadCSV(filename: string, columns: CSVCol[], rows: any[]): void {
  const csv = toCSV(columns, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
