"use client"

import { useEffect, useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { Select } from '@/components/Select'
import { YearPicker } from '@/components/YearPicker'
import { DataTable } from '@/components/Table'
import { AllocationChart } from '@/components/AllocationChart'
import { StatCards } from '@/components/StatCards'
import { SourceLink } from '@/components/SourceLink'
import { downloadCSV } from '@/lib/csv'
import { useI18n } from '@/lib/i18n'

type Lens = 'ADMIN' | 'COFOG'
type Basis = 'CP' | 'AE'

type MissionRow = { code: string; label: string; amountEur: number; share: number }

export default function ExplorePage() {
  const { t } = useI18n()
  const [year, setYear] = useState<number>(2026)
  const [lens, setLens] = useState<Lens>('COFOG')
  const [basis, setBasis] = useState<Basis>('CP')
  const [rows, setRows] = useState<MissionRow[]>([])
  const [prevTotal, setPrevTotal] = useState<number | null>(null)
  const [excludeRD, setExcludeRD] = useState<boolean>(true)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [drillRows, setDrillRows] = useState<MissionRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'sunburst' | 'treemap' | 'stacked'>('sunburst')
  const displayRows = useMemo(() => {
    let sr: MissionRow[] = rows
    if (lens === 'ADMIN' && excludeRD) sr = sr.filter(r => r.code !== 'RD' && !/remboursements/i.test(r.label))
    if (lens === 'COFOG' && selectedCode) sr = sr.filter(r => r.code === selectedCode)
    return sr
  }, [rows, lens, excludeRD, selectedCode])
  const totalDisplayed = useMemo(() => displayRows.reduce((s, r) => s + (r.amountEur || 0), 0), [displayRows])
  const yoyText = useMemo(() => {
    if (!prevTotal) return t('stats.na')
    const pct = ((totalDisplayed - prevTotal) / prevTotal) * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }, [totalDisplayed, prevTotal, t])

  const columns = useMemo(() => [
    { key: 'code', label: 'Code' },
    { key: 'label', label: 'Libellé' },
    { key: 'amountEur', label: 'Montant (EUR)', format: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { key: 'share', label: 'Part', format: (v: number) => (v * 100).toFixed(2) + '%' }
  ], [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const query = `
          query Allocation($year: Int!, $basis: BasisEnum!, $lens: LensEnum!) {
            allocation(year: $year, basis: $basis, lens: $lens) {
              mission { code label amountEur share }
              cofog { code label amountEur share }
            }
          }
        `
        const data = await gqlRequest(query, { year, basis, lens })
        const list: MissionRow[] = lens === 'ADMIN' ? data.allocation.mission : (data.allocation.cofog || [])
        if (!cancelled) setRows(list)
        // Fetch year-1 for YoY
        try {
          const dataPrev = await gqlRequest(query, { year: year - 1, basis, lens })
          const listPrev: MissionRow[] = lens === 'ADMIN' ? dataPrev.allocation.mission : (dataPrev.allocation.cofog || [])
          const totalPrev = listPrev.reduce((s, r) => s + (r.amountEur || 0), 0)
          if (!cancelled) setPrevTotal(totalPrev)
        } catch {
          if (!cancelled) setPrevTotal(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('error.generic'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [year, lens, basis, t])

  return (
    <div className="stack">
      <h2 className="fr-h2">{t('explore.title')}</h2>
      <div className="row gap">
        <YearPicker value={year} onChange={setYear} label={t('label.year')} />
        <Select label={t('explore.basis')} value={basis} onChange={v => setBasis(v as Basis)} options={[{ label: t('basis.cp'), value: 'CP' }, { label: t('basis.ae'), value: 'AE' }]} />
        <Select label={t('explore.lens')} value={lens} onChange={v => setLens(v as Lens)} options={[{ label: t('lens.admin'), value: 'ADMIN' }, { label: t('lens.cofog'), value: 'COFOG' }]} />
        <span title="ADMIN : missions/programmes budgétaires de l'État. COFOG : classification fonctionnelle S13 (consolidé)." aria-label="Info lentille">ⓘ</span>
        <Select label={t('explore.chart')} value={chartType} onChange={v => setChartType(v as any)} options={[
          { label: t('chart.sunburst'), value: 'sunburst' },
          { label: t('chart.treemap'), value: 'treemap' },
          { label: t('chart.stacked'), value: 'stacked' },
        ]} />
        {lens === 'ADMIN' && (
          <fieldset className="fr-fieldset" aria-labelledby="rd-toggle-legend">
            <legend className="fr-fieldset__legend--regular" id="rd-toggle-legend">Options</legend>
            <div className="fr-checkbox-group">
              <input type="checkbox" id="exclude-rd" checked={excludeRD} onChange={e => setExcludeRD(e.target.checked)} />
              <label className="fr-label" htmlFor="exclude-rd" title="Remboursements/dégrèvements (TVA, taxes locales, crédits d'impôt). Réduisent les recettes nettes ; pas une dépense fonctionnelle.">Exclure RD</label>
            </div>
          </fieldset>
        )}
      </div>
      {loading && <p>{t('loading')}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          {/* Stat cards: Total, YoY, Source */}
          <StatCards
            items={[
              { label: t('stats.total'), value: totalDisplayed.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' €' },
              { label: t('stats.yoy'), value: yoyText },
            ]}
          />
          <div style={{ marginTop: '.5rem' }}>
            <SourceLink ids={[ 'state_budget_sample' ]} />
          </div>
          <AllocationChart
            rows={displayRows}
            kind={chartType}
            onSliceClick={async (code) => {
              if (lens === 'ADMIN') {
                try {
                  const q = "query($y:Int!,$b:BasisEnum!,$m:String!){ allocationProgramme(year:$y,basis:$b,missionCode:$m){ code label amountEur share } }"
                  const data = await gqlRequest(q, { y: year, b: basis, m: code })
                  setDrillRows(data.allocationProgramme)
                  setSelectedCode(code)
                } catch {}
              } else {
                // COFOG: try subfunctions for major code; fallback to filter by code
                const major = (code || '').padStart(2, '0').slice(0,2)
                try {
                  const q = "query($y:Int!,$c:String!,$m:String!){ cofogSubfunctions(year:$y,country:$c,major:$m){ code label amountEur share } }"
                  const data = await gqlRequest(q, { y: year, c: 'FR', m: major })
                  const subs = data.cofogSubfunctions as MissionRow[]
                  if (subs && subs.length) {
                    setDrillRows(subs)
                    setSelectedCode(major)
                  } else {
                    setSelectedCode(code || null)
                    setDrillRows(null)
                  }
                } catch {
                  setSelectedCode(code || null)
                  setDrillRows(null)
                }
              }
            }}
          />
          {drillRows && (
            <div className="row gap">
              <button className="fr-btn fr-btn--secondary" onClick={() => { setDrillRows(null); setSelectedCode(null) }}>Retour</button>
              <span>{lens === 'ADMIN' ? `Programmes de la mission ${selectedCode}` : `Sous-fonctions COFOG de ${selectedCode}`}</span>
            </div>
          )}
          {drillRows
            ? <DataTable columns={columns} rows={drillRows} />
            : <DataTable columns={columns} rows={displayRows} />}
        </>
      )}
    </div>
  )
}
