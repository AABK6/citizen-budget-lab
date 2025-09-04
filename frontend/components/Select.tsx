"use client"

type Opt = { label: string; value: string }

export function Select({ label, value, options, onChange }: { label: string; value: string; options: Opt[]; onChange: (v: string) => void }) {
  const id = `sel_${label.replace(/\W+/g, '').toLowerCase()}`
  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor={id}>{label}</label>
      <select className="fr-select" id={id} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
