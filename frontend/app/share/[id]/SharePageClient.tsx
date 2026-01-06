"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { gqlRequest } from '@/lib/graphql';
import type { ScenarioResult } from '@/lib/types';
import { computeDeficitTotals, computeDeficitDeltas, computeDebtDeltas, firstValue } from '@/lib/fiscal';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { CallOut } from '@codegouvfr/react-dsfr/CallOut';
import { Card } from '@codegouvfr/react-dsfr/Card';
import { Highlight } from '@codegouvfr/react-dsfr/Highlight';
import { Tag } from '@codegouvfr/react-dsfr/Tag';

const getScenarioQuery = `
  query GetScenario($id: ID!) {
    scenario(id: $id) {
      id
      accounting {
        deficitPath
        debtPath
        commitmentsPath
        deficitDeltaPath
        debtDeltaPath
        baselineDeficitPath
        baselineDebtPath
        gdpPath
        deficitRatioPath
        baselineDeficitRatioPath
        debtRatioPath
        baselineDebtRatioPath
      }
      compliance { eu3pct eu60pct netExpenditure localBalance }
      macro { deltaGDP deltaEmployment deltaDeficit assumptions }
      resolution { overallPct byMass { massId targetDeltaEur specifiedDeltaEur } }
    }
  }
`;

const formatBillions = (value: number, signed = false) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const abs = Math.abs(num) / 1e9;
  const sign = signed ? (num >= 0 ? '+' : '-') : num < 0 ? '-' : '';
  return `${sign}${abs.toFixed(1)} Md€`;
};

const formatPercent = (ratio: number) => {
  const num = Number(ratio);
  if (!Number.isFinite(num)) return '—';
  return `${(num * 100).toFixed(1)}%`;
};

const resolveComplianceSeverity = (status?: string): 'success' | 'warning' | 'error' | 'info' => {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('ok')) return 'success';
  if (normalized.includes('above')) return 'warning';
  if (normalized.includes('breach')) return 'error';
  return 'info';
};

const resolveComplianceLabel = (status?: string) => {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('ok')) return 'Conforme';
  if (normalized.includes('above')) return 'Au-dessus';
  if (normalized.includes('breach')) return 'Hors limite';
  if (normalized.includes('info')) return 'Information';
  return 'À vérifier';
};

export default function SharePageClient({ scenarioId }: { scenarioId: string }) {
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!scenarioId) {
      setError('L\'identifiant de scénario est requis');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await gqlRequest(getScenarioQuery, { id: scenarioId });
      if (!data?.scenario) {
        throw new Error('Scénario introuvable');
      }
      setScenario(data.scenario);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec du chargement des données du scénario';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scenarioLabel = useMemo(() => {
    const raw = scenario?.id ?? scenarioId ?? '';
    if (!raw) return '—';
    return raw.length > 10 ? raw.slice(0, 10) : raw;
  }, [scenario?.id, scenarioId]);

  const summary = useMemo(() => {
    if (!scenario) return null;
    const deficitTotals = computeDeficitTotals(scenario.accounting, scenario.macro?.deltaDeficit);
    const deficitDeltas = computeDeficitDeltas(scenario.accounting, scenario.macro?.deltaDeficit);
    const debtDeltas = computeDebtDeltas(scenario.accounting);
    const deficitValue = firstValue(deficitTotals, 0);
    const deficitDelta = firstValue(deficitDeltas, 0);
    const debtDelta = debtDeltas.length > 0 ? debtDeltas[debtDeltas.length - 1] : 0;

    let ratioValue: number | null = null;
    const ratioSeries = scenario.accounting?.deficitRatioPath;
    if (Array.isArray(ratioSeries) && ratioSeries.length > 0) {
      const raw = Number(ratioSeries[0]);
      if (Number.isFinite(raw)) {
        ratioValue = raw;
      }
    }
    if (ratioValue === null) {
      const gdp0 = Number(scenario.accounting?.gdpPath?.[0]);
      if (Number.isFinite(gdp0) && gdp0 !== 0) {
        ratioValue = deficitValue / gdp0;
      }
    }

    return {
      deficitValue,
      deficitDelta,
      debtDelta,
      ratioText: ratioValue === null ? undefined : `${formatPercent(ratioValue)} du PIB`,
      resolutionPct: Number(scenario.resolution?.overallPct ?? 0),
    };
  }, [scenario]);

  const complianceBadges = useMemo(() => {
    if (!scenario?.compliance) return [];
    return [
      { label: 'UE 3%', status: scenario.compliance.eu3pct?.[0] },
      { label: 'UE 60%', status: scenario.compliance.eu60pct?.[0] },
      { label: 'Règle dépense nette', status: scenario.compliance.netExpenditure?.[0] },
      { label: 'Solde local', status: scenario.compliance.localBalance?.[0] },
    ];
  }, [scenario]);

  if (loading) {
    return (
      <div className="w-full h-full overflow-auto">
        <div className="container">
          <Alert severity="info" title="Chargement…" />
        </div>
      </div>
    );
  }

  if (error || !scenario || !summary) {
    return (
      <div className="w-full h-full overflow-auto">
        <div className="container">
          <Alert severity="error" title="Erreur de chargement" description={error ?? 'Scénario indisponible'} />
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Δ déficit vs référence',
      value: formatBillions(summary.deficitDelta, true),
      hint: 'Année 1',
    },
    {
      label: 'Δ dette (fin)',
      value: formatBillions(summary.debtDelta, true),
      hint: 'Fin de période',
    },
    {
      label: 'Budget financé',
      value: formatPercent(summary.resolutionPct),
      hint: 'Part des mesures validées',
    },
  ];

  return (
    <div className="w-full h-full overflow-auto">
      <div className="container stack">
        <div className="flex flex-wrap items-center gap-2">
          <Badge severity="success" small>
            Vote enregistré
          </Badge>
          <Tag small>Scénario {scenarioLabel}</Tag>
        </div>

        <div>
          <h1 className="fr-h1">Votre budget citoyen est prêt</h1>
          <p className="fr-text--lg">
            Voici l&apos;essentiel de votre arbitrage : une photographie rapide à partager dès que vous le souhaitez.
          </p>
        </div>

        <Highlight size="lg">
          <span className="block fr-text--sm">Solde public 2026</span>
          <span className="block fr-h3">{formatBillions(summary.deficitValue)}</span>
          {summary.ratioText && <span className="block fr-text--xs">{summary.ratioText}</span>}
        </Highlight>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <Card
              key={metric.label}
              title={metric.label}
              desc={<span className="fr-text--xl">{metric.value}</span>}
              detail={metric.hint}
              border
              shadow
            />
          ))}
        </div>

        {complianceBadges.length > 0 && (
          <div className="stack">
            <h2 className="fr-h3">Règles européennes & discipline</h2>
            <div className="flex flex-wrap gap-2">
              {complianceBadges.map((item) => (
                <Badge key={item.label} severity={resolveComplianceSeverity(item.status)}>
                  {item.label} · {resolveComplianceLabel(item.status)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <CallOut title="Session Extraordinaire Citoyenne">
          Plus les budgets citoyens seront nombreux, plus cette consultation pèsera dans le débat public.
        </CallOut>

        <div className="flex flex-wrap gap-3">
          <Button priority="secondary" linkProps={{ href: `/build?scenarioId=${encodeURIComponent(scenarioId)}` }}>
            Revenir au simulateur
          </Button>
          <Button priority="tertiary" linkProps={{ href: '/build' }}>
            Créer un autre scénario
          </Button>
        </div>
      </div>
    </div>
  );
}
