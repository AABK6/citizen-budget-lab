import type { AggregationLens } from '@/app/build/types';
import { gqlRequest } from './graphql';
import { runScenarioMutation } from './queries';

export function encodeScenarioDsl(dsl: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(dsl, 'utf-8').toString('base64');
  }
  return window.btoa(unescape(encodeURIComponent(dsl)));
}

export async function runScenarioForDsl(dsl: string, lens: AggregationLens) {
  const encoded = encodeScenarioDsl(dsl);
  const lensEnum = lens === 'COFOG' ? 'COFOG' : 'ADMIN';
  return gqlRequest(runScenarioMutation, { dsl: encoded, lens: lensEnum });
}

export async function ensureScenarioIdFromDsl(dsl: string, lens: AggregationLens): Promise<string> {
  const result = await runScenarioForDsl(dsl, lens);
  const scenarioId = result?.runScenario?.id;
  if (!scenarioId) {
    throw new Error('Scenario ID not returned by API');
  }
  return scenarioId;
}
