"use client"

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { gqlRequest } from '@/lib/graphql'
import dynamic from 'next/dynamic'
const WaterfallDelta = dynamic(() => import('@/components/WaterfallDelta').then(m => m.WaterfallDelta), { ssr: false })
const SankeyRibbons = dynamic(() => import('@/components/SankeyRibbons').then(m => m.SankeyRibbons), { ssr: false })
import { DeficitPathChart } from '@/components/DeficitPathChart'

type Piece = {
  id: string
  label?: string
  type: 'expenditure' | 'revenue'
  amountEur?: number | null
  share?: number | null
  cofogMajors?: string[]
  locked?: boolean
}

type Lever = { id: string; family: string; label: string; fixedImpactEur?: number | null }

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
  const { t: t0 } = useI18n()
  // Local i18n wrapper: if translation returns key itself, treat as missing for fallback
  const t = (k: string) => {
    try {
      const v = t0(k)
      return v === k ? '' : v
    } catch {
      return ''
    }
  }
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
  const [massLabels, setMassLabels] = useState<Record<string, { displayLabel: string; description?: string }>>({})
  const [intents, setIntents] = useState<Array<{ id: string; label: string; emoji?: string; massId: string; seed: any }>>([])
  const [explainMass, setExplainMass] = useState<string | null>(null)
  const [result, setResult] = useState<{
    id?: string
    deficitY0: number
    deficitPath?: number[]
    debtPath?: number[]
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
  const [showDsl, setShowDsl] = useState<boolean>(false)
  const [wfItems, setWfItems] = useState<Array<{ id: string; label?: string; deltaEur: number }>>([])
  const [ribbons, setRibbons] = useState<Array<{ pieceId: string; massId: string; amountEur: number }>>([])
  const [ribbonLabels, setRibbonLabels] = useState<{ piece: Record<string,string>, mass: Record<string,string> }>({ piece: {}, mass: {} })
  // Two-column Controls UX
  const [expFilter, setExpFilter] = useState<string>('')
  const [revFilter, setRevFilter] = useState<string>('')
  const [favExp, setFavExp] = useState<string[]>([])
  const [favRev, setFavRev] = useState<string[]>([])
  const [explainId, setExplainId] = useState<string | null>(null)
  const [showTray, setShowTray] = useState<boolean>(false)
  const [showAdjExp, setShowAdjExp] = useState<boolean>(false)
  const [showAdjRev, setShowAdjRev] = useState<boolean>(false)
  const [expView, setExpView] = useState<'all'|'adjusted'|'favorites'|'unresolved'>('all')
  const [revView, setRevView] = useState<'all'|'adjusted'|'favorites'|'unresolved'>('all')
  const [lastDsl, setLastDsl] = useState<string>('')
  const [lens, setLens] = useState<'mass'|'family'|'reform'>('mass')
  const [dense, setDense] = useState<boolean>(true)
  // Undo/Redo stack
  type Op =
    | { kind: 'pieceDelta'; id: string; prev?: number; next?: number }
    | { kind: 'pieceTarget'; id: string; prev?: number; next?: number }
    | { kind: 'massTarget'; id: string; prev?: number; next?: number }
    | { kind: 'massChange'; id: string; prev?: number; next?: number }
    | { kind: 'leverToggle'; id: string; added: boolean }
  const [ops, setOps] = useState<Op[]>([])
  const [cursor, setCursor] = useState<number>(0) // next index

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
  // Mass color palette (consistent with EU compare)
  const COFOG_COLORS: Record<string, string> = {
    '01': '#7c3aed',
    '02': '#f59e0b',
    '03': '#ef4444',
    '04': '#2563eb',
    '05': '#10b981',
    '06': '#fb7185',
    '07': '#22c55e',
    '08': '#06b6d4',
    '09': '#0ea5e9',
    '10': '#a855f7',
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
            policyLevers { id family label fixedImpactEur }
            massLabels { id displayLabel description }
            popularIntents(limit: 6){ id label emoji massId seed }
          }
        `
        const data = await gqlRequest(q, { y: year })
        if (cancelled) return
        setPieces(data.legoPieces)
        setBaseline(data.legoBaseline)
        setLevers(data.policyLevers)
        const ml: Record<string,{displayLabel:string;description?:string}> = {}
        for (const m of (data.massLabels||[])) ml[m.id] = { displayLabel: m.displayLabel, description: m.description }
        setMassLabels(ml)
        setIntents(data.popularIntents||[])
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
    // Lever IDs are now the primary way to apply their fixed impact.
    // The backend will read the lever from the catalog and apply its `fixed_impact_eur`.
    selectedLevers.forEach(id => {
      actions.push(`- id: ${yamlQuote(id)}`)
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
      const debt = data.runScenario.accounting.debtPath
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
      setResult({ id: data.runScenario.id, deficitY0: Number(def?.[0] || 0), deficitPath: (def||[]).map((x:number)=>Number(x||0)), debtPath: (debt||[]).map((x:number)=>Number(x||0)), eu3, eu60, resolutionPct: resPct, distanceScore, resolutionByMass: byMass, masses })
      // Fetch ribbons/waterfall for current scenario vs baseline
      try {
        const rid = data.runScenario.id
        const cq = `query($a:ID!){ scenarioCompare(a:$a) }`
        const cd = await gqlRequest(cq, { a: rid })
        const comp = cd?.scenarioCompare || {}
        const wf = (comp.waterfall||[]).map((e:any)=> ({ id: String(e.massId), label: String((comp.massLabels||{})[e.massId]||''), deltaEur: Number(e.deltaEur||0) }))
        setWfItems(wf)
        setRibbons((comp.ribbons||[]).map((r:any)=> ({ pieceId: String(r.pieceId), massId: String(r.massId), amountEur: Number(r.amountEur||0) })))
        setRibbonLabels({ piece: comp.pieceLabels||{}, mass: comp.massLabels||{} })
      } catch {}
      // Sync permalink and mark last run
      try {
        const url = new URL(window.location.href)
        url.searchParams.set('dsl', dslB64)
        window.history.replaceState({}, '', url.toString())
      } catch {}
      try { setLastDsl(dslB64) } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to run scenario')
      if ((e?.message||'').toLowerCase().includes('conflict')) {
        setConflictNudge('Some selected reforms conflict; adjust your selection or parameters.')
      }
    } finally {
      setRunning(false)
    }
  }

  function commitOp(op: Op) {
    setOps(prev => {
      const base = prev.slice(0, cursor)
      return [...base, op]
    })
    setCursor(c => c + 1)
  }
  function applyOp(op: Op, dir: 'undo' | 'redo') {
    if (op.kind === 'pieceDelta') {
      const val = dir === 'undo' ? op.prev : op.next
      setDeltas(d => ({ ...d, [op.id]: Number(val ?? 0) }))
    } else if (op.kind === 'pieceTarget') {
      const val = dir === 'undo' ? op.prev : op.next
      setTargets(t => ({ ...t, [op.id]: Number(val ?? 0) }))
    } else if (op.kind === 'massTarget') {
      const val = dir === 'undo' ? op.prev : op.next
      setMassTargets(m => ({ ...m, [op.id]: Number(val ?? 0) }))
    } else if (op.kind === 'massChange') {
      const val = dir === 'undo' ? op.prev : op.next
      setMassChanges(m => ({ ...m, [op.id]: Number(val ?? 0) }))
    } else if (op.kind === 'leverToggle') {
      setSelectedLevers(sel => {
        const shouldAdd = dir === 'undo' ? !op.added : op.added
        const exists = sel.includes(op.id)
        if (shouldAdd && !exists) return [...sel, op.id]
        if (!shouldAdd && exists) return sel.filter(x => x !== op.id)
        return sel
      })
    }
  }
  function undo() {
    if (cursor <= 0) return
    const op = ops[cursor - 1]
    applyOp(op, 'undo')
    setCursor(c => c - 1)
  }
  function redo() {
    if (cursor >= ops.length) return
    const op = ops[cursor]
    applyOp(op, 'redo')
    setCursor(c => c + 1)
  }
  function updateDelta(id: string, v: number) {
    const prev = deltas[id]
    commitOp({ kind: 'pieceDelta', id, prev, next: v })
    setDeltas({ ...deltas, [id]: v })
  }
  function updateTarget(id: string, v: number) {
    const prev = targets[id]
    commitOp({ kind: 'pieceTarget', id, prev, next: v })
    setTargets({ ...targets, [id]: v })
  }
  function updateMassTarget(id: string, v: number) {
    const prev = massTargets[id]
    commitOp({ kind: 'massTarget', id, prev, next: v })
    setMassTargets({ ...massTargets, [id]: v })
  }
  function updateMassChange(id: string, v: number) {
    const prev = massChanges[id]
    commitOp({ kind: 'massChange', id, prev, next: v })
    setMassChanges({ ...massChanges, [id]: v })
  }
  function toggleLever(id: string) {
    const added = !selectedLevers.includes(id)
    commitOp({ kind: 'leverToggle', id, added })
    setSelectedLevers(sel => added ? [...sel, id] : sel.filter(x => x !== id))
  }

  const exp = pieces.filter(p => p.type !== 'revenue')
  const rev = pieces.filter(p => p.type === 'revenue')
  const massList = Object.keys(COFOG_LABELS)
  const massBaseAmounts = useMemo(() => computeMassBase(pieces), [pieces])
  const massUiLabel = (m: string) => massLabels[m]?.displayLabel || COFOG_LABELS[m] || m
  const resByMass = useMemo(() => {
    const m: Record<string, { t: number; s: number }> = {}
    for (const e of (result?.resolutionByMass || [])) m[e.massId] = { t: e.targetDeltaEur, s: e.specifiedDeltaEur }
    return m
  }, [result?.resolutionByMass])
  const groupedExp = useMemo(() => groupPiecesByMass(exp, massList.reduce((acc,m)=> (acc[m]=massUiLabel(m), acc), {} as Record<string,string>)), [exp, massLabels])
  const unresolvedMasses = useMemo(() => {
    const s = new Set<string>()
    for (const k of Object.keys(resByMass)) {
      const r = resByMass[k]
      if (Math.abs(r.s) < Math.abs(r.t)) s.add(k)
    }
    return s
  }, [resByMass])
  const filteredGroupedExp = useMemo(() => {
    const f = filterGrouped(groupedExp, expFilter)
    const hasChange = (p: Piece) => Math.abs(Number(deltas[p.id]||0))>0 || Math.abs(Number(targets[p.id]||0))>0
    const isFav = (p: Piece) => favExp.includes(p.id)
    const isUnresolved = (p: Piece) => {
      const m = (p.cofogMajors && p.cofogMajors[0]) ? String(p.cofogMajors[0]).padStart(2,'0').slice(0,2) : ''
      return m && unresolvedMasses.has(m)
    }
    let out = f
    if (expView === 'adjusted') out = f.map(g => ({...g, pieces: g.pieces.filter(hasChange)})).filter(g=> g.pieces.length)
    else if (expView === 'favorites') out = f.map(g => ({...g, pieces: g.pieces.filter(isFav)})).filter(g=> g.pieces.length)
    else if (expView === 'unresolved') out = f.map(g => ({...g, pieces: g.pieces.filter(isUnresolved)})).filter(g=> g.pieces.length)
    return out
  }, [groupedExp, expFilter, expView, deltas, targets, favExp, unresolvedMasses])
  const filteredRev = useMemo(() => {
    const listAll = rev.filter(p => (p.label || p.id).toLowerCase().includes(revFilter.toLowerCase()))
    const hasChange = (p: Piece) => Math.abs(Number(deltas[p.id]||0))>0 || Math.abs(Number(targets[p.id]||0))>0
    const isFav = (p: Piece) => favRev.includes(p.id)
    const isUnresolved = (p: Piece) => {
      const m = (p.cofogMajors && p.cofogMajors[0]) ? String(p.cofogMajors[0]).padStart(2,'0').slice(0,2) : ''
      return m && unresolvedMasses.has(m)
    }
    if (revView === 'adjusted') return listAll.filter(hasChange)
    if (revView === 'favorites') return listAll.filter(isFav)
    if (revView === 'unresolved') return listAll.filter(isUnresolved)
    return listAll
  }, [rev, revFilter, revView, deltas, targets, favRev, unresolvedMasses])

  // Keyboard shortcuts: Undo/Redo and search focus
  const searchRef = useMemo(() => ({ current: null as HTMLInputElement | null }), []) as { current: HTMLInputElement | null }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (!isMeta && (e.key === '+' || e.key === '-' || e.key === '=')) {
        // Adjust focused piece delta by +/- step
        const el = document.activeElement as HTMLElement | null
        if (!el) return
        const id = (el.getAttribute('id') || '').trim()
        if (id.startsWith('delta_')) {
          const pid = id.slice(6)
          const cur = Number(deltas[pid] || 0)
          const step = 1
          const dir = (e.key === '-') ? -1 : 1 // '=' key is often '+' without shift
          updateDelta(pid, cur + dir * step)
          e.preventDefault()
        }
      } else if (!isMeta && (e.key.toLowerCase() === 'f')) {
        // Toggle pin on focused piece row
        const el = document.activeElement as HTMLElement | null
        if (!el) return
        let node: HTMLElement | null = el
        let pid: string | null = null
        // Try from input id or nearest data attribute
        const idAttr = el.getAttribute('id') || ''
        if (idAttr.startsWith('delta_')) pid = idAttr.slice(6)
        else if (idAttr.startsWith('target_')) pid = idAttr.slice(7)
        if (!pid) {
          // find ancestor with data-piece-id
          while (node && !node.getAttribute('data-piece-id')) node = node.parentElement
          pid = node?.getAttribute('data-piece-id') || null
        }
        if (pid) {
          const piece = pieces.find(p => p.id === pid)
          if (piece?.type === 'revenue') {
            setFavRev(arr => arr.includes(pid!) ? arr.filter(x => x !== pid) : [...arr, pid!])
          } else {
            setFavExp(arr => arr.includes(pid!) ? arr.filter(x => x !== pid) : [...arr, pid!])
          }
          e.preventDefault()
        }
      } else if (!isMeta && e.key === '/') {
        const el = searchRef.current
        if (el) { e.preventDefault(); el.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <div className={"stack" + (dense ? ' build-dense' : '')} style={{ gap: '1.25rem' }}>
      <BuildHud
        estExp={estimateDeltaExp(exp, deltas)}
        estRev={estimateDeltaRev(rev, deltas)}
        result={result}
        baselineTotal={Number(baseline?.depensesTotal || 0)}
        onRun={runScenario}
        running={running}
        onReset={()=>{ setDeltas({}); setTargets({}); setMassTargets({}); setMassChanges({}); setSelectedLevers([]); setResult(null); setOps([]); setCursor(0); setLastDsl(''); }}
        onToggleDsl={()=> setShowDsl(s => !s)}
        onToggleDensity={()=> setDense(v=>!v)}
        dense={dense}
        t={t}
      />
      {/* Dense layout tweaks (scoped) */}
      <style>{`
        .build-dense .fr-card__body{ padding:.75rem }
        .build-dense .fr-card__title{ margin-bottom:.25rem }
        .build-dense .fr-input{ padding:.25rem .4rem; min-height:30px }
        .build-dense .fr-select{ padding:.25rem .4rem; min-height:30px }
        .build-dense .fr-label{ margin-bottom:.125rem; font-size:.85rem }
        .build-dense .fr-input-group{ margin-bottom:.25rem }
        .build-dense .fr-range input{ height:18px }
        .build-dense .fr-tag{ padding:.15rem .45rem }
        .build-dense .fr-badge{ transform:translateY(-1px) }
      `}</style>
      <h2 className="fr-h2">{t('build.title') || 'Build — Workshop'}</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        {/* Left column: Controls (Spending vs Revenue) */}
        <div className="fr-col-12 fr-col-md-8">
          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__title">{t('build.controls') || 'Controls'}</div>
              <div className="fr-card__desc">
                <div className="fr-grid-row fr-grid-row--gutters" style={{ marginBottom: '.5rem' }}>
                  <div className="fr-col-6">
                    <label className="fr-label" htmlFor="year">{t('labels.year') || 'Year'}</label>
                    <input id="year" className="fr-input" type="number" value={year} onChange={e => setYear(parseInt(e.target.value || '2026', 10))} />
                  </div>
                  <div className="fr-col-6">
                    <div className="fr-hint-text">{t('hud.hints') || 'Hints: +/- to adjust; ⌘Z undo; ⇧⌘Z redo'}</div>
                  </div>
                </div>
                {loading && <p>{t('loading') || 'Loading…'}</p>}
                {error && <p className="fr-error-text">{t('error.generic') || error}</p>}
                {!loading && !error && (
                  <div className="fr-grid-row fr-grid-row--gutters">
                    <div className="fr-col-12" style={{ marginBottom: '.5rem' }}>
                        <div className="fr-card fr-card--no-arrow">
                          <div className="fr-card__body">
                            <div className="fr-card__title">{t('build.pinned_levers') || 'Selected Levers'}</div>
                            <div className="fr-card__desc">
                              <LeverWorkshop levers={levers} onToggle={toggleLever} selected={selectedLevers} t={t} />rs} t={t} />
                            </div>
                          </div>
                        </div>
                      </div>
                    {/* Spending column */}
                    <div className="fr-col-12 fr-col-md-6">
                      <div style={{ position:'sticky', top: 48, zIndex: 1, background: 'var(--background-default-grey)', paddingBottom: '.25rem' }}>
                        <h4 className="fr-h4" style={{ marginBottom: '.25rem' }}>{t('build.expenditures') || 'Spending'}</h4>
                        <div className="fr-input-group">
                          <input ref={(el)=> (searchRef.current = el)} className="fr-input" placeholder={t('labels.search') || 'Search…'} value={expFilter} onChange={(e)=> setExpFilter(e.target.value)} />
                        </div>
                        <MassJumpBar keys={groupedExp.map(g=> g.key)} onJump={(k)=> document.getElementById('mass_'+k)?.scrollIntoView({ behavior:'smooth', block:'start' })} />
                        <div className="fr-tags-group" style={{ marginTop: '.25rem' }}>
                          <button className={"fr-tag fr-tag--sm" + (expView==='all' ? ' fr-tag--dismiss':'')} onClick={()=> setExpView('all')}>All</button>
                          <button className={"fr-tag fr-tag--sm" + (expView==='adjusted' ? ' fr-tag--dismiss':'')} onClick={()=> setExpView('adjusted')}>Adjusted</button>
                          <button className={"fr-tag fr-tag--sm" + (expView==='favorites' ? ' fr-tag--dismiss':'')} onClick={()=> setExpView('favorites')}>Favorites</button>
                          <button className={"fr-tag fr-tag--sm" + (expView==='unresolved' ? ' fr-tag--dismiss':'')} onClick={()=> setExpView('unresolved')}>Unresolved</button>
                        </div>
                        {favExp.length>0 && (
                          <PinnedPieces pieces={pieces} ids={favExp} deltas={deltas} targets={targets} onDelta={updateDelta} onTarget={updateTarget} onUnpin={(id)=> setFavExp(v=> v.filter(x=> x!==id))} t={t} />
                        )}
                      </div>
                      <GroupedPieceList2
                        grouped={filteredGroupedExp}
                        deltas={deltas}
                        targets={targets}
                        onDelta={updateDelta}
                        onTarget={updateTarget}
                        t={t}
                        resByMass={resByMass}
                        fav={favExp}
                        onToggleFav={(id)=> setFavExp(arr => arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id])}
                        onExplain={setExplainId}
                        unresolved={unresolvedMasses}
                        defaultView={(k)=> unresolvedMasses.has(k) ? 'unresolved' : expView}
                      />
                    </div>
                    {/* Revenue column */}
                    <div className="fr-col-12 fr-col-md-6">
                      <div style={{ position:'sticky', top: 48, zIndex: 1, background: 'var(--background-default-grey)', paddingBottom: '.25rem' }}>
                        <h4 className="fr-h4" style={{ marginBottom: '.25rem' }}>{t('build.revenues') || 'Revenue'}</h4>
                        <div className="fr-input-group">
                          <input className="fr-input" placeholder={t('labels.search') || 'Search…'} value={revFilter} onChange={(e)=> setRevFilter(e.target.value)} />
                        </div>
                        <div className="fr-tags-group" style={{ marginTop: '.25rem' }}>
                          <button className={"fr-tag fr-tag--sm" + (revView==='all' ? ' fr-tag--dismiss':'')} onClick={()=> setRevView('all')}>All</button>
                          <button className={"fr-tag fr-tag--sm" + (revView==='adjusted' ? ' fr-tag--dismiss':'')} onClick={()=> setRevView('adjusted')}>Adjusted</button>
                          <button className={"fr-tag fr-tag--sm" + (revView==='favorites' ? ' fr-tag--dismiss':'')} onClick={()=> setRevView('favorites')}>Favorites</button>
                          <button className={"fr-tag fr-tag--sm" + (revView==='unresolved' ? ' fr-tag--dismiss':'')} onClick={()=> setRevView('unresolved')}>Unresolved</button>
                        </div>
                        {favRev.length>0 && (
                          <PinnedPieces pieces={pieces} ids={favRev} deltas={deltas} targets={targets} onDelta={updateDelta} onTarget={updateTarget} onUnpin={(id)=> setFavRev(v=> v.filter(x=> x!==id))} t={t} />
                        )}
                      </div>
                      <PieceList2
                        pieces={filteredRev}
                        deltas={deltas}
                        targets={targets}
                        onDelta={updateDelta}
                        onTarget={updateTarget}
                        t={t}
                        resByMass={resByMass}
                        fav={favRev}
                        onToggleFav={(id)=> setFavRev(arr => arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id])}
                        onExplain={setExplainId}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Canvas + Scoreboard */}
        <div className="fr-col-12 fr-col-md-4">
          <div className="stack" style={{ gap: '.75rem' }}>
            <div className="fr-card fr-card--no-arrow">
              <div className="fr-card__body">
                <div className="fr-card__title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span>{t('build.canvas') || 'Canvas'}</span>
                  <div className="fr-tags-group" aria-label="Lens">
                    <button className={"fr-tag fr-tag--sm" + (lens==='mass' ? ' fr-tag--dismiss': '')} onClick={()=> setLens('mass')}>Mass</button>
                    <button className={"fr-tag fr-tag--sm" + (lens==='family' ? ' fr-tag--dismiss': '')} onClick={()=> setLens('family')} disabled>Family</button>
                    <button className={"fr-tag fr-tag--sm" + (lens==='reform' ? ' fr-tag--dismiss': '')} onClick={()=> setLens('reform')} disabled>Reform</button>
                  </div>
                </div>
                <div className="fr-card__desc">
                  {result?.masses && <TwinBars masses={result.masses} labels={massList.reduce((acc, m)=> (acc[m]=massUiLabel(m), acc), {} as Record<string,string>)} resolution={result.resolutionByMass} palette={COFOG_COLORS} />}
                  {wfItems?.length>0 && <div style={{ marginTop: '.5rem' }}><WaterfallDelta items={wfItems} title={t('charts.waterfall') || 'Δ by Mass (Waterfall)'} /></div>}
                </div>
              </div>
            </div>
            <ScoreStrip
              estExp={estimateDeltaExp(exp, deltas)}
              estRev={estimateDeltaRev(rev, deltas)}
              result={result}
              conflictNudge={conflictNudge}
              currentDsl={dslB64}
              lastDsl={lastDsl}
            />
            <div className="fr-card fr-card--no-arrow">
              <div className="fr-card__body">
                <button className="fr-btn fr-btn--secondary" onClick={()=> setShowTray(v=>!v)} aria-expanded={showTray} aria-controls="results_tray">
                  {showTray ? (t('labels.hide_results') || 'Hide results') : (t('labels.show_results') || 'Show results')}
                </button>
                {showTray && (
                  <div id="results_tray" className="stack" style={{ gap: '.75rem', marginTop: '.5rem' }}>
                    {(result?.deficitPath?.length || result?.debtPath?.length) ? (
                      <>
                        <h4 className="fr-h4">{t('charts.deficit_path') || 'Deficit & Debt Path'}</h4>
                        <DeficitPathChart deficit={result?.deficitPath || []} debt={result?.debtPath || []} />
                      </>
                    ) : null}
                    {ribbons?.length>0 && <SankeyRibbons ribbons={ribbons} pieceLabels={ribbonLabels.piece} massLabels={ribbonLabels.mass} />}
                    <div className="fr-card fr-card--no-arrow">
                      <div className="fr-card__body">
                        <div className="fr-card__title">{t('build.workshop') || 'Policy Workshop'}</div>
                        <div className="fr-card__desc">
                          <p className="fr-text--sm">{t('workshop.hint') || 'Select reforms to apply their fixed budgetary impact.'}</p>
                          <LeverWorkshop levers={levers} onToggle={toggleLever} selected={selectedLevers} t={t} />
                        </div>
                      </div>
                    </div>
                    {result?.id && (
                      <div className="fr-card fr-card--no-arrow">
                        <div className="fr-card__body">
                          <div className="fr-card__title">{t('build.dsl') || 'Scenario DSL'}</div>
                          <div className="fr-card__desc">
                            <pre style={{ whiteSpace: 'pre-wrap' }}><code>{dsl}</code></pre>
                          </div>
                          <div className="fr-card__title" style={{ marginTop: '.5rem' }}>{t('scenario.save_title') || 'Scenario title'}</div>
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* DSL Drawer */}
      {showDsl && (
        <div style={{ position:'fixed', right: '1rem', bottom: '1rem', width: '380px', maxHeight: '60vh', overflow:'auto', border: '1px solid var(--border-default-grey)', background: 'var(--background-default-grey)', zIndex: 200, borderRadius: 6 }}>
          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>Scenario DSL</span>
                <button className="fr-btn fr-btn--sm fr-btn--secondary" onClick={()=> setShowDsl(false)}>×</button>
              </div>
              <div className="fr-card__desc">
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}><code>{dsl}</code></pre>
              </div>
            </div>
          </div>
        </div>
      )}
      {result?.masses && <TwinBars masses={result.masses} labels={massList.reduce((acc, m)=> (acc[m]=massUiLabel(m), acc), {} as Record<string,string>)} resolution={result.resolutionByMass} />}
      {wfItems?.length>0 && <WaterfallDelta items={wfItems} title="Δ by Mass (Waterfall)" />}
      {ribbons?.length>0 && <SankeyRibbons ribbons={ribbons} pieceLabels={ribbonLabels.piece} massLabels={ribbonLabels.mass} />}
      {explainMass && (
        <ExplainPanel
          massId={explainMass}
          label={massUiLabel(explainMass)}
          baseAmount={massBaseAmounts[explainMass]||0}
          targetAmount={massTargets[explainMass]||0}
          specifiedAmount={(result?.resolutionByMass||[]).find(e=> e.massId===explainMass)?.specifiedDeltaEur || 0}
          pieces={pieces}
          dslB64={dslB64}
          t={t}
          selectedLevers={selectedLevers}
          onToggleLever={toggleLever}
          onClose={()=> setExplainMass(null)}
          onApply={async(plan)=>{
            try {
              const q = `mutation($input:SpecifyMassInput!){ specifyMass(input:$input){ ok dsl errors{ code message pieceId } resolution{ overallPct byMass{ massId targetDeltaEur specifiedDeltaEur } } } }`
              const payload = { dsl: dslB64, massId: explainMass, targetDeltaEur: massTargets[explainMass]||0, splits: plan.map(p=>({ pieceId: p.pieceId, amountEur: p.amountEur })) }
              const data = await gqlRequest(q, { input: payload })
              const sp = data?.specifyMass
              if (!sp?.ok) {
                const msg = (sp?.errors||[]).map((e:any)=> e.message).join('; ')
                setConflictNudge(msg || 'Validation failed')
                return
              }
              // Update state from returned DSL
              const parsed = parseDsl(sp.dsl, pieces)
              if (parsed) {
                setTargets(parsed.targets)
                setDeltas(parsed.deltas)
                setMassTargets(parsed.massTargets)
                setMassChanges(parsed.massChanges)
                setSelectedLevers(parsed.levers)
              }
              // Update resolution in result (keep other fields)
              setResult(prev => ({ ...(prev||{ deficitY0: 0, eu3: 'info', eu60: 'info', resolutionPct: 0 }), resolutionPct: Number(sp.resolution?.overallPct||0), resolutionByMass: (sp.resolution?.byMass||[]).map((e:any)=>({ massId:String(e.massId), targetDeltaEur:Number(e.targetDeltaEur||0), specifiedDeltaEur:Number(e.specifiedDeltaEur||0) })) }))
              // Sync permalink
              try { const url = new URL(window.location.href); url.searchParams.set('dsl', sp.dsl); window.history.replaceState({}, '', url.toString()) } catch {}
              setExplainMass(null)
            } catch (e:any) {
              setConflictNudge(e?.message||'Failed to specify mass')
            }
          }}
        />
      )}
      {/* Piece Explain overlay */}
      {explainId && (
        <ExplainOverlay piece={pieces.find(p=> p.id===explainId)} onClose={()=> setExplainId(null)} t={t} />
      )}
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

// Advanced controls: grouped lists and overlays
function groupPiecesByMass(items: Piece[], labels: Record<string,string>): { key: string; label: string; pieces: Piece[] }[] {
  const byKey: Record<string, Piece[]> = {}
  for (const p of items) {
    const key = (p.cofogMajors && p.cofogMajors[0]) ? String(p.cofogMajors[0]).padStart(2,'0').slice(0,2) : '00'
    byKey[key] = byKey[key] || []
    byKey[key].push(p)
  }
  const keys = Object.keys(byKey).sort()
  return keys.map(k => ({ key: k, label: labels[k] || (k==='00' ? 'Other' : k), pieces: byKey[k] }))
}

function filterGrouped(grouped: { key: string; label: string; pieces: Piece[] }[], q: string) {
  const needle = (q||'').toLowerCase()
  if (!needle) return grouped
  return grouped.map(g => ({ ...g, pieces: g.pieces.filter(p => (p.label||p.id).toLowerCase().includes(needle)) })).filter(g => g.pieces.length)
}

function PieceList2({ pieces, deltas, targets, onDelta, onTarget, t, resByMass, fav, onToggleFav, onExplain }: {
  pieces: Piece[]
  deltas: Record<string, number>
  targets: Record<string, number>
  onDelta: (id: string, v: number) => void
  onTarget: (id: string, v: number) => void
  t: (k: string)=>string
  resByMass: Record<string, { t: number; s: number }>
  fav: string[]
  onToggleFav: (id: string) => void
  onExplain: (id: string) => void
}) {
  if (!pieces.length) return <p className="fr-text--sm">{t('labels.no_pieces') || 'No pieces'}</p>
  return (
    <div className="stack" style={{ gap: '.5rem' }}>
      {pieces.map(p => (
        <PieceRow2 key={p.id} p={p} deltas={deltas} targets={targets} onDelta={onDelta} onTarget={onTarget} t={t} resByMass={resByMass} pinned={fav.includes(p.id)} onToggleFav={onToggleFav} onExplain={onExplain} />
      ))}
    </div>
  )
}

function GroupedPieceList2({ grouped, deltas, targets, onDelta, onTarget, t, resByMass, fav, onToggleFav, onExplain, unresolved, defaultView }: {
  grouped: { key: string; label: string; pieces: Piece[] }[]
  deltas: Record<string, number>
  targets: Record<string, number>
  onDelta: (id: string, v: number) => void
  onTarget: (id: string, v: number) => void
  t: (k: string)=>string
  resByMass: Record<string, { t: number; s: number }>
  fav: string[]
  onToggleFav: (id: string) => void
  onExplain: (id: string) => void
  unresolved: Set<string>
  defaultView: (key: string)=> 'all'|'adjusted'|'favorites'|'unresolved'
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(grouped.map(g => [g.key, true])))
  const [viewBy, setViewBy] = useState<Record<string,'all'|'adjusted'|'favorites'|'unresolved'>>(() => Object.fromEntries(grouped.map(g => [g.key, defaultView(g.key)])))
  return (
    <div className="stack" style={{ gap: '.5rem' }}>
      {grouped.map(g => (
        <div key={g.key} id={`mass_${g.key}`} className="fr-accordion" style={{ border: '1px solid var(--border-default-grey)', borderRadius: '6px' }}>
          <h3 className="fr-accordion__title" style={{ margin: 0 }}>
            <button className={open[g.key] ? 'fr-accordion__btn' : 'fr-accordion__btn collapsed'} aria-expanded={!!open[g.key]} onClick={()=> setOpen({ ...open, [g.key]: !open[g.key] })}>
              <span>{g.key} — {g.label}</span>
              <span className="fr-text--xs" style={{ marginLeft: '.5rem' }}>({g.pieces.length})</span>
              {resByMass[g.key] && (
                <span className="fr-text--xs" style={{ marginLeft: '.5rem' }}>
                  {(Math.min(100, Math.abs(resByMass[g.key].s) / (Math.abs(resByMass[g.key].t) || 1) * 100)).toFixed(0)}%
                </span>
              )}
              <span style={{ marginLeft: '.5rem' }}>
                <button className={"fr-tag fr-tag--sm" + (viewBy[g.key]==='all' ? ' fr-tag--dismiss':'')} onClick={(e)=>{e.stopPropagation(); setViewBy(v=>({...v,[g.key]:'all'}))}}>All</button>
                <button className={"fr-tag fr-tag--sm" + (viewBy[g.key]==='adjusted' ? ' fr-tag--dismiss':'')} onClick={(e)=>{e.stopPropagation(); setViewBy(v=>({...v,[g.key]:'adjusted'}))}}>Adj</button>
                <button className={"fr-tag fr-tag--sm" + (viewBy[g.key]==='favorites' ? ' fr-tag--dismiss':'')} onClick={(e)=>{e.stopPropagation(); setViewBy(v=>({...v,[g.key]:'favorites'}))}}>Fav</button>
                <button className={"fr-tag fr-tag--sm" + (viewBy[g.key]==='unresolved' ? ' fr-tag--dismiss':'')} onClick={(e)=>{e.stopPropagation(); setViewBy(v=>({...v,[g.key]:'unresolved'}))}}>Unres</button>
              </span>
            </button>
          </h3>
          {open[g.key] && (
            <div className="fr-accordion__content" style={{ paddingTop: '.5rem' }}>
              <div className="stack" style={{ gap: '.5rem' }}>
                {g.pieces.filter(p => {
                  const hasChange = Math.abs(Number(deltas[p.id]||0))>0 || Math.abs(Number(targets[p.id]||0))>0
                  const isFav = fav.includes(p.id)
                  const isUnres = unresolved.has(g.key)
                  const v = viewBy[g.key]
                  if (v==='adjusted') return hasChange
                  if (v==='favorites') return isFav
                  if (v==='unresolved') return isUnres
                  return true
                }).map(p => (
                  <PieceRow2 key={p.id} p={p} deltas={deltas} targets={targets} onDelta={onDelta} onTarget={onTarget} t={t} resByMass={resByMass} pinned={fav.includes(p.id)} onToggleFav={onToggleFav} onExplain={onExplain} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PieceRow2({ p, deltas, targets, onDelta, onTarget, t, resByMass, pinned, onToggleFav, onExplain }: {
  p: Piece
  deltas: Record<string, number>
  targets: Record<string, number>
  onDelta: (id: string, v: number) => void
  onTarget: (id: string, v: number) => void
  t: (k: string)=>string
  resByMass: Record<string, { t: number; s: number }>
  pinned: boolean
  onToggleFav: (id: string)=> void
  onExplain: (id: string)=> void
}) {
  const pieceMass = (p.cofogMajors && p.cofogMajors[0]) ? String(p.cofogMajors[0]).padStart(2,'0').slice(0,2) : ''
  const unresolved = pieceMass && resByMass[pieceMass] && Math.abs(resByMass[pieceMass].s) < Math.abs(resByMass[pieceMass].t)
  const microPct = (() => {
    const hasDelta = Math.abs(Number(deltas[p.id] || 0)) > 0
    const hasTarget = Math.abs(Number(targets[p.id] || 0)) > 0
    return (hasDelta && hasTarget) ? 100 : (hasDelta || hasTarget) ? 50 : 0
  })()
  return (
    <div data-piece-id={p.id} className="fr-input-group" style={{ padding: '.15rem .35rem', border: '1px solid var(--border-default-grey)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
      {unresolved && (
        <div aria-hidden="true" style={{ position:'absolute', inset:0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 3px, transparent 3px, transparent 6px)' }}></div>
      )}
      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap: '.3rem' }}>
          <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:'.25rem' }}>
            <button onClick={()=> onExplain(p.id)} title={(p.label||p.id) + ' — ' + ((p.amountEur||0).toLocaleString(undefined,{maximumFractionDigits:0}) + ' €')} style={{ border:'none', background:'transparent', padding:0, margin:0, cursor:'pointer', textAlign:'left', flex:1 }}>
              <span className="fr-text--sm" style={{ whiteSpace:'normal', lineHeight:'1.25em', maxHeight:'2.6em', overflow:'hidden' }}>{p.label || p.id}</span>
            </button>
            {p.locked && <span className="fr-badge fr-badge--sm" style={{ marginLeft: '.2rem' }}>{t('piece.locked') || 'Locked'}</span>}
            <button aria-label={pinned ? (t('labels.unpin') || 'Unpin') : (t('labels.pin') || 'Pin')} onClick={()=> onToggleFav(p.id)} style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:'13px', color: pinned ? '#4a3aff' : 'inherit' }}>{pinned ? '★' : '☆'}</button>
            <span className="fr-text--xs" style={{ color:'var(--text-mention-grey)' }}>{(p.amountEur||0).toLocaleString(undefined,{maximumFractionDigits:0})} €</span>
          </div>
          <div aria-label="delta" title="Change %" style={{ display:'flex', alignItems:'center', gap:'.15rem' }}>
            <input id={`delta_${p.id}`} className="fr-input fr-input--sm" type="number" min={-50} max={50} step={1} value={Number(deltas[p.id]||0)} onChange={e=> onDelta(p.id, Number((e.target as HTMLInputElement).value||0))} disabled={!!p.locked} style={{ width:46 }} />
            <span className="fr-text--xs">%</span>
          </div>
          <TargetPill id={`target_${p.id}`} value={Number(targets[p.id]||0)} disabled={!!p.locked} onChange={(v)=> onTarget(p.id, v)} />
          <span className="fr-badge fr-badge--sm" title="Δ€" style={{ width:86, textAlign:'right' }}>{((Number(deltas[p.id]||0)/100)*(Number(p.amountEur||0))).toLocaleString(undefined,{maximumFractionDigits:0})} €</span>
        </div>
        <div style={{ height:1, background:'#e5e5e5', marginTop:1, position:'relative' }} aria-hidden="true">
          <div style={{ position:'absolute', left:0, top:0, height:1, width:`${microPct}%`, background:'#0a7aff' }}></div>
        </div>
      </div>
    </div>
  )
}

function ScoreStrip({ estExp, estRev, result, conflictNudge, currentDsl, lastDsl }: { estExp: number, estRev: number, result: any, conflictNudge: string | null, currentDsl: string, lastDsl: string }) {
  const net = (estExp + estRev) || 0
  return (
    <div style={{ position: 'sticky', top: 64, zIndex: 11 }}>
      <div className="fr-card fr-card--no-arrow">
        <div className="fr-card__body">
          <div className="fr-card__title">Scoreboard</div>
          <div className="fr-card__desc">
            <dl className="fr-description-list">
              <div className="fr-description-list__row">
                <dt className="fr-description-list__term">ΔExp</dt>
                <dd className="fr-description-list__definition">{estExp.toLocaleString(undefined, { maximumFractionDigits: 0 })} €</dd>
              </div>
              <div className="fr-description-list__row">
                <dt className="fr-description-list__term">ΔRev</dt>
                <dd className="fr-description-list__definition">{estRev.toLocaleString(undefined, { maximumFractionDigits: 0 })} €</dd>
              </div>
              <div className="fr-description-list__row">
                <dt className="fr-description-list__term">Net</dt>
                <dd className="fr-description-list__definition">{net.toLocaleString(undefined, { maximumFractionDigits: 0 })} €</dd>
              </div>
              {result && (
                <>
                  <div className="fr-description-list__row">
                    <dt className="fr-description-list__term">Deficit y0</dt>
                    <dd className="fr-description-list__definition">{Number(result.deficitY0||0).toLocaleString(undefined,{ maximumFractionDigits: 0 })} €</dd>
                  </div>
                  <div className="fr-description-list__row">
                    <dt className="fr-description-list__term">Resolution</dt>
                    <dd className="fr-description-list__definition">{(100 * (Number(result.resolutionPct||0))).toFixed(1)}%</dd>
                  </div>
                </>
              )}
            </dl>
            {conflictNudge && <p className="fr-alert fr-alert--warning" role="alert" style={{ marginTop: '.25rem' }}>{conflictNudge}</p>}
          </div>
          <OutdatedChip dirty={!!lastDsl && lastDsl !== currentDsl} />
        </div>
      </div>
    </div>
  )
}

function Stepper({ id, value, onChange, min, max, step, disabled }: { id: string, value: number, onChange: (v:number)=>void, min?: number, max?: number, step?: number, disabled?: boolean }) {
  const v = Number(value||0)
  const st = Number(step||1)
  const mn = typeof min === 'number' ? min : -Infinity
  const mx = typeof max === 'number' ? max : Infinity
  const dec = ()=> onChange(Math.max(mn, v - st))
  const inc = ()=> onChange(Math.min(mx, v + st))
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.1rem' }}>
      <button className="fr-btn fr-btn--sm fr-btn--secondary" onClick={dec} disabled={disabled} style={{ minWidth:22, padding:'.05rem .2rem' }}>−</button>
      <input id={id} className="fr-input fr-input--sm" type="number" value={v} onChange={e=> onChange(Number(e.target.value||0))} min={min} max={max} step={step||1} disabled={disabled} style={{ width:48 }} />
      <button className="fr-btn fr-btn--sm fr-btn--secondary" onClick={inc} disabled={disabled} style={{ minWidth:22, padding:'.05rem .2rem' }}>+</button>
    </span>
  )
}

function TargetPill({ id, value, onChange, disabled }: { id: string, value: number, onChange: (v:number)=>void, disabled?: boolean }) {
  const [open, setOpen] = useState<boolean>(false)
  const val = Number(value||0)
  const label = isFinite(val) && Math.abs(val) > 0.0001 ? `🎯 ${val}%` : '🎯'
  return (
    <span style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
      <button className={"fr-tag fr-tag--sm" + (val ? ' fr-tag--dismiss' : '')} id={id} onClick={()=> !disabled && setOpen(o=>!o)} disabled={!!disabled} title="Target (role)">{label}</button>
      {open && !disabled && (
        <div role="dialog" aria-modal="true" style={{ position:'absolute', top:'100%', right:0, zIndex:50, background:'var(--background-default-grey)', border:'1px solid var(--border-default-grey)', borderRadius:6, padding:'.5rem', boxShadow:'0 4px 12px rgba(0,0,0,0.12)' }}>
          <div className="fr-text--xs" style={{ marginBottom:'.25rem' }}>Target %</div>
          <Stepper id={id+"_editor"} value={val} min={-100} max={100} step={0.5} onChange={onChange} />
          <div className="fr-btns-group fr-btns-group--inline" style={{ marginTop:'.35rem' }}>
            <button className="fr-btn fr-btn--secondary fr-btn--sm" onClick={()=> { onChange(0); setOpen(false) }}>Clear</button>
            <button className="fr-btn fr-btn--sm" onClick={()=> setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </span>
  )
}

function ExplainOverlay({ piece, onClose, t }: { piece?: Piece, onClose: ()=>void, t: (k:string)=>string }) {
  if (!piece) return null
  useEffect(() => {
    function onKey(e: KeyboardEvent){ if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex: 100 }} onClick={onClose}>
      <div className="fr-container" style={{ maxWidth: 720, margin:'10vh auto', background: 'var(--background-default-grey)', borderRadius: 8, padding: '1rem', position: 'relative' }} onClick={(e)=> e.stopPropagation()}>
        <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems:'center' }}>
          <div className="fr-col-10">
            <h3 className="fr-h3" style={{ margin: 0 }}>{piece.label || piece.id}</h3>
            <div className="fr-text--sm" style={{ color: 'var(--text-mention-grey)' }}>
              {(piece.amountEur||0).toLocaleString(undefined,{ maximumFractionDigits: 0 })} € — {(piece.share||0).toLocaleString(undefined,{ style:'percent', maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="fr-col-2" style={{ textAlign: 'right' }}>
            <button className="fr-btn fr-btn--secondary" onClick={onClose} aria-label={t('buttons.close') || 'Close'}>✕</button>
          </div>
        </div>
        <div style={{ marginTop: '.5rem' }}>
          <p className="fr-text--sm">{t('explain.placeholder') || 'Focused explanation and context for this piece. Add detailed notes, assumptions, and links here.'}</p>
          <ul className="fr-tags-group" style={{ marginTop: '.5rem' }}>
            <li><span className="fr-tag fr-tag--sm">{t('build.base_amount') || 'Base'}: {(piece.amountEur||0).toLocaleString()} €</span></li>
            {Array.isArray(piece.cofogMajors) && piece.cofogMajors[0] && (
              <li><span className="fr-tag fr-tag--sm">COFOG {String(piece.cofogMajors[0]).padStart(2,'0')}</span></li>
            )}
          </ul>
        </div>
        <div style={{ textAlign:'right', marginTop: '.5rem' }}>
          <button className="fr-btn" onClick={onClose}>{t('buttons.done') || 'Done'}</button>
        </div>
      </div>
    </div>
  )
}

function PinnedPieces({ pieces, ids, deltas, targets, onDelta, onTarget, onUnpin, t }: {
  pieces: Piece[]
  ids: string[]
  deltas: Record<string, number>
  targets: Record<string, number>
  onDelta: (id: string, v: number)=>void
  onTarget: (id: string, v: number)=>void
  onUnpin: (id: string)=>void
  t: (k: string)=>string
}) {
  const map = new Map(pieces.map(p => [p.id, p]))
  if (!ids.length) return null
  return (
    <div className="fr-grid-row fr-grid-row--gutters" style={{ marginTop: '.25rem' }}>
      {ids.map(id => {
        const p = map.get(id)
        if (!p) return null
        return (
          <div className="fr-col-12 fr-col-sm-6" key={id}>
            <div className="fr-input-group" style={{ padding: '.25rem .5rem', border: '1px solid var(--border-default-grey)', borderRadius: 6 }}>
              <div style={{ display:'flex', alignItems:'center', gap: '.5rem' }}>
                <button aria-label={t('labels.unpin') || 'Unpin'} onClick={()=> onUnpin(id)} style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:'12px' }}>✕</button>
                <span className="fr-text--sm" title={p.label || id} style={{ whiteSpace:'normal', lineHeight:'1.25em', maxHeight:'2.6em', overflow:'hidden', flex:1 }}>{p.label || id}</span>
                <input id={`pin_delta_${id}`} className="fr-input fr-input--sm" type="number" min={-50} max={50} step={1} value={Number(deltas[id]||0)} onChange={e=> onDelta(id, Number((e.target as HTMLInputElement).value||0))} style={{ width:52 }} />
                <span className="fr-text--xs">%</span>
                <TargetPill id={`pin_target_${id}`} value={Number(targets[id]||0)} onChange={(v)=> onTarget(id, v)} />
                <span className="fr-badge fr-badge--sm" style={{ width:80, textAlign:'right' }}>{((Number(deltas[id]||0)/100)*(Number(p.amountEur||0))).toLocaleString(undefined,{maximumFractionDigits:0})} €</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OutdatedChip({ dirty }: { dirty: boolean }) {
  if (!dirty) return null
  return <span className="fr-badge fr-badge--sm" style={{ marginTop: '.25rem' }}>Outdated results</span>
}

function BuildHud({ estExp, estRev, result, baselineTotal, onRun, running, onReset, onToggleDsl, onToggleDensity, dense, t }: { estExp: number, estRev: number, result: any, baselineTotal: number, onRun: ()=>void, running: boolean, onReset: ()=>void, onToggleDsl: ()=>void, onToggleDensity: ()=>void, dense: boolean, t: (k: string)=>string }) {
  const netEst = (estExp + estRev) || 0
  const eu3 = result?.eu3 || 'info'
  const eu60 = result?.eu60 || 'info'
  const resPct = typeof result?.resolutionPct === 'number' ? result.resolutionPct : 0
  const debt = Array.isArray(result?.debtPath) ? (result.debtPath as number[]) : []
  function badgeTone(s: string) {
    const v = String(s).toLowerCase()
    if (v === 'ok' || v === 'info') return '#2CB67D'
    if (v === 'above') return '#F5A623'
    return '#D32F2F'
  }
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 12, background: 'var(--background-default-grey)', borderBottom: '1px solid var(--border-default-grey)', padding: '.5rem .75rem' }}>
      <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-text--sm">
            <strong>{t('build.delta_exp') || 'ΔExpenditures (est.)'}:</strong> {estExp.toLocaleString(undefined,{ maximumFractionDigits: 0 })} €
            {' '}·{' '}
            <strong>{t('build.delta_rev') || 'ΔRevenues (est.)'}:</strong> {estRev.toLocaleString(undefined,{ maximumFractionDigits: 0 })} €
          </div>
          <div>
            <strong>{t('hud.net_delta') || 'Net Δ (est. y0): '}</strong>{netEst.toLocaleString(undefined,{ maximumFractionDigits: 0 })} €
            {baselineTotal>0 && (
              <span className="fr-badge fr-badge--sm" style={{ marginLeft: '.5rem' }}>≈ {(100*netEst/ baselineTotal).toFixed(2)}% GDP</span>
            )}
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
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
            <button className="fr-btn fr-btn--secondary" onClick={onReset} title={t('buttons.reset') || 'Reset'}>⟲</button>
            <button className="fr-btn" onClick={onRun} disabled={running} title={t('buttons.run') || 'Run'}>▶︎</button>
            <button className="fr-btn fr-btn--secondary" onClick={onToggleDsl} title="DSL">{'</>'}</button>
            <button className="fr-btn fr-btn--secondary" onClick={onToggleDensity} title="Compact density">{dense ? '−' : '+'}</button>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-2" style={{ textAlign: 'right' }}>
          {typeof result?.deficitY0 === 'number' && (
            <div className="fr-text--sm" style={{ display:'flex', alignItems:'center', gap: '.5rem', justifyContent:'flex-end' }}>
              <span><strong>{t('score.deficit_y0') || 'Deficit (y0)'}</strong>: {result.deficitY0.toLocaleString(undefined,{ maximumFractionDigits: 0 })} €</span>
              {debt.length>0 && <MiniSpark data={debt} color="#666" />}
            </div>
          )}
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

function MiniSpark({ data, color }: { data: number[], color?: string }) {
  const w = 60, h = 20
  if (!Array.isArray(data) || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const rng = (max - min) || 1
  const pts = data.map((v, i) => {
    const x = (i/(data.length-1)) * (w-2) + 1
    const y = h - 1 - ((v - min)/rng) * (h-2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true" focusable="false">
      <polyline fill="none" stroke={color||'#999'} strokeWidth="1" points={pts} />
    </svg>
  )
}

function MassList({ masses, labels, baseAmounts, targets, changes, onTarget, onChangeAmt, resolution, onExplain }: {
  masses: string[]
  labels: Record<string,string> | ((m: string)=>string)
  baseAmounts: Record<string, number>
  targets: Record<string, number>
  changes: Record<string, number>
  onTarget: (m: string, v: number) => void
  onChangeAmt: (m: string, v: number) => void
  resolution?: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[]
  onExplain?: (m: string)=>void
}) {
  const resBy: Record<string, { t: number; s: number }> = {}
  for (const e of (resolution||[])) resBy[e.massId] = { t: e.targetDeltaEur, s: e.specifiedDeltaEur }
  return (
    <div className="stack" style={{ gap: '.75rem' }}>
      {masses.map(m => (
        <div key={m} className="fr-input-group" style={{ padding: '.25rem .5rem', border: '1px solid var(--border-default-grey)', borderRadius: '6px' }}>
          <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
            <div className="fr-col-12 fr-col-sm-4">
              <strong>{m}</strong> — {typeof labels === 'function' ? labels(m) : (labels[m] || 'Mass')}<br/>
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
          <div className="fr-btns-group fr-btns-group--inline" style={{ marginTop: '.25rem' }}>
            <button className="fr-btn fr-btn--secondary fr-btn--sm" onClick={()=> onExplain && onExplain(m)}>{labels instanceof Function ? (labels(m)+': ') : ''}{'Explain'}</button>
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

function LeverWorkshop({ levers, onToggle, selected, t }: {
  levers: Lever[]
  onToggle: (id: string) => void
  selected: string[]
  t: (k: string) => string
}) {
  return (
    <div className="stack" style={{ gap: '.5rem' }}>
      <div className="fr-tags-group">
        {levers.map(l => (
          <button key={l.id} className={"fr-tag" + (selected.includes(l.id) ? ' fr-tag--dismiss' : '')} onClick={() => onToggle(l.id)} title={`${l.label} (${(l.fixedImpactEur || 0).toLocaleString()} €)`}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TwinBars({ masses, labels, resolution, palette }: { masses: Record<string, { base: number; scen: number }>, labels: Record<string,string>, resolution?: { massId: string; targetDeltaEur: number; specifiedDeltaEur: number }[], palette?: Record<string,string> }) {
  const keys = Object.keys(masses)
  if (!keys.length) return null
  function lighten(hex: string, amt: number) {
    const m = hex.replace('#','')
    const num = parseInt(m.length===3 ? m.split('').map(c=>c+c).join('') : m, 16)
    let r = (num >> 16) + amt
    let g = ((num >> 8) & 0xff) + amt
    let b = (num & 0xff) + amt
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b))
    return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)
  }
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
          const col = (palette && palette[k]) ? palette[k] : '#0A76F6'
          const col2 = lighten(col, 30)
          return (
            <div key={k}>
              <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
                <div className="fr-col-2"><strong>{k}</strong> <span className="fr-text--xs">{labels[k] || ''}</span></div>
                <div className="fr-col-10">
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: '#e5e5e5', height: '10px', position:'relative' }}>
                        <div style={{ width: `${(base/tot)*100}%`, background: col, height: '10px' }}></div>
                      </div>
                      <span className="fr-text--xs">Base {(base*100).toFixed(1)}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: '#e5e5e5', height: '10px', position:'relative' }}>
                        <div style={{ width: `${(scen/tot)*100}%`, background: col2, height: '10px', position:'relative' }}>
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

function MassJumpBar({ keys, onJump }: { keys: string[], onJump: (k:string)=>void }) {
  if (!keys.length) return null
  return (
    <div className="fr-tags-group" style={{ marginTop: '.25rem', flexWrap: 'wrap' }}>
      {keys.map(k => (
        <button key={k} className="fr-tag fr-tag--sm" onClick={()=> onJump(k)} title={`Jump to ${k}`}>{k}</button>
      ))}
    </div>
  )
}

function ExplainPanel({ massId, label, baseAmount, targetAmount, specifiedAmount, pieces, dslB64, t, selectedLevers, onToggleLever, onClose, onApply }: {
  massId: string
  label: string
  baseAmount: number
  targetAmount: number
  specifiedAmount: number
  pieces: Piece[]
  dslB64: string
  t: (k: string)=>string
  selectedLevers: string[]
  onToggleLever: (id: string)=>void
  onClose: ()=>void
  onApply: (plan: Array<{ pieceId: string; amountEur: number }>)=>void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent){ if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const remaining = (targetAmount||0) - (specifiedAmount||0)
  const sign = remaining >= 0 ? 1 : -1
  const massPieces = pieces
    .filter(p => (p.cofogMajors||[]).some(m => String(m).padStart(2,'0').slice(0,2) === massId))
    .slice(0, 6)
  const [splits, setSplits] = useState<Record<string, number>>(()=>{
    const init: Record<string, number> = {}
    const n = Math.max(1, massPieces.length)
    const per = (Math.abs(remaining) / n) || 0
    for (const p of massPieces) init[p.id] = per * sign
    return init
  })
  const total = Object.values(splits).reduce((s,v)=> s + v, 0)
  const adjust = (id: string, v: number) => {
    setSplits(prev => ({ ...prev, [id]: v }))
  }
  // Presets
  function applyEven() {
    const n = Math.max(1, massPieces.length)
    const per = (Math.abs(remaining) / n) * sign
    const next: Record<string, number> = {}
    for (const p of massPieces) next[p.id] = per
    setSplits(next)
  }
  function applyProportional() {
    const totBase = massPieces.reduce((s,p)=> s + Number(p.amountEur||0), 0)
    if (!totBase) return applyEven()
    const next: Record<string, number> = {}
    for (const p of massPieces) {
      const w = Number(p.amountEur||0) / totBase
      next[p.id] = Math.abs(remaining) * w * sign
    }
    setSplits(next)
  }
  function applyFocusLargest() {
    if (!massPieces.length) return
    const largest = [...massPieces].sort((a,b)=> (Number(b.amountEur||0)-Number(a.amountEur||0)))[0]
    const next: Record<string, number> = {}
    for (const p of massPieces) next[p.id] = 0
    next[largest.id] = remaining
    setSplits(next)
  }
  const clampPlan = () => {
    const plan: Array<{pieceId: string; amountEur: number}> = []
    for (const p of massPieces) {
      let v = splits[p.id] || 0
      v = (Math.abs(total)>1e-6) ? v * (remaining / total) : v
      plan.push({ pieceId: p.id, amountEur: v })
    }
    return plan
  }
  // Suggest levers for this mass
  const [suggested, setSuggested] = useState<Array<{ id: string; label: string; shortLabel?: string }>>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const q = `query($m:String!){ suggestLevers(massId:$m){ id label shortLabel } }`
        const data = await gqlRequest(q, { m: massId })
        if (!cancelled) setSuggested(data?.suggestLevers||[])
      } catch {}
    }
    load()
    return ()=>{ cancelled = true }
  }, [massId])
  return (
    <div role="dialog" aria-modal="true" className="fr-modal__body" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, top: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 300 }}>
      <div className="fr-card fr-card--no-arrow" style={{ width: '420px', maxWidth: '90vw', height: '100%', overflow: 'auto', boxShadow: 'rgba(0,0,0,0.2) 0 0 10px' }}>
        <div className="fr-card__body">
          <div className="fr-card__title">{t('build.explain') || 'Explain'} {massId} — {label}</div>
          <div className="fr-card__desc">
            <p className="fr-text--sm">{t('build.target') || 'Target'}: {(targetAmount||0).toLocaleString()} €; {t('build.specified') || 'Specified'}: {(specifiedAmount||0).toLocaleString()} €; {t('build.remaining') || 'Remaining'}: {remaining.toLocaleString()} €</p>
            {remaining === 0 ? (
              <p className="fr-text--sm">{t('build.target_met') || 'Target met.'}</p>
            ) : (
              <>
                <p className="fr-text--sm">{t('build.distribute_hint') || 'Distribute the remaining amount across key pieces. Sliders are sum‑constrained on apply.'}</p>
                <div style={{ marginBottom: '.5rem' }}>
                  <span className="fr-text--sm" style={{ marginRight: '.5rem' }}>{t('build.presets') || 'Presets'}:</span>
                  <button className="fr-tag fr-tag--sm" onClick={applyEven}>{t('build.preset_even') || 'Even'}</button>
                  <button className="fr-tag fr-tag--sm" style={{ marginLeft: '.5rem' }} onClick={applyProportional}>{t('build.preset_proportional') || 'Proportional'}</button>
                  <button className="fr-tag fr-tag--sm" style={{ marginLeft: '.5rem' }} onClick={applyFocusLargest}>{t('build.preset_focus') || 'Focus largest'}</button>
                </div>
                <div className="stack" style={{ gap: '.5rem' }}>
                  {massPieces.map(p => (
                    <div key={p.id} className="fr-input-group">
                      <label className="fr-label" htmlFor={`split_${p.id}`}>{p.label || p.id} <span className="fr-text--xs">(base {(p.amountEur||0).toLocaleString()} €)</span></label>
                      <div className="fr-grid-row fr-grid-row--gutters">
                        <div className="fr-col-8">
                          <div className="fr-range">
                            <input id={`split_${p.id}`} type="range" min={-Math.abs(baseAmount)} max={Math.abs(baseAmount)} step={Math.max(1, Math.round((baseAmount||1)/100))} value={splits[p.id] || 0} onChange={e=> adjust(p.id, Number((e.target as HTMLInputElement).value))} />
                          </div>
                        </div>
                        <div className="fr-col-4">
                          <input className="fr-input" type="number" value={splits[p.id] || 0} onChange={e=> adjust(p.id, Number(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {suggested.length>0 && (
              <div style={{ marginTop: '.75rem' }}>
                <div className="fr-text--sm" style={{ marginBottom: '.25rem' }}>{t('build.suggestions') || 'Suggestions'}</div>
                <div className="fr-tags-group">
                  {suggested.map(s => (
                    <button key={s.id} className={"fr-tag" + (selectedLevers.includes(s.id)? ' fr-tag--dismiss':'')} onClick={()=> onToggleLever(s.id)} title={s.shortLabel || s.label}>
                      {s.shortLabel || s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="fr-btns-group fr-btns-group--inline" style={{ marginTop: '.5rem' }}>
              <button className="fr-btn fr-btn--secondary" onClick={onClose}>{t('buttons.close') || 'Close'}</button>
              <button className="fr-btn" onClick={()=> onApply(clampPlan())} disabled={remaining===0}>{t('buttons.apply') || 'Apply'}</button>
            </div>
          </div>
        </div>
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
