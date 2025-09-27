"use client"

import { useMemo, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'
import { DeficitPathChart } from '@/components/DeficitPathChart'
import { RuleLights } from '@/components/RuleLights'
import { StatCards } from '@/components/StatCards'
import { useI18n } from '@/lib/i18n'
import {
  computeDeficitTotals,
  computeDeficitDeltas,
  computeDebtTotals,
  computeDebtDeltas,
} from '@/lib/fiscal'

const SAMPLE_YAML = `version: 0.1
baseline_year: 2026
assumptions:
  horizon_years: 5
actions:
  - id: ed_invest_boost
    target: mission.M_EDU
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
            accounting {
              deficitPath
              debtPath
              commitmentsPath
              deficitDeltaPath
              debtDeltaPath
              baselineDeficitPath
              baselineDebtPath
            }
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
    const deficitTotals = computeDeficitTotals(result.accounting, result.macro?.deltaDeficit)
    const deficitDelta = computeDeficitDeltas(result.accounting, result.macro?.deltaDeficit)
    const debtTotals = computeDebtTotals(result.accounting)
    const debtDelta = computeDebtDeltas(result.accounting)
    const currency = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' €'
    const signed = (v: number) => (v >= 0 ? '+' : '') + currency(v)
    const lastDebtTotal = debtTotals.length ? debtTotals[debtTotals.length - 1] : 0
    const lastDebtDelta = debtDelta.length ? debtDelta[debtDelta.length - 1] : 0

    return [
      { label: 'Deficit (Y0)', value: currency(deficitTotals[0] ?? 0) },
      { label: 'Δ vs baseline (Y0)', value: signed(deficitDelta[0] ?? 0) },
      { label: 'Debt (Yend)', value: currency(lastDebtTotal) },
      { label: 'Δ Debt vs baseline (Yend)', value: signed(lastDebtDelta) },
    ]
  }, [result])

  const chartStartYear = useMemo(() => {
    const match = yamlText.match(/baseline_year:\s*(\d{4})/)
    return match ? Number(match[1]) : undefined
  }, [yamlText])

  return (
    <div className="stack">
      <h2 className="fr-h2">{t('whatif.title') || 'What‑if — Scenario Builder'}</h2>
      <div className="stack">
        <div className="fr-input-group" style={{ width: '100%' }}>
          <label className="fr-label" htmlFor="dsl-editor">{t('whatif.dsl') || 'Scenario DSL (YAML)'}</label>
          <textarea
            id="dsl-editor"
            className="fr-input"
            value={yamlText}
            onChange={e => setYamlText(e.target.value)}
            rows={14}
            style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
          />
        </div>
        <div className="row gap">
          <button className="fr-btn" onClick={runScenario} disabled={loading}>{loading ? t('whatif.running') || 'Running…' : t('whatif.run') || 'Run Scenario'}</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="stack">
          <h3>{t('whatif.results') || 'Results'}</h3>
          {stats && <StatCards items={stats} />} 
          <RuleLights eu3pct={result.compliance?.eu3pct} eu60pct={result.compliance?.eu60pct} netExpenditure={result.compliance?.netExpenditure} localBalance={result.compliance?.localBalance} />
          <DeficitPathChart
            deficit={computeDeficitTotals(result.accounting, result.macro?.deltaDeficit)}
            debt={computeDebtTotals(result.accounting)}
            startYear={chartStartYear}
          />
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
