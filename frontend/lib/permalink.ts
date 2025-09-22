import { gqlRequest } from './graphql';
import { runScenarioMutation } from './queries';

export function encodeScenarioDsl(dsl: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(dsl, 'utf-8').toString('base64');
  }
  return window.btoa(unescape(encodeURIComponent(dsl)));
}

export async function runScenarioForDsl(dsl: string) {
  const encoded = encodeScenarioDsl(dsl);
  return gqlRequest(runScenarioMutation, { dsl: encoded });
}

export async function ensureScenarioIdFromDsl(dsl: string): Promise<string> {
  const result = await runScenarioForDsl(dsl);
  const scenarioId = result?.runScenario?.id;
  if (!scenarioId) {
    throw new Error('Scenario ID not returned by API');
  }
  return scenarioId;
}
