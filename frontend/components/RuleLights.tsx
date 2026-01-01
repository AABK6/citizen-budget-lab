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
    <div className="row gap" aria-label="Indicateurs des règles">
      <span title="UE 3 % déficit">{light(e3)} UE 3%</span>
      <span title="UE 60 % dette">{light(e60)} UE 60%</span>
      <span title="Règle de dépense nette">{light(ne)} RDN</span>
      <span title="Solde local (APUL)">{light(lb)} APUL</span>
    </div>
  )
}
