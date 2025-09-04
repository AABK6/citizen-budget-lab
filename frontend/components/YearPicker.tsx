"use client"

export function YearPicker({ value, onChange, label = 'Year' }: { value: number; onChange: (v: number) => void; label?: string }) {
  const id = `year_${label.replace(/\W+/g, '').toLowerCase()}`
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor={id}>{label}</label>
      <input className="fr-input" id={id} type="number" min={2000} max={2100} value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  )
}
