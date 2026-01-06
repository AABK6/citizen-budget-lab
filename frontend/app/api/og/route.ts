import { NextRequest } from 'next/server';

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get('scenarioId') || 'demo';
  const url = new URL(req.url);
  url.pathname = `/api/og/${scenarioId}`;
  url.search = '';
  return Response.redirect(url);
}
