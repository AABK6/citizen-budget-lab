import yaml from 'js-yaml';
import { resolveGraphqlUrl } from '@/lib/backend';

type PolicyLever = {
  id: string;
  label: string;
  shortLabel?: string | null;
  family?: string | null;
  budgetSide?: string | null;
  fixedImpactEur?: number | null;
};

type DslAction = {
  id?: string;
  op?: string;
  amount_eur?: number;
};

type ScenarioPayload = {
  id?: string;
  dsl?: string | null;
  accounting?: {
    deficitPath?: number[];
    baselineDeficitPath?: number[];
    deficitDeltaPath?: number[];
  } | null;
  macro?: {
    deltaGDP?: number[];
  } | null;
};

const revenueFamilies = new Set(['TAXES', 'TAX_EXPENDITURES']);

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const truncate = (value: string, max = 42) => {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
};

const formatBillions = (value: number) => {
  const abs = Math.abs(value) / 1e9;
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${abs.toFixed(1)} MdEUR`;
};

const firstNumber = (series?: number[] | null) => {
  if (!Array.isArray(series) || series.length === 0) return 0;
  const num = Number(series[0]);
  return Number.isFinite(num) ? num : 0;
};

const resolveBudgetSide = (lever: PolicyLever) =>
  lever.budgetSide ?? (revenueFamilies.has(String(lever.family)) ? 'REVENUE' : 'SPENDING');

const resolveImpact = (action: DslAction, lever: PolicyLever) => {
  const leverImpact = Number(lever.fixedImpactEur ?? 0);
  if (Number.isFinite(leverImpact) && leverImpact !== 0) {
    return leverImpact;
  }
  const amount = Number(action.amount_eur ?? 0);
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }
  const side = resolveBudgetSide(lever);
  if (side === 'REVENUE') {
    return action.op === 'increase' ? amount : -amount;
  }
  if (side === 'SPENDING') {
    return action.op === 'increase' ? -amount : amount;
  }
  return action.op === 'increase' ? amount : -amount;
};

const decodeActions = (dslBase64?: string | null): DslAction[] => {
  if (!dslBase64) return [];
  try {
    const decoded = Buffer.from(dslBase64, 'base64').toString('utf8');
    const parsed = yaml.load(decoded) as { actions?: DslAction[] } | undefined;
    if (!parsed || !Array.isArray(parsed.actions)) return [];
    return parsed.actions.filter((action) => action && typeof action === 'object');
  } catch {
    return [];
  }
};

const buildOgSvg = (payload: {
  scenarioId: string;
  deficitDelta: number;
  growthImpact: number;
  topReforms: Array<{ label: string; impact: number }>;
}) => {
  const shortId = payload.scenarioId.slice(0, 8);
  const deficitColor = payload.deficitDelta >= 0 ? '#16a34a' : '#dc2626';
  const growthColor = payload.growthImpact >= 0 ? '#16a34a' : '#dc2626';
  const reformLines =
    payload.topReforms.length > 0
      ? payload.topReforms.slice(0, 2).map((reform, index) => ({
          label: `${index + 1}. ${truncate(reform.label)}`,
          impact: formatBillions(reform.impact),
        }))
      : [{ label: 'Aucune mesure active', impact: '' }];

  const reformText = reformLines
    .map((line, index) => {
      const y = 300 + index * 40;
      return `
        <text x="640" y="${y}" fill="#0f172a" font-size="22" font-family="Outfit, Arial, sans-serif">${escapeXml(
          line.label,
        )}</text>
        <text x="640" y="${y + 22}" fill="#64748b" font-size="16" font-family="Outfit, Arial, sans-serif">${escapeXml(
          line.impact,
        )}</text>
      `;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="10" fill="url(#bar)"/>

  <text x="64" y="80" fill="#0f172a" font-size="32" font-weight="700" font-family="Outfit, Arial, sans-serif">Citizen Budget Lab</text>
  <text x="64" y="112" fill="#64748b" font-size="18" font-family="Outfit, Arial, sans-serif">Scenario ${escapeXml(
    shortId,
  )}</text>

  <text x="64" y="190" fill="#94a3b8" font-size="18" font-family="Outfit, Arial, sans-serif">Deficit vs baseline</text>
  <text x="64" y="245" fill="${deficitColor}" font-size="54" font-weight="800" font-family="Outfit, Arial, sans-serif">${escapeXml(
    formatBillions(payload.deficitDelta),
  )}</text>

  <text x="64" y="300" fill="#94a3b8" font-size="18" font-family="Outfit, Arial, sans-serif">GDP impact (year 1)</text>
  <text x="64" y="340" fill="${growthColor}" font-size="32" font-weight="700" font-family="Outfit, Arial, sans-serif">${escapeXml(
    formatBillions(payload.growthImpact),
  )}</text>

  <text x="640" y="250" fill="#94a3b8" font-size="18" font-family="Outfit, Arial, sans-serif">Top reforms</text>
  ${reformText}

  <text x="64" y="560" fill="#0f172a" font-size="22" font-weight="600" font-family="Outfit, Arial, sans-serif">Session citoyenne</text>
  <text x="64" y="590" fill="#64748b" font-size="16" font-family="Outfit, Arial, sans-serif">Share your budget to grow its political weight.</text>
</svg>`;
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenarioId = params?.id || 'demo';
  const endpoint = resolveGraphqlUrl();
  const gql = `
    query OgScenario($id: ID!) {
      scenario(id: $id) {
        id
        dsl
        accounting {
          deficitPath
          baselineDeficitPath
          deficitDeltaPath
        }
        macro {
          deltaGDP
        }
      }
      policyLevers {
        id
        label
        shortLabel
        family
        budgetSide
        fixedImpactEur
      }
    }
  `;

  let scenario: ScenarioPayload | null = null;
  let policyLevers: PolicyLever[] = [];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { id: scenarioId } }),
    });
    const js = await res.json();
    scenario = js?.data?.scenario ?? null;
    policyLevers = js?.data?.policyLevers ?? [];
  } catch {
    scenario = null;
    policyLevers = [];
  }

  const deficit = firstNumber(scenario?.accounting?.deficitPath);
  const baselineDeficit = firstNumber(scenario?.accounting?.baselineDeficitPath);
  let deficitDelta = deficit - baselineDeficit;
  if (!Number.isFinite(deficitDelta)) {
    deficitDelta = 0;
  }

  const growthImpact = firstNumber(scenario?.macro?.deltaGDP);

  const actions = decodeActions(scenario?.dsl);
  const leverMap = new Map(policyLevers.map((lever) => [lever.id, lever]));
  const seen = new Set<string>();
  const topReforms = actions
    .map((action) => {
      const leverId = action.id ?? '';
      const lever = leverMap.get(leverId);
      if (!lever || seen.has(leverId)) return null;
      const impact = resolveImpact(action, lever);
      if (!impact) return null;
      seen.add(leverId);
      return {
        label: lever.shortLabel || lever.label || leverId,
        impact,
      };
    })
    .filter((item): item is { label: string; impact: number } => Boolean(item))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 2);

  const svg = buildOgSvg({
    scenarioId,
    deficitDelta,
    growthImpact,
    topReforms,
  });

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}
