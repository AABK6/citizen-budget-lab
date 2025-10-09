export type NumericSeries = Array<number | null | undefined> | null | undefined;

function toNumberSeries(series: NumericSeries): number[] {
  if (!Array.isArray(series)) {
    return [];
  }
  return series.map((value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  });
}

export function combineSeries(...series: NumericSeries[]): number[] {
  const numericSeries = series.map(toNumberSeries);
  const maxLength = numericSeries.reduce((max, arr) => (arr.length > max ? arr.length : max), 0);
  const result: number[] = new Array(maxLength).fill(0);

  for (let i = 0; i < maxLength; i += 1) {
    let total = 0;
    for (const arr of numericSeries) {
      if (i < arr.length) {
        total += arr[i];
      }
    }
    result[i] = total;
  }

  return result;
}

export function computeDeficitTotals(
  accounting: {
    baselineDeficitPath?: NumericSeries;
    deficitDeltaPath?: NumericSeries;
    deficitPath?: NumericSeries;
  } | null | undefined,
  macroDelta?: NumericSeries,
): number[] {
  const totals = toNumberSeries(accounting?.deficitPath);
  if (totals.length > 0) {
    return totals;
  }
  const baseline = toNumberSeries(accounting?.baselineDeficitPath);
  const deltas = toNumberSeries(accounting?.deficitDeltaPath);
  const macro = toNumberSeries(macroDelta);
  const maxLength = Math.max(baseline.length, deltas.length, macro.length);
  if (maxLength === 0) {
    return totals;
  }
  const result: number[] = new Array(maxLength).fill(0);
  for (let i = 0; i < maxLength; i += 1) {
    const baseVal = i < baseline.length ? baseline[i] : 0;
    const deltaVal = i < deltas.length ? deltas[i] : 0;
    const macroVal = i < macro.length ? macro[i] : 0;
    result[i] = baseVal - deltaVal - macroVal;
  }
  return result;
}

export function computeDeficitDeltas(
  accounting: {
    deficitDeltaPath?: NumericSeries;
    baselineDeficitPath?: NumericSeries;
    deficitPath?: NumericSeries;
  } | null | undefined,
  macroDelta?: NumericSeries,
): number[] {
  const totals = toNumberSeries(accounting?.deficitPath);
  const baseline = toNumberSeries(accounting?.baselineDeficitPath);
  if (totals.length && baseline.length) {
    const length = Math.max(totals.length, baseline.length);
    const result: number[] = new Array(length).fill(0);
    for (let i = 0; i < length; i += 1) {
      const total = i < totals.length ? totals[i] : 0;
      const base = i < baseline.length ? baseline[i] : 0;
      result[i] = total - base;
    }
    return result;
  }
  const deltas = toNumberSeries(accounting?.deficitDeltaPath);
  const macro = toNumberSeries(macroDelta);
  const maxLength = Math.max(deltas.length, macro.length);
  if (maxLength === 0) {
    return totals;
  }
  const result: number[] = new Array(maxLength).fill(0);
  for (let i = 0; i < maxLength; i += 1) {
    const deltaVal = i < deltas.length ? deltas[i] : 0;
    const macroVal = i < macro.length ? macro[i] : 0;
    result[i] = -(deltaVal + macroVal);
  }
  return result;
}

export function computeDebtTotals(
  accounting: {
    baselineDebtPath?: NumericSeries;
    debtDeltaPath?: NumericSeries;
    debtPath?: NumericSeries;
  } | null | undefined,
): number[] {
  const combined = combineSeries(
    accounting?.baselineDebtPath,
    accounting?.debtDeltaPath,
  );
  if (combined.length > 0) {
    return combined;
  }
  return toNumberSeries(accounting?.debtPath);
}

export function computeDebtDeltas(
  accounting: {
    debtDeltaPath?: NumericSeries;
    baselineDebtPath?: NumericSeries;
    debtPath?: NumericSeries;
  } | null | undefined,
): number[] {
  const combined = combineSeries(accounting?.debtDeltaPath);
  if (combined.length > 0) {
    return combined;
  }
  const totals = toNumberSeries(accounting?.debtPath);
  const baseline = toNumberSeries(accounting?.baselineDebtPath);
  if (totals.length && baseline.length) {
    const length = Math.max(totals.length, baseline.length);
    const result: number[] = new Array(length).fill(0);
    for (let i = 0; i < length; i += 1) {
      const total = i < totals.length ? totals[i] : 0;
      const base = i < baseline.length ? baseline[i] : 0;
      result[i] = total - base;
    }
    return result;
  }
  return totals;
}

export function firstValue(series: NumericSeries, fallback = 0): number {
  if (!Array.isArray(series) || series.length === 0) {
    return fallback;
  }
  const num = Number(series[0]);
  return Number.isFinite(num) ? num : fallback;
}

export function toNumber(series: number | null | undefined, fallback = 0): number {
  const num = Number(series);
  return Number.isFinite(num) ? num : fallback;
}
