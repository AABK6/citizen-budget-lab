import yaml from 'js-yaml';

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
  target?: string;
};

type ScenarioPayload = {
  id?: string;
  dsl?: string | null;
  accounting?: {
    deficitPath?: number[];
    baselineDeficitPath?: number[];
    deficitDeltaPath?: number[];
    gdpPath?: number[];
    deficitRatioPath?: number[];
  } | null;
  macro?: {
    deltaDeficit?: number[];
  } | null;
  resolution?: {
    byMass?: Array<{
      massId: string;
      targetDeltaEur?: number;
      specifiedDeltaEur?: number;
      cpTargetDeltaEur?: number | null;
      cpSpecifiedDeltaEur?: number | null;
      cpDeltaEur?: number | null;
      unspecifiedCpDeltaEur?: number | null;
    }>;
  } | null;
};

type BaselinePayload = {
  legoBaseline?: {
    pib?: number;
    depensesTotal?: number;
    recettesTotal?: number;
    pieces?: Array<{ id: string; amountEur?: number }>;
  } | null;
  legoPieces?: Array<{ id: string; label?: string; type?: string }>;
  builderMassesAdmin?: Array<{ massId: string; amountEur?: number }>;
  missionLabels?: Array<{ id: string; displayLabel?: string }>;
};

const EPSILON = 1e-6;
const revenueFamilies = new Set(['TAXES', 'TAX_EXPENDITURES']);

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const truncate = (value: string, max = 40) => {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
};

const toNumberSeries = (series?: number[] | null) => {
  if (!Array.isArray(series)) return [];
  return series.map((value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  });
};

