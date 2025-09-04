"use client"

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { gqlRequest } from '@/lib/graphql'

type Piece = {
  id: string
  label?: string
  type: 'expenditure' | 'revenue'
  amountEur?: number | null
  share?: number | null
  cofogMajors?: string[]
  locked?: boolean
}

type Lever = { id: string; family: string; label: string; paramsSchema?: Record<string, any> }

function b64Yaml(yaml: string): string {
  if (typeof window === 'undefined') return ''
  // Encode without line breaks
  return btoa(unescape(encodeURIComponent(yaml)))
}

function yamlQuote(s: string): string {
  // Minimal quoting for YAML safety
  if (/^[A-Za-z0-9_.-]+$/.test(s)) return s
  return JSON.stringify(s)
}

export default function BuildPage() {
  const { t } = useI18n()
  const [year, setYear] = useState<number>(2026)
  const [pieces, setPieces] = useState<Piece[]>([])
  const [baseline, setBaseline] = useState<{ depensesTotal: number; recettesTotal: number } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [deltas, setDeltas] = useState<Record<string, number>>({}) // pieceId -> delta % (signed)
  const [targets, setTargets] = useState<Record<string, number>>({}) // pieceId -> target % (signed)
  const [massTargets, setMassTargets] = useState<Record<string, number>>({}) // major -> target amount (EUR)
  const [massChanges, setMassChanges] = useState<Record<string, number>>({}) // major -> change amount (EUR)
  const [levers, setLevers] = useState<Lever[]>([])
  const [selectedLevers, setSelectedLevers] = useState<string[]>([])
  const [running, setRunning] = useState<boolean>(false)
  const [result, setResult] = useState<{
    id?: string
    deficitY0: number
    eu3: string
    eu60: string
    resolutionPct: number
    distanceScore?: number
    resolutionByMass?: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[]
    masses?: Record<string, { base: number; scen: number }>
  } | null>(null)
  const [conflictNudge, setConflictNudge] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'masses' | 'pieces'>('masses')
  const [saveTitle, setSaveTitle] = useState<string>('')

  // COFOG major labels (client-side)
  const COFOG_LABELS: Record<string, string> = {
    '01': 'General public services',
    '02': 'Defense',
    '03': 'Public order & safety',
    '04': 'Economic affairs',
    '05': 'Environmental protection',
    '06': 'Housing & community amenities',
    '07': 'Health',
    '08': 'Recreation, culture, religion',
    '09': 'Education',
    '10': 'Social protection',
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const q = `
          query($y:Int!){
            legoPieces(year:$y){ id label type amountEur share cofogMajors locked }
            legoBaseline(year:$y){ depensesTotal recettesTotal }
            policyLevers { id family label paramsSchema }
          }
        `
        const data = await gqlRequest(q, { y: year })
        if (cancelled) return
        setPieces(data.legoPieces)
        setBaseline(data.legoBaseline)
        setLevers(data.policyLevers)
        // Keep existing deltas/targets if same ids, else prune
        setDeltas(d => Object.fromEntries(Object.entries(d).filter(([k]) => data.legoPieces.some((p: Piece) => p.id === k))))
        setTargets(t => Object.fromEntries(Object.entries(t).filter(([k]) => data.legoPieces.some((p: Piece) => p.id === k))))
        // Restore from permalink if present
        try {
          const params = new URLSearchParams(window.location.search)
          const dslParam = params.get('dsl')
          if (dslParam) {
            const parsed = parseDsl(dslParam, data.legoPieces)
            if (parsed) {
              setTargets(parsed.targets)
              setDeltas(parsed.deltas)
              setMassTargets(parsed.massTargets)
              setMassChanges(parsed.massChanges)
              setSelectedLevers(parsed.levers)
            }
          }
        } catch {}
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [year])

  const dsl = useMemo(() => {
    // Build YAML DSL with piece.* actions and selected lever IDs
    const actions: string[] = []
    // Targets first (role: target)
    Object.entries(targets).forEach(([pid, val]) => {
      const v = Number(val)
      if (!isFinite(v) || Math.abs(v) < 0.01) return
      const op = v < 0 ? 'decrease' : 'increase'
      const mag = Math.abs(v).toFixed(2)
      actions.push([
        `- id: t_${pid}`,
        `  target: piece.${pid}`,
        `  op: ${op}`,
        `  delta_pct: ${mag}`,
        `  role: target`
      ].join('\n'))
    })
    // Mass targets (EUR)
    Object.entries(massTargets).forEach(([major, val]) => {
      const v = Number(val)
      if (!isFinite(v) || Math.abs(v) < 1) return
      const op = v < 0 ? 'decrease' : 'increase'
      const mag = Math.abs(v).toFixed(0)
      actions.push([
        `- id: t_mass_${major}`,
        `  target: cofog.${major}`,
        `  op: ${op}`,
        `  amount_eur: ${mag}`,
        `  role: target`
      ].join('\\n'))
    })
    // Specified changes
    Object.entries(deltas).forEach(([pid, val]) => {
      const v = Number(val)
      if (!isFinite(v) || Math.abs(v) < 0.01) return
      const op = v < 0 ? 'decrease' : 'increase'
      const mag = Math.abs(v).toFixed(2)
      actions.push([
        `- id: c_${pid}`,
        `  target: piece.${pid}`,
        `  op: ${op}`,
        `  delta_pct: ${mag}`
      ].join('\n'))
    })
    // Mass changes (EUR)
    Object.entries(massChanges).forEach(([major, val]) => {
      const v = Number(val)
      if (!isFinite(v) || Math.abs(v) < 1) return
      const op = v < 0 ? 'decrease' : 'increase'
      const mag = Math.abs(v).toFixed(0)
      actions.push([
        `- id: c_mass_${major}`,
        `  target: cofog.${major}`,
        `  op: ${op}`,
        `  amount_eur: ${mag}`
      ].join('\\n'))
    })
    // Lever IDs (for conflicts/attribution only; include neutral target/op to satisfy schema)
    selectedLevers.forEach(id => {
      const lev = levers.find(l => l.id === id)
      const fam = lev?.family?.toUpperCase() || 'OTHER'
      const tgt = defaultTargetForFamily(fam)
      actions.push([
        `- id: ${yamlQuote(id)}`,
        `  target: ${tgt}`,
        `  op: increase`,
        `  amount_eur: 0`
      ].join('\n'))
    })
    const yaml = `version: 0.1\n` +
      `baseline_year: ${year}\n` +
      `assumptions:\n  horizon_years: 3\n` +
      `actions:\n` + (actions.length ? actions.map(a => a).join('\n') + '\n' : '')
    return yaml
  }, [year, deltas, targets, massTargets, massChanges, selectedLevers])

  const dslB64 = useMemo(() => (typeof window !== 'undefined' ? b64Yaml(dsl) : ''), [dsl])

  async function runScenario() {
    setRunning(true)
    setResult(null)
    setError(null)
    setConflictNudge(null)
    try {
      const q = `
        mutation Run($dsl:String!){
          runScenario(input:{ dsl:$dsl }){
            id
            accounting{ deficitPath debtPath }
            compliance{ eu3pct eu60pct }
            resolution{ overallPct byMass{ massId targetDeltaEur specifiedDeltaEur } }
          }
        }
      `
      const data = await gqlRequest(q, { dsl: dslB64 })
      const def = data.runScenario.accounting.deficitPath
      const eu3 = data.runScenario.compliance.eu3pct?.[0] || 'info'
      const eu60 = data.runScenario.compliance.eu60pct?.[0] || 'info'
      const resPct = Number(data.runScenario.resolution?.overallPct || 0)
      const byMass = (data.runScenario.resolution?.byMass || []).map((e:any)=>({ massId: String(e.massId), targetDeltaEur: Number(e.targetDeltaEur||0), specifiedDeltaEur: Number(e.specifiedDeltaEur||0)}))
      let masses: Record<string, { base: number; scen: number }> | undefined = undefined
      try {
        const sid = data.runScenario.id
        const sq = `query($id:ID!){ shareCard(scenarioId:$id){ masses resolutionPct eu3 eu60 } }`
        const sd = await gqlRequest(sq, { id: sid })
        masses = sd.shareCard?.masses
      } catch {}
      // Optionally compute distance
      let distanceScore: number | undefined = undefined
      try {
        const dq = `query($y:Int!,$dsl:String!){ legoDistance(year:$y, dsl:$dsl){ score } }`
        const dd = await gqlRequest(dq, { y: year, dsl: dslB64 })
        distanceScore = Number(dd.legoDistance?.score || 0)
      } catch {}
      setResult({ id: data.runScenario.id, deficitY0: Number(def?.[0] || 0), eu3, eu60, resolutionPct: resPct, distanceScore, resolutionByMass: byMass, masses })
      // Sync permalink
      try {
        const url = new URL(window.location.href)
        url.searchParams.set('dsl', dslB64)
        window.history.replaceState({}, '', url.toString())
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to run scenario')
      if ((e?.message||'').toLowerCase().includes('conflict')) {
        setConflictNudge('Some selected reforms conflict; adjust your selection or parameters.')
      }
    } finally {
      setRunning(false)
    }
  }

  function updateDelta(id: string, v: number) {
    setDeltas({ ...deltas, [id]: v })
  }
  function updateTarget(id: string, v: number) {
    setTargets({ ...targets, [id]: v })
  }
  function toggleLever(id: string) {
    setSelectedLevers(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  }

  const exp = pieces.filter(p => p.type !== 'revenue')
  const rev = pieces.filter(p => p.type === 'revenue')
  const massList = Object.keys(COFOG_LABELS)
  const massBaseAmounts = useMemo(() => computeMassBase(pieces), [pieces])

  return (
    <div className="stack" style={{ gap: '1.25rem' }}>
      <BuildHud
        estExp={estimateDeltaExp(exp, deltas)}
        estRev={estimateDeltaRev(rev, deltas)}
        result={result}
        onRun={runScenario}
        running={running}
        onReset={()=>{ setDeltas({}); setTargets({}); setMassTargets({}); setMassChanges({}); setSelectedLevers([]); setResult(null); }}
        t={t}
      />
      <h2 className="fr-h2">{t('build.title') || 'Build — Workshop'}</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-8">
          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__title">Pieces — Dials</div>
              <div className="fr-card__desc">
                <div className="fr-grid-row fr-grid-row--gutters" style={{ marginBottom: '.5rem' }}>
                  <div className="fr-col-6">
                    <label className="fr-label" htmlFor="year">Year</label>
                    <input id="year" className="fr-input" type="number" value={year} onChange={e => setYear(parseInt(e.target.value || '2026', 10))} />
                  </div>
                  <div className="fr-col-6" />
                </div>
                {loading && <p>{t('loading') || 'Loading…'}</p>}
                {error && <p className="fr-error-text">{t('error.generic') || error}</p>}
                {!loading && !error && (
                  <div className="fr-tabs">
                    <ul className="fr-tabs__list" role="tablist">
                      <li role="presentation">
                        <button id="tab-masses" className={activeTab==='masses' ? 'fr-tabs__tab fr-tabs__tab--selected' : 'fr-tabs__tab'} tabIndex={0} aria-selected={activeTab==='masses'} aria-controls="panel-masses" role="tab" onClick={()=> setActiveTab('masses')}>{t('build.mass_dials') || 'Mass dials'}</button>
                      </li>
                      <li role="presentation">
                        <button id="tab-pieces" className={activeTab==='pieces' ? 'fr-tabs__tab fr-tabs__tab--selected' : 'fr-tabs__tab'} tabIndex={0} aria-selected={activeTab==='pieces'} aria-controls="panel-pieces" role="tab" onClick={()=> setActiveTab('pieces')}>{t('build.piece_dials') || 'Piece dials'}</button>
                      </li>
                    </ul>
                    <div id="panel-masses" className={activeTab==='masses' ? 'fr-tabs__panel fr-tabs__panel--selected' : 'fr-tabs__panel'} role="tabpanel" aria-labelledby="tab-masses">
                      <MassList masses={massList} labels={COFOG_LABELS} baseAmounts={massBaseAmounts} targets={massTargets} changes={massChanges} onTarget={(m,v)=> setMassTargets({ ...massTargets, [m]: v })} onChangeAmt={(m,v)=> setMassChanges({ ...massChanges, [m]: v })} resolution={result?.resolutionByMass} />
                    </div>
                    <div id="panel-pieces" className={activeTab==='pieces' ? 'fr-tabs__panel fr-tabs__panel--selected' : 'fr-tabs__panel'} role="tabpanel" aria-labelledby="tab-pieces">
                      <div className="fr-grid-row fr-grid-row--gutters">
                        <div className="fr-col-12 fr-col-md-6">
                          <h4 className="fr-h4">{t('build.expenditures') || 'Expenditures'}</h4>
                          <PieceList pieces={exp} deltas={deltas} targets={targets} onDelta={updateDelta} onTarget={updateTarget} t={t} />
                        </div>
                        <div className="fr-col-12 fr-col-md-6">
                          <h4 className="fr-h4">{t('build.revenues') || 'Revenues'}</h4>
                          <PieceList pieces={rev} deltas={deltas} targets={targets} onDelta={updateDelta} onTarget={updateTarget} t={t} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card fr-card--no-arrow" style={{ marginBottom: '1rem' }}>
            <div className="fr-card__body">
              <div className="fr-card__title">{t('build.scoreboard') || 'Scoreboard'}</div>
              <div className="fr-card__desc">
                <dl className="fr-description-list">
                  <div className="fr-description-list__row">
                    <dt className="fr-description-list__term">{t('build.delta_exp') || 'ΔExpenditures (est.)'}</dt>
                    <dd className="fr-description-list__definition">{estimateDeltaExp(exp, deltas).toLocaleString(undefined, { maximumFractionDigits: 0 })} €</dd>
                  </div>
                  <div className="fr-description-list__row">
                    <dt className="fr-description-list__term">{t('build.delta_rev') || 'ΔRevenues (est.)'}</dt>
                    <dd className="fr-description-list__definition">{estimateDeltaRev(rev, deltas).toLocaleString(undefined, { maximumFractionDigits: 0 })} €</dd>
                  </div>
                  {result && (
                    <>
                      <div className="fr-description-list__row">
                        <dt className="fr-description-list__term">{t('score.deficit_y0') || 'Deficit (y0)'}</dt>
                        <dd className="fr-description-list__definition">{result.deficitY0.toLocaleString(undefined, { maximumFractionDigits: 0 })} €</dd>
                      </div>
                      <div className="fr-description-list__row">
                        <dt className="fr-description-list__term">EU 3%</dt>
                        <dd className="fr-description-list__definition">{result.eu3}</dd>
                      </div>
                      <div className="fr-description-list__row">
                        <dt className="fr-description-list__term">EU 60%</dt>
                        <dd className="fr-description-list__definition">{result.eu60}</dd>
                      </div>
                      <div className="fr-description-list__row">
                        <dt className="fr-description-list__term">{t('build.resolution') || 'Resolution'}</dt>
                        <dd className="fr-description-list__definition">{(100 * result.resolutionPct).toFixed(1)}%</dd>
                      </div>
                      <div className="fr-description-list__row">
                        <dt className="fr-description-list__term" aria-label={t('build.resolution_meter') || 'Resolution meter'}>&nbsp;</dt>
                        <dd className="fr-description-list__definition" style={{width:'100%'}}><div className="fr-progress" aria-label="Resolution"><div className="fr-progress__track"><div className="fr-progress__bar" style={{ width: `${Math.min(100, 100*result.resolutionPct)}%` }} aria-hidden="true"></div></div></div></dd>
                      </div>
                      {result.distanceScore !== undefined && (
                        <div className="fr-description-list__row">
                          <dt className="fr-description-list__term">{t('build.distance') || 'Distance'}</dt>
                          <dd className="fr-description-list__definition">{(100 * (1 - result.distanceScore)).toFixed(1)}%</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
                <div className="fr-btns-group fr-btns-group--inline">
                  <button className="fr-btn" onClick={runScenario} disabled={running}>{t('buttons.run') || 'Run'}</button>
                  <button className="fr-btn fr-btn--secondary" onClick={() => { setDeltas({}); setTargets({}); setMassTargets({}); setMassChanges({}); setSelectedLevers([]); setResult(null); }}>{t('buttons.reset') || 'Reset'}</button>
                </div>
                {conflictNudge && <p className="fr-alert fr-alert--warning" role="alert">{conflictNudge}</p>}
              </div>
            </div>
          </div>

          <div className="fr-card fr-card--no-arrow" style={{ marginBottom: '1rem' }}>
            <div className="fr-card__body">
              <div className="fr-card__title">Policy Workshop</div>
              <div className="fr-card__desc">
                <p className="fr-text--sm">Select levers and adjust parameters. Apply as Target or Change on a mass.</p>
                <LeverWorkshop levers={levers} masses={massList} labels={COFOG_LABELS} baseAmounts={massBaseAmounts} onApply={(mass, amount, asTarget)=>{
                  if (asTarget) setMassTargets({ ...massTargets, [mass]: (massTargets[mass]||0) + amount })
                  else setMassChanges({ ...massChanges, [mass]: (massChanges[mass]||0) + amount })
                }} onToggle={toggleLever} selected={selectedLevers} />
              </div>
            </div>
          </div>

          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__title">Scenario DSL</div>
              <div className="fr-card__desc">
                <pre style={{ whiteSpace: 'pre-wrap' }}><code>{dsl}</code></pre>
              </div>
            </div>
          </div>

          {result?.id && (
          <div className="fr-card fr-card--no-arrow" style={{ marginTop: '1rem' }}>
            <div className="fr-card__body">
              <div className="fr-card__title">{t('scenario.save_title') || 'Scenario title'}</div>
              <div className="fr-card__desc">
                <div className="fr-input-group">
                  <input id="save_title" className="fr-input" value={saveTitle} onChange={e=> setSaveTitle(e.target.value)} placeholder="My plan" />
                </div>
                <div className="fr-btns-group fr-btns-group--inline" style={{ marginTop: '.25rem' }}>
                  <button className="fr-btn fr-btn--secondary" onClick={async()=>{
                    try {
                      const q = `mutation($id:ID!,$title:String){ saveScenario(id:$id, title:$title) }`
                      await gqlRequest(q, { id: result.id, title: saveTitle || 'My plan' })
                    } catch {}
                  }}>{t('scenario.save') || 'Save'}</button>
                  <a className="fr-link" href={`/api/og?scenarioId=${result.id}`} target="_blank" rel="noopener noreferrer">OG preview</a>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
      {result?.masses && <TwinBars masses={result.masses} labels={COFOG_LABELS} resolution={result.resolutionByMass} />}
    </div>
  )
}

function PieceList({ pieces, deltas, targets, onDelta, onTarget, t }: {
  pieces: Piece[]
  deltas: Record<string, number>
  targets: Record<string, number>
  onDelta: (id: string, v: number) => void
  onTarget: (id: string, v: number) => void
  t: (k: string)=>string
}) {
  if (!pieces.length) return <p className="fr-text--sm">No pieces</p>
  return (
    <div className="stack" style={{ gap: '.75rem' }}>
      {pieces.map(p => (
        <div key={p.id} className="fr-input-group" style={{ padding: '.25rem .5rem', border: '1px solid var(--border-default-grey)', borderRadius: '6px' }}>
          <label className="fr-label" htmlFor={`delta_${p.id}`}>{p.label || p.id}</label>
          {p.locked && <span className="fr-badge fr-badge--sm" aria-label="locked">{t('piece.locked') || 'Locked'}</span>}
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-sm-6">
              <div className="fr-range">
                <input id={`delta_${p.id}`} type="range" min={-50} max={50} step={1} value={deltas[p.id] ?? 0} onChange={e => onDelta(p.id, Number((e.target as HTMLInputElement).value))} disabled={!!p.locked} aria-label={`change ${p.id}`} />
              </div>
              <div className="fr-input-group" style={{ marginTop: '.25rem' }}>
                <input className="fr-input" style={{ maxWidth: '8rem' }} type="number" min={-100} max={100} step={0.5} value={deltas[p.id] ?? 0} onChange={e => onDelta(p.id, Number(e.target.value))} disabled={!!p.locked} aria-label={`change number ${p.id}`} /> <span style={{ marginLeft: '.25rem' }}>%</span>
              </div>
            </div>
            <div className="fr-col-12 fr-col-sm-6">
              <label className="fr-label" htmlFor={`target_${p.id}`}>{t('labels.target_pct') || 'Target (role)'}</label>
              <div className="fr-input-group">
                <input id={`target_${p.id}`} className="fr-input" style={{ maxWidth: '8rem' }} type="number" min={-100} max={100} step={0.5} value={targets[p.id] ?? 0} onChange={e => onTarget(p.id, Number(e.target.value))} disabled={!!p.locked} aria-label={`target percent ${p.id}`} /> <span style={{ marginLeft: '.25rem' }}>%</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function estimateDeltaExp(pieces: Piece[], deltas: Record<string, number>): number {
  return pieces.reduce((sum, p) => {
    const base = Number(p.amountEur || 0)
    const pct = Number(deltas[p.id] || 0)
    if (!isFinite(base) || !isFinite(pct)) return sum
    return sum + (pct / 100.0) * base
  }, 0)
}

function estimateDeltaRev(pieces: Piece[], deltas: Record<string, number>): number {
  return -estimateDeltaExp(pieces, deltas) // sign: revenue increases reduce deficit
}

function defaultTargetForFamily(fam: string): string {
  switch (fam) {
    case 'DEFENSE': return 'mission.defense'
    case 'PENSIONS': return 'mission.pensions'
    case 'STAFFING': return 'mission.administration'
    case 'HEALTH': return 'mission.health'
    case 'TAXES': return 'mission.revenue'
    default: return 'mission.general'
  }
}

function BuildHud({ estExp, estRev, result, onRun, running, onReset, t }: { estExp: number, estRev: number, result: any, onRun: ()=>void, running: boolean, onReset: ()=>void, t: (k: string)=>string }) {
  const netEst = (estExp + estRev) || 0
  const eu3 = result?.eu3 || 'info'
  const eu60 = result?.eu60 || 'info'
  const resPct = typeof result?.resolutionPct === 'number' ? result.resolutionPct : 0
  function badgeTone(s: string) {
    const v = String(s).toLowerCase()
    if (v === 'ok' || v === 'info') return '#2CB67D'
    if (v === 'above') return '#F5A623'
    return '#D32F2F'
  }
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--background-default-grey)', borderBottom: '1px solid var(--border-default-grey)', padding: '.5rem .75rem' }}>
      <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
        <div className="fr-col-12 fr-col-md-4">
          <strong>{t('hud.net_delta') || 'Net Δ (est. y0): '}</strong>{netEst.toLocaleString(undefined,{ maximumFractionDigits: 0 })} €
        </div>
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-progress" aria-label="Resolution">
            <div className="fr-progress__track">
              <div className="fr-progress__bar" style={{ width: `${Math.min(100, 100*resPct)}%` }} aria-hidden="true"></div>
            </div>
          </div>
          <span className="fr-text--xs">{t('hud.resolution') || 'Resolution'} {(100*resPct).toFixed(1)}%</span>
        </div>
        <div className="fr-col-6 fr-col-md-2" aria-label="EU lights">
          <span style={{ display:'inline-flex', alignItems:'center', gap:'.4rem', marginRight:'.5rem' }}>
            <span style={{ width:10, height:10, borderRadius:6, background: badgeTone(eu3), display:'inline-block' }}></span>
            <span className="fr-text--xs">{t('hud.eu3') || 'EU 3%'}</span>
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:'.4rem' }}>
            <span style={{ width:10, height:10, borderRadius:6, background: badgeTone(eu60), display:'inline-block' }}></span>
            <span className="fr-text--xs">{t('hud.eu60') || 'EU 60%'}</span>
          </span>
        </div>
        <div className="fr-col-6 fr-col-md-2" style={{ textAlign: 'right' }}>
          <div className="fr-btns-group fr-btns-group--inline fr-btns-group--right">
            <button className="fr-btn fr-btn--secondary" onClick={onReset}>{t('buttons.reset') || 'Reset'}</button>
            <button className="fr-btn" onClick={onRun} disabled={running}>{t('buttons.run') || 'Run'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function computeMassBase(pieces: Piece[]): Record<string, number> {
  const by: Record<string, number> = {}
  for (const p of pieces) {
    const base = Number(p.amountEur || 0)
    if (!base || !Array.isArray(p.cofogMajors) || !p.cofogMajors.length) continue
    const w = 1 / p.cofogMajors.length
    for (const m of p.cofogMajors) {
      const major = String(m).padStart(2, '0').slice(0,2)
      by[major] = (by[major] || 0) + base * w
    }
  }
  return by
}

function MassList({ masses, labels, baseAmounts, targets, changes, onTarget, onChangeAmt, resolution }: {
  masses: string[]
  labels: Record<string,string>
  baseAmounts: Record<string, number>
  targets: Record<string, number>
  changes: Record<string, number>
  onTarget: (m: string, v: number) => void
  onChangeAmt: (m: string, v: number) => void
  resolution?: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[]
}) {
  const resBy: Record<string, { t: number; s: number }> = {}
  for (const e of (resolution||[])) resBy[e.massId] = { t: e.targetDeltaEur, s: e.specifiedDeltaEur }
  return (
    <div className="stack" style={{ gap: '.75rem' }}>
      {masses.map(m => (
        <div key={m} className="fr-input-group" style={{ padding: '.25rem .5rem', border: '1px solid var(--border-default-grey)', borderRadius: '6px' }}>
          <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
            <div className="fr-col-12 fr-col-sm-4">
              <strong>{m}</strong> — {labels[m] || 'Mass'}<br/>
              <span className="fr-text--xs">Base: {(baseAmounts[m]||0).toLocaleString(undefined,{maximumFractionDigits:0})} €</span>
            </div>
            <div className="fr-col-12 fr-col-sm-4">
              <label className="fr-label" htmlFor={`mt_${m}`}>Target Δ€</label>
              <input id={`mt_${m}`} className="fr-input" type="number" value={targets[m] || 0} onChange={e=> onTarget(m, Number(e.target.value))} />
            </div>
            <div className="fr-col-12 fr-col-sm-4">
              <label className="fr-label" htmlFor={`mc_${m}`}>Change Δ€</label>
              <input id={`mc_${m}`} className="fr-input" type="number" value={changes[m] || 0} onChange={e=> onChangeAmt(m, Number(e.target.value))} />
            </div>
          </div>
          {resBy[m] && (
            <div className="fr-progress" style={{marginTop:'.25rem'}} aria-label="Resolution">
              <div className="fr-progress__track">
                <div className="fr-progress__bar" style={{ width: `${Math.min(100, Math.abs(resBy[m].s) / (Math.abs(resBy[m].t) || 1) * 100)}%` }} aria-hidden="true"></div>
              </div>
              <p className="fr-text--xs">Specified {(Math.abs(resBy[m].s)).toLocaleString()}€ of {(Math.abs(resBy[m].t)).toLocaleString()}€ target</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function LeverWorkshop({ levers, masses, labels, baseAmounts, onApply, onToggle, selected }: {
  levers: Lever[]
  masses: string[]
  labels: Record<string,string>
  baseAmounts: Record<string, number>
  onApply: (mass: string, amount: number, asTarget: boolean) => void
  onToggle: (id: string) => void
  selected: string[]
}) {
  const [active, setActive] = useState<string>(levers[0]?.id || '')
  const [mass, setMass] = useState<string>(masses[0] || '09')
  const [params, setParams] = useState<Record<string, number>>({})
  const lev = levers.find(l => l.id === active) || levers[0]
  const base = baseAmounts[mass] || 0
  const derived = deriveDelta(lev, params, base)
  function updateParam(k: string, v: number) { setParams({ ...params, [k]: v }) }
  return (
    <div className="stack" style={{ gap: '.5rem' }}>
      <div className="fr-select-group">
        <label className="fr-label" htmlFor="lever_pick">Lever</label>
        <select id="lever_pick" className="fr-select" value={active} onChange={e=> { setActive(e.target.value); setParams({}) }}>
          {levers.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div className="fr-select-group">
        <label className="fr-label" htmlFor="mass_pick">Mass</label>
        <select id="mass_pick" className="fr-select" value={mass} onChange={e=> setMass(e.target.value)}>
          {masses.map(m => <option key={m} value={m}>{m} — {labels[m] || ''}</option>)}
        </select>
      </div>
      <div className="stack" style={{ gap: '.25rem' }}>
        {(Object.entries(lev?.paramsSchema || {}) as [string, any][]).map(([k, spec]) => {
          const min = Number(spec?.min ?? 0)
          const max = Number(spec?.max ?? 100)
          const step = Number(spec?.step ?? 1)
          const val = Number(params[k] ?? min)
          return (
            <div key={k} className="fr-input-group">
              <label className="fr-label" htmlFor={`param_${k}`}>{k}</label>
              <input id={`param_${k}`} className="fr-input" type="number" min={min} max={max} step={step} value={val} onChange={e=> updateParam(k, Number(e.target.value))} />
            </div>
          )
        })}
      </div>
      <div className="fr-hint-text">≈ {(derived).toLocaleString(undefined,{maximumFractionDigits:0})} €</div>
      <div className="fr-btns-group fr-btns-group--inline">
        <button className="fr-btn fr-btn--secondary" onClick={()=> onApply(mass, derived, true)}>Use as Target</button>
        <button className="fr-btn" onClick={()=> onApply(mass, derived, false)}>Use as Change</button>
      </div>
      <div className="fr-tags-group">
        {levers.map(l => (
          <button key={l.id} className={"fr-tag" + (selected.includes(l.id) ? ' fr-tag--dismiss' : '')} onClick={() => onToggle(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function deriveDelta(lever: Lever | undefined, params: Record<string, number>, base: number): number {
  if (!lever) return 0
  const keys = Object.keys(params)
  if (!keys.length) return 0
  // Prefer pct-like keys
  const pctKey = keys.find(k => /pct/i.test(k))
  if (pctKey) return base * (Number(params[pctKey]||0)/100)
  const cutKey = keys.find(k => /cut_pct/i.test(k))
  if (cutKey) return base * (Number(params[cutKey]||0)/100)
  const monthsKey = keys.find(k => /months/i.test(k))
  if (monthsKey) return base * (Number(params[monthsKey]||0)/12) * 0.2
  // Fallback: sum of numeric params scaled (very conservative stub)
  let sum = 0
  for (const k of keys) sum += Number(params[k]||0)
  return Math.min(base, Math.max(-base, sum))
}

function TwinBars({ masses, labels, resolution }: { masses: Record<string, { base: number; scen: number }>, labels: Record<string,string>, resolution?: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[] }) {
  const keys = Object.keys(masses)
  if (!keys.length) return null
  return (
    <div className="fr-container" style={{ marginTop: '1rem' }}>
      <h4 className="fr-h4">Top Masses — Baseline vs Scenario</h4>
      <div className="stack" style={{ gap: '.5rem' }}>
        {keys.map(k => {
          const base = masses[k].base
          const scen = masses[k].scen
          const tot = Math.max(base, scen) || 1
          const pending = (resolution||[]).find(e=> e.massId === k)
          const pendAmt = Math.max(0, Math.abs((pending?.targetDeltaEur||0)) - Math.abs((pending?.specifiedDeltaEur||0)))
          const pendPct = Math.min(100, (pendAmt / (Math.abs(base) + 1e-9)) * 100)
          return (
            <div key={k}>
              <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
                <div className="fr-col-2"><strong>{k}</strong> <span className="fr-text--xs">{labels[k] || ''}</span></div>
                <div className="fr-col-10">
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: '#e5e5e5', height: '10px', position:'relative' }}>
                        <div style={{ width: `${(base/tot)*100}%`, background: '#0A76F6', height: '10px' }}></div>
                      </div>
                      <span className="fr-text--xs">Base {(base*100).toFixed(1)}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: '#e5e5e5', height: '10px', position:'relative' }}>
                        <div style={{ width: `${(scen/tot)*100}%`, background: '#2CB67D', height: '10px', position:'relative' }}>
                          {pendPct>0 && <div style={{ position:'absolute', top:0, right:0, height:'10px', width: `${pendPct}%`, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.2) 0, rgba(0,0,0,0.2) 3px, transparent 3px, transparent 6px)' }}></div>}
                        </div>
                      </div>
                      <span className="fr-text--xs">Scenario {(scen*100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function parseDsl(b64: string, pieces: Piece[]) {
  try {
    const text = decodeURIComponent(escape(atob(b64)))
    const lines = text.split(/\r?\n/)
    type Act = { id?: string; target?: string; op?: string; role?: string; delta_pct?: number; amount_eur?: number }
    const acts: Act[] = []
    let cur: Act | null = null
    for (const raw of lines) {
      const line = raw.trim()
      if (line.startsWith('- ')) {
        if (cur) acts.push(cur)
        cur = {}
        continue
      }
      if (!cur) continue
      const m = line.match(/^(id|target|op|role|delta_pct|amount_eur):\s*(.+)$/)
      if (m) {
        const key = m[1]
        const val = m[2]
        if (key === 'delta_pct' || key === 'amount_eur') (cur as any)[key] = Number(val)
        else (cur as any)[key] = String(val)
      }
    }
    if (cur) acts.push(cur)
    const pieceIds = new Set(pieces.map(p => p.id))
    const targ: Record<string, number> = {}
    const delt: Record<string, number> = {}
    const mT: Record<string, number> = {}
    const mC: Record<string, number> = {}
    const levs: string[] = []
    for (const a of acts) {
      const t = a.target || ''
      if (t.startsWith('piece.')) {
        const pid = t.split('.',1)[0] === 'piece' ? t.slice(6) : t
        if (!pieceIds.has(pid)) continue
        if (a.role === 'target' && typeof a.delta_pct === 'number') {
          const sign = (a.op||'increase').toLowerCase() === 'decrease' ? -1 : 1
          targ[pid] = sign * a.delta_pct
        } else if (typeof a.delta_pct === 'number') {
          const sign = (a.op||'increase').toLowerCase() === 'decrease' ? -1 : 1
          delt[pid] = sign * a.delta_pct
        }
      } else if (t.startsWith('cofog.')) {
        const major = (t.split('.',1)[0] === 'cofog' ? t.slice(6) : t).padStart(2,'0').slice(0,2)
        const sign = (a.op||'increase').toLowerCase() === 'decrease' ? -1 : 1
        if (a.role === 'target' && typeof a.amount_eur === 'number') mT[major] = (mT[major]||0) + sign * a.amount_eur
        else if (typeof a.amount_eur === 'number') mC[major] = (mC[major]||0) + sign * a.amount_eur
      } else if (!t && a.id) {
        levs.push(String(a.id))
      }
    }
    return { targets: targ, deltas: delt, massTargets: mT, massChanges: mC, levers: levs }
  } catch {
    return null
  }
}
