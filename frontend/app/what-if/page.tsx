"use client"

import { useState } from 'react'
import { gqlRequest } from '@/lib/graphql'

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

  return (
    <div className="stack">
      <h2>What‑if — Scenario Builder</h2>
      <div className="stack">
        <label className="field">
          <span>Scenario DSL (YAML)</span>
          <textarea
            value={yamlText}
            onChange={e => setYamlText(e.target.value)}
            rows={14}
            style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', background: '#0b1224', color: 'inherit', border: '1px solid var(--border)', borderRadius: '.5rem', padding: '.75rem' }}
          />
        </label>
        <div className="row gap">
          <button onClick={runScenario} disabled={loading}>{loading ? 'Running…' : 'Run Scenario'}</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="stack">
          <h3>Results</h3>
          <details open>
            <summary>Accounting</summary>
            <pre className="code">{JSON.stringify(result.accounting, null, 2)}</pre>
          </details>
          <details>
            <summary>Compliance</summary>
            <pre className="code">{JSON.stringify(result.compliance, null, 2)}</pre>
          </details>
          <details>
            <summary>Macro</summary>
            <pre className="code">{JSON.stringify(result.macro, null, 2)}</pre>
          </details>
          <details>
            <summary>Raw payload</summary>
            <pre className="code">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}

