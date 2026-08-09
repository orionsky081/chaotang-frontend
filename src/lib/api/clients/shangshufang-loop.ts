/**
 * Same-origin JSON REST client for the new DB-backed 上书房回路
 * (`web/routers/shangshufang.py`, prefix `/api/court/shangshufang`).
 *
 * 这是一套**独立于** `chaotang.ts`（旧 `/api/chaotang/study/*`，内存态，无 decision 端点）的系统——
 * 两者 task_id 不在同一 ID 空间，不可混用。见 `.plans/chaotang-golden-loop/frontend-dev/task-loop-ui/notes.md`。
 *
 * 已知后端坑（reviewer 真端点实测，2026-07-21）：
 * 1. 异常时返回 HTTP 200 + `{success:false}`（`return fail(str(exc))`，不抛异常）——
 *    禁止只看 HTTP 状态码，`unwrapPayload` 显式检查 `success` 字段。
 * 2. 准奏/驳回成功响应里 `status` 可能仍是 `awaiting_decision`（后端已知 bug，backend-dev 在修）——
 *    调用方必须用 `isTerminalTaskStatus(status)` 判断是否真落终态，不能只看 `success: true`。
 */
import type {
  CourtKernelIntakeRequest,
  DecisionRequest,
  DecisionResponse,
  DraftEdictRequest,
  DraftEdictResponse,
  ConfirmEdictRequest,
  ConfirmEdictResponse,
  PilotArchiveResponse,
  PilotDeviationCard,
  PilotReadinessResponse,
  PilotTelemetryResponse,
  PilotOutcomeRequest,
  PilotOutcomeResponse,
  HumanSignoffChallengeResponse,
  TaskStatusResponse,
} from '@/lib/contracts/shangshufang-loop';
import {
  hasSignoffRequiredFlag,
  ZHumanSignoffChallengeResponse,
} from '@/lib/contracts/shangshufang-loop';
import type { CourtRunPublicResult } from '@/lib/contracts/fulfillment';
import { buildAbsoluteApiUrl, buildApiRequestInit, normalizeApiResponseText, parseJson } from '../http';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string | { code?: string; message?: string };
  message?: string;
  detail?: string;
}

export class ShangshufangSignoffRequiredError extends Error {
  readonly needsSignoff = true;

  constructor(message: string) {
    super(message);
    this.name = 'ShangshufangSignoffRequiredError';
  }
}

export function isShangshufangSignoffRequiredError(
  error: unknown,
): error is ShangshufangSignoffRequiredError {
  return error instanceof ShangshufangSignoffRequiredError;
}

const BASE_PATH = '/api/court/shangshufang';

function withBase(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

function isEnvelope<T>(payload: ApiEnvelope<T> | T): payload is ApiEnvelope<T> {
  return (
    !!payload
    && typeof payload === 'object'
    && !Array.isArray(payload)
    && ('success' in payload || 'data' in payload || 'error' in payload || 'message' in payload || 'detail' in payload)
  );
}

function resolveServerMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
  if (candidate.error && typeof candidate.error === 'object' && !Array.isArray(candidate.error)) {
    const nested = candidate.error as Record<string, unknown>;
    if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
    if (typeof nested.code === 'string' && nested.code.trim()) return nested.code;
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  if (typeof candidate.detail === 'string' && candidate.detail.trim()) return candidate.detail;
  return undefined;
}

function unwrapPayload<T>(payload: ApiEnvelope<T> | T, path: string): T {
  if (!isEnvelope(payload)) return payload as T;
  if (payload.success === false) {
    const message = resolveServerMessage(payload) ?? `shangshufang_rest_${path}`;
    if (hasSignoffRequiredFlag(payload)) {
      throw new ShangshufangSignoffRequiredError(message);
    }
    throw new Error(message);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) return payload.data as T;
  return payload as T;
}

async function requestApi<T>(
  apiPath: string,
  init: Parameters<typeof buildApiRequestInit>[0] = {},
  acceptedStatuses: number[] = [],
): Promise<T> {
  const requestInit = buildApiRequestInit({ cache: 'no-store', ...init });
  const url = buildAbsoluteApiUrl(apiPath);
  const response = typeof window === 'undefined'
    ? await fetch(url, requestInit)
    : await (await import('@/lib/auth')).authedFetch(url, requestInit);
  const payloadText = normalizeApiResponseText(await response.text().catch(() => ''), init);
  const rawPayload = parseJson<ApiEnvelope<T> | T>(payloadText ?? '', init, response.status);

  if (hasSignoffRequiredFlag(rawPayload)) {
    throw new ShangshufangSignoffRequiredError(
      resolveServerMessage(rawPayload) ?? '高风险裁决需要人工签字凭据。',
    );
  }
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    const explicit = payloadText ? resolveServerMessage(rawPayload) : undefined;
    throw new Error(explicit ?? `shangshufang_rest_${response.status}`);
  }
  return unwrapPayload<T>(rawPayload, apiPath);
}

async function request<T>(path: string, init: Parameters<typeof buildApiRequestInit>[0] = {}): Promise<T> {
  return requestApi<T>(withBase(path), init);
}

const get = <T,>(path: string): Promise<T> => request<T>(path, { method: 'GET' });
const post = <T,>(path: string, body: unknown): Promise<T> => request<T>(path, { method: 'POST', body });

export const shangshufangLoop = {
  readiness: () =>
    requestApi<PilotReadinessResponse>('/api/ready', { method: 'GET' }, [503]),
  submitIntent: (body: CourtKernelIntakeRequest) =>
    post<CourtRunPublicResult>('/kernel/intake', body),
  draftEdict: (body: DraftEdictRequest) => post<DraftEdictResponse>('/draft-edict', body),
  confirmEdict: (body: ConfirmEdictRequest) => post<ConfirmEdictResponse>('/confirm-edict', body),
  taskStatus: (taskId: string) => get<TaskStatusResponse>(`/tasks/${encodeURIComponent(taskId)}/status`),
  decide: (taskId: string, body: DecisionRequest) =>
    post<DecisionResponse>(`/tasks/${encodeURIComponent(taskId)}/decision`, body),
  signoffChallenge: async (taskId: string, action: 'approve' | 'archive') =>
    ZHumanSignoffChallengeResponse.parse(
      await get<HumanSignoffChallengeResponse>(
        `/tasks/${encodeURIComponent(taskId)}/signoff-challenge?action=${encodeURIComponent(action)}`,
      ),
    ),
  archive: (taskId: string) =>
    get<PilotArchiveResponse>(`/tasks/${encodeURIComponent(taskId)}/archive`),
  recordOutcome: (taskId: string, body: PilotOutcomeRequest) =>
    post<PilotOutcomeResponse>(`/tasks/${encodeURIComponent(taskId)}/outcomes`, body),
  deviationCard: (taskId: string) =>
    get<PilotDeviationCard>(`/tasks/${encodeURIComponent(taskId)}/deviation-card`),
  telemetry: (taskId: string) =>
    get<PilotTelemetryResponse>(`/tasks/${encodeURIComponent(taskId)}/telemetry`),
};
