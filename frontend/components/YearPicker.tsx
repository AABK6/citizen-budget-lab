"use client"

export function YearPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>Year</span>
      <input type="number" min={2000} max={2100} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}

