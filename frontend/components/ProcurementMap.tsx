"use client"

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false }) as any
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false }) as any
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false }) as any
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false }) as any

type Row = {
  supplier: { siren: string; name: string }
  amountEur: number
  cpv?: string | null
  procedureType?: string | null
  locationCode?: string | null
  sourceUrl?: string | null
  naf?: string | null
}

type GeoInfo = { lat: number; lon: number; nom: string }

const DEPT_CENTER: Record<string, [number, number]> = {
  '75': [48.8566, 2.3522],
  '69': [45.7640, 4.8357],
  '13': [43.2965, 5.3698],
  '33': [44.8378, -0.5792]
}

export function ProcurementMap({ rows, region }: { rows: Row[]; region?: string }) {
  const [geo, setGeo] = useState<Record<string, GeoInfo>>({})

  const locationCodes = useMemo(() => Array.from(new Set(rows.map(r => (r as any).locationCode).filter(Boolean) as string[])), [rows])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const out: Record<string, GeoInfo> = {}
      for (const code of locationCodes) {
        try {
          const q = `query($c: String!) { commune(code: $c) }`
          const js = await gqlRequest(q, { c: code })
          const g = js.commune
          if (g && g.centre && typeof g.centre.lat === 'number' && typeof g.centre.lon === 'number') {
            out[code] = { lat: g.centre.lat, lon: g.centre.lon, nom: g.nom || code }
          }
        } catch {}
      }
      if (!cancelled) setGeo(out)
    }
    if (locationCodes.length) load()
    return () => { cancelled = true }
  }, [locationCodes])

  const markers = useMemo(() => {
    return rows.map((r, idx) => {
      const code = (r as any).locationCode as string | undefined
      const g = code ? geo[code] : undefined
      if (!g) return null
          return (
            <Marker key={idx} position={[g.lat, g.lon]}>
              <Popup>
                <div>
                  <div><strong>{r.supplier?.name}</strong> ({r.supplier?.siren})</div>
                  <div>€ {r.amountEur.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  {code && <div>{g.nom} ({code})</div>}
                  {r.cpv && <div>CPV: {r.cpv}</div>}
                  {r.procedureType && <div>Procedure: {r.procedureType}</div>}
                  {r.naf && <div>NAF: {r.naf}</div>}
                  {(r as any).sourceUrl && <div><a href={(r as any).sourceUrl} target="_blank" rel="noreferrer">Source</a></div>}
                </div>
              </Popup>
            </Marker>
          )
    })
  }, [rows, geo])

  // Default center by department if provided; fallback to Paris
  const center: [number, number] = (region && DEPT_CENTER[region]) ? DEPT_CENTER[region] : [48.8566, 2.3522]

  return (
    <div className="card" style={{ height: 420 }}>
      <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: '100%', borderRadius: '.5rem', overflow: 'hidden' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers}
      </MapContainer>
    </div>
  )
}
