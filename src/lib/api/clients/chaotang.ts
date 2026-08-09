/** Same-origin JSON REST client for the surviving court views. */

import type { DecreeDraft, DispatchBody, DispatchResult } from '@/lib/contracts/decree';
import type { MemorialBrief, MemorialDetail, ReviewAction, ReviewActionType } from '@/lib/contracts/memorial';
import type { StudyRunRequest, StudyRunResponse } from '@/lib/contracts/study-edict';
import { API_PATHS } from '../gateway';
import { buildAbsoluteApiUrl, buildApiRequestInit, normalizeApiResponseText, parseJson } from '../http';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  detail?: string;
}

const CHAOTANG_BASE_PATH = API_PATHS.chaotang.base;

function withBase(path: string): string {
  return `${CHAOTANG_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

function isChaotangEnvelope<T>(payload: ApiEnvelope<T> | T): payload is ApiEnvelope<T> {
  return (
    !!payload
    && typeof payload === 'object'
    && !Array.isArray(payload)
    && ('success' in payload || 'data' in payload || 'error' in payload || 'message' in payload || 'detail' in payload)
  );
}

function unwrapPayload<T>(payload: ApiEnvelope<T> | T, path: string): T {
  if (!isChaotangEnvelope(payload)) return payload as T;
  if (payload.success === false) throw new Error(resolveServerMessage(payload) ?? `court_rest_${path}`);
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) return payload.data as T;
  return payload as T;
}

function resolveServerMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
  if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  if (typeof candidate.detail === 'string' && candidate.detail.trim()) return candidate.detail;
  return undefined;
}

async function request<T>(path: string, init: Parameters<typeof buildApiRequestInit>[0] = {}): Promise<T> {
  const requestInit = buildApiRequestInit({ cache: 'no-store', ...init });
  const url = buildAbsoluteApiUrl(withBase(path));
  const response = typeof window === 'undefined'
    ? await fetch(url, requestInit)
    : await (await import('@/lib/auth')).authedFetch(url, requestInit);
  const payloadText = normalizeApiResponseText(await response.text().catch(() => ''), init);
  const rawPayload = parseJson<ApiEnvelope<T> | T>(payloadText ?? '', init, response.status);

  if (!response.ok) {
    const explicit = payloadText ? resolveServerMessage(rawPayload) : undefined;
    throw new Error(explicit ?? `court_rest_${response.status}`);
  }
  return unwrapPayload<T>(rawPayload, path);
}

const get = <T,>(path: string, init: Parameters<typeof request>[1] = {}): Promise<T> => request<T>(path, { ...init, method: 'GET' });
const post = <T,>(path: string, body: unknown, init: Parameters<typeof request>[1] = {}): Promise<T> => request<T>(path, {
  ...init,
  method: 'POST',
  body,
});

export const chaotang = {
  decreeDraft: (rawCommand: string) => post<DecreeDraft>('/decree/draft', { rawCommand }),
  decreeDispatch: (body: DispatchBody) => post<DispatchResult>('/decree/dispatch', body),
  studyRun: (body: StudyRunRequest) => post<StudyRunResponse>('/study/run', body),
  studyRunStatus: (taskId: string) => get<StudyRunResponse>(`/study/run/${encodeURIComponent(taskId)}`),
  studyBriefing: () => get<Record<string, unknown>>('/study/briefing'),
  tasks: () => get<Record<string, unknown>[]>('/tasks'),
  taskDetail: (id: string) => get<Record<string, unknown>>(`/tasks/${encodeURIComponent(id)}`),
  memorials: () => get<MemorialBrief[]>('/memorials'),
  memorialDetail: (id: string) => get<MemorialDetail>(`/memorials/${encodeURIComponent(id)}`),
  review: (id: string, action: ReviewActionType, comment: string) =>
    post<ReviewAction>(`/memorials/${encodeURIComponent(id)}/review`, { action, comment }),
  archive: () => get<{ memorials: MemorialBrief[]; decisions: ReviewAction[] }>('/archive'),
};
