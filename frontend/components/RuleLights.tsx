"use client"

type Props = {
  eu3pct?: string[]
  eu60pct?: string[]
  netExpenditure?: string[]
  localBalance?: string[]
}

const light = (status?: string) => {
  const s = String(status || '').toLowerCase()
  if (s.includes('breach')) return '🔴'
  if (s.includes('above')) return '🟠'
  if (s.includes('ok') || s.includes('info')) return '🟢'
  return '⚪'
}

export function RuleLights({ eu3pct, eu60pct, netExpenditure, localBalance }: Props) {
  const e3 = eu3pct?.[0]
  const e60 = eu60pct?.[0]
  const ne = netExpenditure?.[0]
  const lb = localBalance?.[0]
  return (
    <div className="row gap" aria-label="Rule lights">
      <span title="EU 3% deficit ratio">{light(e3)} EU 3%</span>
      <span title="EU 60% debt ratio">{light(e60)} EU 60%</span>
      <span title="Net expenditure rule">{light(ne)} NER</span>
      <span title="Local balance (APUL)">{light(lb)} Local</span>
    </div>
  )
}

