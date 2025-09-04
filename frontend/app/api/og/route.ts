import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scenarioId = searchParams.get('scenarioId') || 'demo'
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <text x="60" y="120" fill="#ffffff" font-size="56" font-family="Arial, Helvetica, sans-serif">Citizen Budget Lab</text>
  <text x="60" y="200" fill="#9ad" font-size="36" font-family="Arial, Helvetica, sans-serif">Scenario</text>
  <text x="60" y="250" fill="#fff" font-size="28" font-family="Arial, Helvetica, sans-serif">${scenarioId}</text>
  <text x="60" y="330" fill="#bbb" font-size="24" font-family="Arial, Helvetica, sans-serif">Share Card (stub)</text>
  <text x="60" y="370" fill="#bbb" font-size="20" font-family="Arial, Helvetica, sans-serif">Includes title, top deltas, deficit/debt, EU lights</text>
  <text x="60" y="410" fill="#bbb" font-size="20" font-family="Arial, Helvetica, sans-serif">Watermark "Specified X%" when partial</text>
  <rect x="60" y="450" width="1000" height="24" fill="#244"/>
  <rect x="60" y="450" width="420" height="24" fill="#48c"/>
  <text x="60" y="510" fill="#9ad" font-size="18" font-family="Arial, Helvetica, sans-serif">Methods v0 · Policy catalog v0</text>
  <text x="60" y="540" fill="#9ad" font-size="18" font-family="Arial, Helvetica, sans-serif">This is a stub renderer</text>
</svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
}

