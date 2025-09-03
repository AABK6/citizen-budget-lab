"use client"

import { useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { DeficitPathChart } from '@/components/DeficitPathChart'
import { RuleLights } from '@/components/RuleLights'
import { StatCards } from '@/components/StatCards'
import { useI18n } from '@/lib/i18n'

const SAMPLE_YAML = `version: 0.1
baseline_year: 2026
assumptions:
  horizon_years: 5
actions:
  - id: ed_invest_boost
    target: mission.education
    dimension: cp
    op: increase
    amount_eur: 1000000000
    recurring: true
  - id: ir_cut_T3
    target: tax.ir.bracket_T3
    dimension: tax
    op: rate_change
    delta_bps: -50
`

function toBase64Utf8(s: string): string {
  // Works in browsers: encode UTF-8 safely before btoa
  return typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s, 'utf8').toString('base64')
}

export default function WhatIfPage() {
  const { t } = useI18n()
  const [yamlText, setYamlText] = useState<string>(SAMPLE_YAML)
  const [result, setResult] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runScenario() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const mutation = `
        mutation Run($dsl: String!) {
          runScenario(input: { dsl: $dsl }) {
            id
            accounting { deficitPath debtPath }
            compliance { eu3pct eu60pct netExpenditure localBalance }
            macro { deltaGDP deltaEmployment deltaDeficit assumptions }
          }
        }
      `
      const dsl = toBase64Utf8(yamlText)
      const data = await gqlRequest(mutation, { dsl })
      setResult(data.runScenario)
    } catch (e: any) {
      setError(e?.message || 'Failed to run scenario')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!result) return null
    const d0 = Number(result.accounting?.deficitPath?.[0] || 0)
    const debt5 = Number(result.accounting?.debtPath?.[result.accounting?.debtPath?.length - 1] || 0)
    const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' €'
    return [
      { label: 'Δ Deficit (Y0)', value: fmt(d0) },
      { label: 'Δ Debt (Yend)', value: fmt(debt5) },
    ]
  }, [result])

  return (
    <div className="stack">
      <h2>{t('whatif.title') || 'What‑if — Scenario Builder'}</h2>
      <div className="stack">
        <label className="field">
          <span>{t('whatif.dsl') || 'Scenario DSL (YAML)'}</span>
          <textarea
            value={yamlText}
            onChange={e => setYamlText(e.target.value)}
            rows={14}
            style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', background: '#0b1224', color: 'inherit', border: '1px solid var(--border)', borderRadius: '.5rem', padding: '.75rem' }}
          />
        </label>
        <div className="row gap">
          <button onClick={runScenario} disabled={loading}>{loading ? t('whatif.running') || 'Running…' : t('whatif.run') || 'Run Scenario'}</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="stack">
          <h3>{t('whatif.results') || 'Results'}</h3>
          {stats && <StatCards items={stats} />} 
          <RuleLights eu3pct={result.compliance?.eu3pct} eu60pct={result.compliance?.eu60pct} netExpenditure={result.compliance?.netExpenditure} localBalance={result.compliance?.localBalance} />
          <DeficitPathChart deficit={result.accounting?.deficitPath || []} debt={result.accounting?.debtPath || []} />
          <details open>
            <summary>{t('whatif.accounting') || 'Accounting'}</summary>
            <pre className="code">{JSON.stringify(result.accounting, null, 2)}</pre>
          </details>
          <details>
            <summary>{t('whatif.compliance') || 'Compliance'}</summary>
            <pre className="code">{JSON.stringify(result.compliance, null, 2)}</pre>
          </details>
          <details>
            <summary>{t('whatif.macro') || 'Macro'}</summary>
            <pre className="code">{JSON.stringify(result.macro, null, 2)}</pre>
          </details>
          <details>
            <summary>{t('whatif.raw') || 'Raw payload'}</summary>
            <pre className="code">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
