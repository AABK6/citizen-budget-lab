// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('api/og/[id] route', () => {
  it('returns an svg image response', async () => {
    const dsl = Buffer.from(
      `version: 0.1
baseline_year: 2026
actions:
  - id: lever-one
    op: increase
    amount_eur: 1000000000
`,
      'utf8',
    ).toString('base64');

    mockFetch.mockResolvedValue({
      json: async () => ({
        data: {
          scenario: {
            id: 'abc123',
            dsl,
            accounting: {
              deficitPath: [-120000000000],
              baselineDeficitPath: [-100000000000],
            },
            macro: { deltaGDP: [5000000000] },
          },
          policyLevers: [
            {
              id: 'lever-one',
              label: 'Lever One',
              shortLabel: 'Lever One',
              family: 'OTHER',
              budgetSide: 'SPENDING',
              fixedImpactEur: null,
            },
          ],
        },
      }),
    });

    const response = await GET(new Request('http://localhost/api/og/abc123'), {
      params: { id: 'abc123' },
    });

    expect(response.headers.get('content-type')).toContain('image/svg+xml');
    const body = await response.text();
    expect(body).toContain('Lever One');
    expect(body).toContain('Deficit');
  });
});
