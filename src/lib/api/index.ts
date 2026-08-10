import { getToken, clearSession, refreshAccessToken } from '../auth';
import { APP_BASE_PATH } from '../base-path';
import { interceptMock } from './mock/interceptor';

export { API_PATHS, apiGateway, ApiError, buildApiPath, getJson, postJson } from './gateway';

const V1_BASE = `${APP_BASE_PATH}/api/v1`;

function sameOriginApiPath(path: string): string {
  if (APP_BASE_PATH && path.startsWith(`${APP_BASE_PATH}/`)) return path;
  if (path.startsWith('/api/')) return `${APP_BASE_PATH}${path}`;
  return `${V1_BASE}${path}`;
}

async function doFetch(path: string, init?: RequestInit, token?: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(sameOriginApiPath(path), { ...init, headers });
}

async function apiFetchResponse(path: string, init?: RequestInit): Promise<Response> {
  const isBrowser = typeof window !== 'undefined';
  let token = isBrowser ? getToken() : null;
  const isAuthEndpoint = path.startsWith('/auth/');
  if (isAuthEndpoint) token = null;

  let response = await doFetch(path, init, token);
  if (response.status === 401 && isBrowser && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();
    if (newToken) response = await doFetch(path, init, newToken);
    if (response.status === 401) {
      clearSession();
      const loginPath = `${APP_BASE_PATH}/login`;
      if (!window.location.pathname.startsWith(loginPath)) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `${loginPath}?next=${next}`;
      }
      throw new Error(`401 Unauthorized — redirected to ${loginPath}`);
    }
  }
  return response;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Mock 拦截
  const mockData = interceptMock<T>(path, init?.method ?? 'GET');
  if (mockData !== undefined) return mockData;

  const response = await apiFetchResponse(path, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${path}`);

  const rawBody = await response.text().catch(() => '');
  if (!rawBody) return undefined as T;
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = rawBody;
  }
  return ((body as { data?: T })?.data ?? body) as T;
}

export function swrFetcher<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export const api = {
  get: <T = unknown>(path: string): Promise<T> => apiFetch<T>(path),
  post: <T = unknown>(path: string, data: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T = unknown>(path: string, data: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  put: <T = unknown>(path: string, data: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  del: <T = unknown>(path: string): Promise<T> => apiFetch<T>(path, { method: 'DELETE' }),
  raw: (path: string, init?: RequestInit): Promise<Response> => apiFetchResponse(path, init),
};
