import { NextRequest } from 'next/server';
import { resolveBackendBase } from '@/lib/backend';

function buildHeaders(req: NextRequest, contentType?: string): Headers {
  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  const token = req.headers.get('x-admin-token');
  if (token) headers.set('x-admin-token', token);
  return headers;
}

export async function GET(req: NextRequest) {
  const target = `${resolveBackendBase()}/admin/policy-catalog`;
  const headers = buildHeaders(req);
  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    const payload = await upstream.text();
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);
    return new Response(payload, { status: upstream.status, headers: responseHeaders });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function POST(req: NextRequest) {
  const target = `${resolveBackendBase()}/admin/policy-catalog/validate`;
  const body = await req.text();
  const contentType = req.headers.get('content-type') || 'application/json';
  const headers = buildHeaders(req, contentType);
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
    const payload = await upstream.text();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    return new Response(payload, { status: upstream.status, headers: responseHeaders });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function PUT(req: NextRequest) {
  const target = `${resolveBackendBase()}/admin/policy-catalog`;
  const body = await req.text();
  const contentType = req.headers.get('content-type') || 'application/json';
  const headers = buildHeaders(req, contentType);
  try {
    const upstream = await fetch(target, {
      method: 'PUT',
      headers,
      body,
      cache: 'no-store',
    });
    const payload = await upstream.text();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    return new Response(payload, { status: upstream.status, headers: responseHeaders });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
