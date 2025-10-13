"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { useI18n } from '@/lib/i18n'
import dynamic from 'next/dynamic'

const EUCompareChart = dynamic(() => import('@/components/EUCompareChart').then(m => m.EUCompareChart), { ssr: false }) as any

type Row = { country: string; code: string; label: string; share: number }

export default function CompareEUPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Row[]>([])
  const [year, setYear] = useState(2026)
  const [countries, setCountries] = useState('FR,DE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countryList = useMemo(() => countries.split(',').map(s => s.trim()).filter(Boolean), [countries])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = `query($y: Int!, $cs: [String!]!) { euCofogCompare(year: $y, countries: $cs) { country code label share } }`
      const js = await gqlRequest(q, { y: year, cs: countryList })
      setData(js.euCofogCompare)
    } catch (e: any) { setError(e?.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [countryList, year])

  useEffect(() => { load() }, [load])

  return (
    <div className="stack">
      <h2 className="fr-h2">{t('compare_eu.title')}</h2>
      <div className="row gap">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="eu-year">{t('compare_eu.year')}</label>
          <input id="eu-year" className="fr-input" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>
        <div className="fr-input-group" style={{ minWidth: 320 }}>
          <label className="fr-label" htmlFor="eu-countries">{t('compare_eu.countries')}</label>
          <input id="eu-countries" className="fr-input" value={countries} onChange={e => setCountries(e.target.value)} />
        </div>
        <button className="fr-btn" onClick={load}>{t('compare_eu.apply')}</button>
      </div>
      {loading && <p>{t('compare_eu.loading')}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && data?.length > 0 && (
        <EUCompareChart data={data} />
      )}
    </div>
  )
}
