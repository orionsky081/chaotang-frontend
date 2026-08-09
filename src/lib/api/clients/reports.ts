/** Same-origin JSON REST client for report views. */

import type { Report } from '@/lib/contracts/report';
import { API_PATHS } from '../gateway';
import { ApiRequestOptions, buildApiRequestInit, buildAbsoluteApiUrl, normalizeApiResponseText, parseJson } from '../http';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const url = buildAbsoluteApiUrl(path);
  const requestInit = buildApiRequestInit({ cache: 'no-store', ...init });
  const response = typeof window === 'undefined'
    ? await fetch(url, requestInit)
    : await (await import('@/lib/auth')).authedFetch(url, requestInit);
  const payloadText = normalizeApiResponseText(await response.text().catch(() => ''), init);

  if (!response.ok) throw new ApiError(`REST ${response.status}`, response.status, payloadText ?? null);
  return parseJson<T>(payloadText ?? '', init, response.status);
}

export const reportsApi = {
  list(): Promise<Report[]> {
    return requestJson<Report[]>(API_PATHS.frontend.reports);
  },

  getById(id: string): Promise<Report> {
    return requestJson<Report>(API_PATHS.frontend.reportById(id));
  },
};

export const api = { reports: reportsApi };