const formatSigned = (value: number) => {
  const abs = Math.abs(value) / 1e9;
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${abs.toFixed(1)} MdEUR`;
};

const formatTotal = (value: number) => `${(Math.abs(value) / 1e9).toFixed(1)} MdEUR`;

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

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

const resolveDelta = (action: DslAction) => {
  const amount = Number(action.amount_eur ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (action.op === 'increase') return amount;
  if (action.op === 'decrease') return -amount;
  return 0;
};

const formatOrientationLabel = (verb: string, percent: number | null, amount: number, label: string) => {
  if (Number.isFinite(percent)) {
    return `${verb} de ${percent!.toFixed(1)}% ${label}`;
  }
  return `${verb} ${formatTotal(amount)} ${label}`;
};

const decodeDsl = (dslBase64?: string | null) => {
  if (!dslBase64) {
    return { actions: [] as DslAction[], baselineYear: 2026 };
  }
  try {
    const decoded = Buffer.from(dslBase64, 'base64').toString('utf8');
    const parsed = yaml.load(decoded) as { actions?: DslAction[]; baseline_year?: number } | undefined;
    const actions = Array.isArray(parsed?.actions) ? parsed!.actions : [];
    const baselineYear = Number(parsed?.baseline_year ?? 2026);
    return {
      actions,
      baselineYear: Number.isFinite(baselineYear) ? baselineYear : 2026,
    };
  } catch {
    return { actions: [] as DslAction[], baselineYear: 2026 };
  }
};

const computeDeficitTotal = (
  accounting: ScenarioPayload['accounting'],
  macroDelta?: number[] | null,
) => {
  const totals = toNumberSeries(accounting?.deficitPath);
  if (totals.length > 0) return totals[0];
  const baseline = toNumberSeries(accounting?.baselineDeficitPath);
  const deltas = toNumberSeries(accounting?.deficitDeltaPath);
  const macro = toNumberSeries(macroDelta);
  const baseVal = baseline[0] ?? 0;
  const deltaVal = deltas[0] ?? 0;
  const macroVal = macro[0] ?? 0;
  return baseVal - deltaVal - macroVal;
};

const computeDeficitRatio = (
  accounting: ScenarioPayload['accounting'],
  deficit: number,
  baselineGdp: number | null,
) => {
  const ratios = toNumberSeries(accounting?.deficitRatioPath);
  if (ratios.length > 0) return ratios[0];
  const gdpSeries = toNumberSeries(accounting?.gdpPath);
  const gdp = gdpSeries.length > 0 ? gdpSeries[0] : baselineGdp ?? 0;
  if (!Number.isFinite(gdp) || gdp === 0) return null;
  return deficit / gdp;
};

const computeSpendingDelta = (resolution: ScenarioPayload['resolution']) => {
  const entries = Array.isArray(resolution?.byMass) ? resolution!.byMass! : [];
  let total = 0;
  for (const entry of entries) {
    const cpTarget = Number(entry.cpTargetDeltaEur ?? 0);
    const cpSpecified = Number(entry.cpSpecifiedDeltaEur ?? 0);
    const cpDeltaRaw =
      entry.cpDeltaEur ?? (Math.abs(cpTarget) > EPSILON ? cpTarget : cpSpecified);
    const cpDelta = Number(cpDeltaRaw ?? 0);
    if (Number.isFinite(cpDelta)) {
      total += cpDelta;
    }
  }
  return total;
};

const buildOgSvg = (payload: {
  scenarioId: string;
  deficit: number;
  deficitRatio: number | null;
  deficitDelta: number;
  spendingTotal: number;
  revenueTotal: number;
  spendingDelta: number;
  revenueDelta: number;
  levers: Array<{ label: string; impact: number }>;
}) => {
  const shortId = payload.scenarioId.slice(0, 8);
  const deficitColor = payload.deficit < 0 ? '#dc2626' : '#16a34a';
  const trendLabel =
    payload.deficitDelta === 0
      ? 'deficit stable'
      : payload.deficitDelta > 0
        ? `deficit reduit de ${formatTotal(Math.abs(payload.deficitDelta))}`
        : `deficit augmente de ${formatTotal(Math.abs(payload.deficitDelta))}`;
  const trendColor = payload.deficitDelta >= 0 ? '#16a34a' : '#dc2626';
  const ratioText = payload.deficitRatio === null ? 'ratio N/A' : `${formatPercent(payload.deficitRatio)} du PIB`;
  const spendingDeltaText =
    Math.abs(payload.spendingDelta) > 1e-3 ? ` (${formatSigned(payload.spendingDelta)})` : '';
  const revenueDeltaText =
    Math.abs(payload.revenueDelta) > 1e-3 ? ` (${formatSigned(payload.revenueDelta)})` : '';

  const leverLines =
    payload.levers.length > 0
      ? payload.levers.slice(0, 3).map((lever, index) => ({
          label: `${index + 1}. ${truncate(lever.label)}`,
          impact: formatSigned(lever.impact),
        }))
      : [{ label: 'Aucune mesure active', impact: '' }];

  const leverText = leverLines
    .map((line, index) => {
      const y = 360 + index * 46;
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

  <text x="64" y="78" fill="#0f172a" font-size="30" font-weight="700" font-family="Outfit, Arial, sans-serif">Votre budget citoyen</text>
  <text x="64" y="110" fill="#64748b" font-size="18" font-family="Outfit, Arial, sans-serif">Scenario ${escapeXml(
    shortId,
  )}</text>

  <text x="64" y="170" fill="#94a3b8" font-size="18" font-family="Outfit, Arial, sans-serif">Solde public</text>
  <text x="64" y="225" fill="${deficitColor}" font-size="54" font-weight="800" font-family="Outfit, Arial, sans-serif">${escapeXml(
    formatSigned(payload.deficit),
  )}</text>
  <text x="64" y="255" fill="#64748b" font-size="18" font-family="Outfit, Arial, sans-serif">${escapeXml(
    ratioText,
  )}</text>

  <rect x="64" y="275" width="440" height="36" rx="18" fill="${trendColor}" opacity="0.12"/>
  <text x="82" y="299" fill="${trendColor}" font-size="16" font-weight="600" font-family="Outfit, Arial, sans-serif">${escapeXml(
    trendLabel,
  )}</text>

  <rect x="64" y="330" width="520" height="86" rx="18" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="88" y="362" fill="#94a3b8" font-size="14" font-family="Outfit, Arial, sans-serif">Depenses</text>
  <text x="88" y="392" fill="#0f172a" font-size="20" font-weight="700" font-family="Outfit, Arial, sans-serif">${escapeXml(
    `${formatTotal(payload.spendingTotal)}${spendingDeltaText}`,
  )}</text>
  <text x="330" y="362" fill="#94a3b8" font-size="14" font-family="Outfit, Arial, sans-serif">Recettes</text>
  <text x="330" y="392" fill="#0f172a" font-size="20" font-weight="700" font-family="Outfit, Arial, sans-serif">${escapeXml(
    `${formatTotal(payload.revenueTotal)}${revenueDeltaText}`,
  )}</text>

  <text x="640" y="320" fill="#94a3b8" font-size="18" font-family="Outfit, Arial, sans-serif">Mesures principales</text>
  ${leverText}

  <text x="64" y="560" fill="#0f172a" font-size="20" font-weight="600" font-family="Outfit, Arial, sans-serif">Session citoyenne</text>
  <text x="64" y="590" fill="#64748b" font-size="16" font-family="Outfit, Arial, sans-serif">Partagez votre budget pour lui donner plus de poids.</text>
</svg>`;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const scenarioId = resolvedParams?.id || 'demo';
  const origin = new URL(req.url).origin;
  const endpoint = new URL('/api/graphql', origin).toString();

  const scenarioQuery = `
    query OgScenario($id: ID!) {
      scenario(id: $id) {
        id
        dsl
        accounting {
          deficitPath
          baselineDeficitPath
          deficitDeltaPath
          gdpPath
          deficitRatioPath
        }
        macro {
          deltaDeficit
        }
        resolution {
          byMass {
            massId
            targetDeltaEur
            specifiedDeltaEur
            cpTargetDeltaEur
            cpSpecifiedDeltaEur
            cpDeltaEur
            unspecifiedCpDeltaEur
          }
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
      body: JSON.stringify({ query: scenarioQuery, variables: { id: scenarioId } }),
      cache: 'no-store',
    });
    const js = await res.json();
    scenario = js?.data?.scenario ?? null;
    policyLevers = js?.data?.policyLevers ?? [];
    if (!scenario && Array.isArray(js?.errors) && js.errors.length > 0) {
      throw new Error('GraphQL error');
    }
  } catch {
    scenario = null;
    policyLevers = [];
  }

  const { actions, baselineYear } = decodeDsl(scenario?.dsl);

  const baselineQuery = `
    query OgBaseline($year: Int!) {
      legoBaseline(year: $year) {
        pib
        depensesTotal
        recettesTotal
        pieces { id amountEur }
      }
      legoPieces(year: $year) {
        id
        label
        type
      }
      builderMassesAdmin: builderMasses(year: $year, lens: ADMIN) {
        massId
        amountEur
      }
      missionLabels {
        id
        displayLabel
      }
    }
  `;

  let baselineData: BaselinePayload = {};
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: baselineQuery, variables: { year: baselineYear } }),
      cache: 'no-store',
    });
    const js = await res.json();
    baselineData = js?.data ?? {};
  } catch {
    baselineData = {};
  }

  const baselineTotals = {
    spending: Number(baselineData.legoBaseline?.depensesTotal ?? 0),
    revenue: Number(baselineData.legoBaseline?.recettesTotal ?? 0),
  };
  if (!Number.isFinite(baselineTotals.spending)) baselineTotals.spending = 0;
  if (!Number.isFinite(baselineTotals.revenue)) baselineTotals.revenue = 0;

  const baselineGdp = Number(baselineData.legoBaseline?.pib ?? 0);
  const safeBaselineGdp = Number.isFinite(baselineGdp) && baselineGdp > 0 ? baselineGdp : null;

  const missionLabelMap = new Map<string, string>();
  (baselineData.missionLabels ?? []).forEach((label) => {
    if (label?.id) {
      missionLabelMap.set(label.id, String(label.displayLabel || label.id));
    }
  });

  const baselineMasses = new Map<string, { name: string; amount: number }>();
  (baselineData.builderMassesAdmin ?? []).forEach((entry) => {
    if (!entry?.massId) return;
    const amount = Number(entry.amountEur ?? 0);
    const name = missionLabelMap.get(entry.massId) ?? entry.massId;
    baselineMasses.set(entry.massId, {
      name,
      amount: Number.isFinite(amount) ? amount : 0,
    });
  });

  const baselineAmounts: Record<string, number> = {};
  (baselineData.legoBaseline?.pieces ?? []).forEach((piece) => {
    if (piece?.id) baselineAmounts[piece.id] = Number(piece.amountEur ?? 0);
  });
  const piecesById = new Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>();
  (baselineData.legoPieces ?? []).forEach((piece) => {
    if (!piece?.id) return;
    const amount = Number(baselineAmounts[piece.id] ?? 0);
    const type = piece.type === 'revenue' ? 'revenue' : 'expenditure';
    piecesById.set(piece.id, {
      label: String(piece.label || piece.id),
      amount: Number.isFinite(amount) ? amount : 0,
      type,
    });
  });

  const deficit = computeDeficitTotal(scenario?.accounting, scenario?.macro?.deltaDeficit);
  const baselineDeficit = toNumberSeries(scenario?.accounting?.baselineDeficitPath)[0]
    ?? (baselineTotals.revenue - baselineTotals.spending);
  const deficitDelta = Number.isFinite(deficit) ? deficit - baselineDeficit : 0;
  const deficitRatio = computeDeficitRatio(scenario?.accounting, deficit, safeBaselineGdp);

  const spendingDelta = computeSpendingDelta(scenario?.resolution);
  const spendingTotal = baselineTotals.spending + spendingDelta;
  const safeSpendingTotal = Number.isFinite(spendingTotal) ? spendingTotal : baselineTotals.spending;
  const revenueTotal = safeSpendingTotal + deficit;
  const safeRevenueTotal = Number.isFinite(revenueTotal) ? revenueTotal : baselineTotals.revenue;
  const revenueDelta = safeRevenueTotal - baselineTotals.revenue;

  const leverMap = new Map(policyLevers.map((lever) => [lever.id, lever]));
  const seen = new Set<string>();
  const levers: Array<{ label: string; impact: number }> = [];

  for (const action of actions) {
    const lever = action.id ? leverMap.get(action.id) : undefined;
    if (lever) {
      if (!seen.has(lever.id)) {
        seen.add(lever.id);
        levers.push({
          label: lever.shortLabel || lever.label || lever.id,
          impact: resolveImpact(action, lever),
        });
      }
      continue;
    }

    const delta = resolveDelta(action);
    if (!delta) continue;
    const target = String(action.target || '');
    const isOrientation = action.id?.startsWith('target_') || target.startsWith('mission.');
    if (!isOrientation) continue;

    if (target.startsWith('mission.')) {
      const massId = target.slice('mission.'.length).toUpperCase();
      const base = baselineMasses.get(massId);
      const baseAmount = Math.abs(base?.amount ?? 0);
      const percent = baseAmount > 0 ? (Math.abs(delta) / baseAmount) * 100 : null;
      const name = base?.name ?? massId;
      const verb = delta >= 0 ? 'Augmenter' : 'Diminuer';
      const label = formatOrientationLabel(verb, percent, Math.abs(delta), name);
      if (!seen.has(label)) {
        seen.add(label);
        levers.push({ label, impact: -delta });
      }
      continue;
    }

    if (target.startsWith('piece.')) {
      const pieceId = target.slice('piece.'.length);
      const piece = piecesById.get(pieceId);
      const baseAmount = Math.abs(piece?.amount ?? 0);
      const percent = baseAmount > 0 ? (Math.abs(delta) / baseAmount) * 100 : null;
      const name = piece?.label ?? pieceId;
      const verb = delta >= 0 ? 'Augmenter' : 'Diminuer';
      const label = formatOrientationLabel(verb, percent, Math.abs(delta), name);
      let impact = delta;
      if (piece?.type === 'expenditure') {
        impact = -delta;
      }
      const idKey = `${action.id || pieceId}`;
      if (!seen.has(idKey)) {
        seen.add(idKey);
        levers.push({ label, impact });
      }
    }
  }

  const topLevers = levers
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3);

  const svg = buildOgSvg({
    scenarioId,
    deficit,
    deficitRatio,
    deficitDelta: Number.isFinite(deficitDelta) ? deficitDelta : 0,
    spendingTotal: safeSpendingTotal,
    revenueTotal: safeRevenueTotal,
    spendingDelta,
    revenueDelta,
    levers: topLevers,
  });

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}
