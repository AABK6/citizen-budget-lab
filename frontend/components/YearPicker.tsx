"use client"

export function YearPicker({ value, onChange, label = 'Year' }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={2000} max={2100} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}

