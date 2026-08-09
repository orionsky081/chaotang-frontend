/** Server-only transport for the same-origin JSON REST proxy. */
import { cookies, headers } from 'next/headers';

const BACKEND_BASE = (process.env.JIQUN_API_URL ?? 'http://127.0.0.1:8081').replace(/\/$/, '');

async function authHeaders(request?: Request): Promise<Record<string, string>> {
  const auth = request?.headers.get('authorization') ?? (await headers()).get('authorization');
  if (auth) return { Authorization: auth };
  const jar = await cookies();
  const token = jar.get('courtos.access_token')?.value ?? jar.get('token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function backendJsonRequest(
  sourceRequest: Request,
  path: string,
  init: { method: string; body?: string },
): Promise<Response> {
  const requestHeaders: Record<string, string> = {
    ...(await authHeaders(sourceRequest)),
    Accept: 'application/json',
  };
  if (init.body !== undefined) requestHeaders['Content-Type'] = 'application/json';

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_BASE}${path}`, {
      method: init.method,
      headers: requestHeaders,
      body: init.body,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return Response.json(
      { detail: 'backend_unavailable' },
      { status: 503 },
    );
  }

  const upstreamType = upstream.headers.get('content-type') ?? '';
  if (upstream.status !== 204 && !upstreamType.includes('application/json')) {
    return Response.json(
      { detail: 'backend_non_json_response_rejected' },
      { status: 502 },
    );
  }
  return upstream;
}

/** Server-side JSON POST that preserves the authenticated browser context. */
export function postBackendJsonRequest(
  sourceRequest: Request,
  path: string,
  payload: unknown,
): Promise<Response> {
  return backendJsonRequest(sourceRequest, path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Forward one browser JSON REST request to FastAPI without interpreting its
 * payload. This is the only primitive used by the catch-all BFF route: auth,
 * validation, persistence and response semantics remain backend concerns.
 */
export async function proxyBackendJsonRequest(request: Request, path: string): Promise<Response> {
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const requestHeaders: Record<string, string> = {
    ...(await authHeaders(request)),
    Accept: 'application/json',
  };
  const contentType = request.headers.get('content-type');
  const hasPayload = hasBody && request.body !== null;
  if (hasPayload && (!contentType || !/(?:^|\+)application\/json\b|\+json\b/i.test(contentType))) {
    return Response.json(
      { detail: 'json_request_required' },
      { status: 415 },
    );
  }
  if (contentType) requestHeaders['Content-Type'] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: hasPayload ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return Response.json(
      { detail: 'backend_unavailable' },
      { status: 503 },
    );
  }

  const upstreamType = upstream.headers.get('content-type') ?? '';
  if (upstream.status !== 204 && !upstreamType.includes('application/json')) {
    return Response.json(
      { detail: 'backend_non_json_response_rejected' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  if (upstreamType) responseHeaders.set('content-type', upstreamType);
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) responseHeaders.set('set-cookie', setCookie);
  return new Response(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}
