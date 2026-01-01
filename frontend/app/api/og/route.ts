import { NextRequest } from 'next/server'
import { resolveGraphqlUrl } from '@/lib/backend'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId') || 'demo'
  const endpoint = resolveGraphqlUrl()
  const gql = `query($id:ID!){ shareCard(scenarioId:$id){ title deficit debtDeltaPct highlight resolutionPct masses eu3 eu60 } }`

  let title = `Scénario ${scenarioId.substring(0,8)}`
  let deficit = 0
  let debtPct = 0
  let highlight = ''
  let resolutionPct = 0
  let masses: Record<string, { base: number; scen: number }> = {}
  let eu3 = 'info'
  let eu60 = 'info'
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { id: scenarioId } })
    })
    const js = await res.json()
    const s = js?.data?.shareCard
    if (s) {
      title = s.title
      deficit = s.deficit
      debtPct = s.debtDeltaPct
      highlight = s.highlight
      resolutionPct = s.resolutionPct || 0
      masses = s.masses || {}
      eu3 = s.eu3 || 'info'
      eu60 = s.eu60 || 'info'
    }
  } catch {}

  const entries = Object.entries(masses).slice(0, 5)
  const rows = entries.map(([id, v], i) => {
    const y = 220 + i * 60
    const baseW = Math.max(0, Math.min(900, Math.round((v.base || 0) * 900)))
    const scenW = Math.max(0, Math.min(900, Math.round((v.scen || 0) * 900)))
    return `
      <text x=\"60\" y=\"${y - 10}\" fill=\"#9ad\" font-size=\"18\" font-family=\"Arial, Helvetica, sans-serif\">${id}</text>
      <rect x=\"120\" y=\"${y}\" width=\"${baseW}\" height=\"12\" fill=\"#274b7a\" />
      <rect x=\"120\" y=\"${y + 16}\" width=\"${scenW}\" height=\"12\" fill=\"#46a0ff\" />
    `
  }).join('')

  const deficitText = `${deficit >= 0 ? '+' : ''}${(deficit/1e9).toFixed(2)} Md€`
  const highlightText = highlight || '-'
  const wm = resolutionPct < 0.999 ? `
    <text x=\"600\" y=\"560\" text-anchor=\"middle\" fill=\"rgba(255,255,255,0.08)\" font-size=\"88\" font-family=\"Arial\" transform=\"rotate(-15,600,560)\">Financé ${(resolutionPct*100).toFixed(0)}%</text>
  ` : ''
  const eu3Color = eu3 === 'ok' ? '#23c552' : '#ff5c5c'
  const eu60Color = eu60 === 'info' ? '#f0c000' : (eu60 === 'above' ? '#ff5c5c' : '#23c552')

  const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"630\">
  <defs>
    <linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0%\" stop-color=\"#234\"/><stop offset=\"100%\" stop-color=\"#48c\"/></linearGradient>
  </defs>
  <rect width=\"1200\" height=\"630\" fill=\"#0a0a0a\"/>
  <text x=\"60\" y=\"100\" fill=\"#ffffff\" font-size=\"50\" font-family=\"Arial, Helvetica, sans-serif\">${title}</text>
  <circle cx=\"1080\" cy=\"70\" r=\"14\" fill=\"${eu3Color}\" />
  <text x=\"1100\" y=\"76\" fill=\"#9ad\" font-size=\"16\" font-family=\"Arial\">3%</text>
  <circle cx=\"1080\" cy=\"110\" r=\"14\" fill=\"${eu60Color}\" />
  <text x=\"1100\" y=\"116\" fill=\"#9ad\" font-size=\"16\" font-family=\"Arial\">60%</text>
  <text x=\"60\" y=\"150\" fill=\"#9ad\" font-size=\"22\" font-family=\"Arial, Helvetica, sans-serif\">Déficit (A1)</text>
  <text x=\"60\" y=\"180\" fill=\"#fff\" font-size=\"34\" font-family=\"Arial, Helvetica, sans-serif\">${deficitText}</text>
  <text x=\"300\" y=\"150\" fill=\"#9ad\" font-size=\"22\" font-family=\"Arial, Helvetica, sans-serif\">Δ dette (H)</text>
  <text x=\"300\" y=\"180\" fill=\"#fff\" font-size=\"28\" font-family=\"Arial, Helvetica, sans-serif\">${debtPct.toFixed(2)} pts</text>
  <text x=\"60\" y=\"210\" fill=\"#9ad\" font-size=\"22\" font-family=\"Arial, Helvetica, sans-serif\">Barres jumelles (masses principales)</text>
  ${rows}
  <text x=\"800\" y=\"210\" fill=\"#9ad\" font-size=\"22\" font-family=\"Arial, Helvetica, sans-serif\">Point saillant</text>
  <text x=\"800\" y=\"240\" fill=\"#fff\" font-size=\"20\" font-family=\"Arial, Helvetica, sans-serif\">${highlightText}</text>
  ${wm}
  <text x=\"60\" y=\"600\" fill=\"#9ad\" font-size=\"16\" font-family=\"Arial, Helvetica, sans-serif\">Méthodes v0 · Catalogue des politiques v0</text>
  <text x=\"960\" y=\"600\" fill=\"#9ad\" font-size=\"16\" font-family=\"Arial, Helvetica, sans-serif\">citizenbudgetlab.org</text>
</svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
}
