import { buildAbsoluteApiUrl, buildApiRequestInit, normalizeApiResponseText, parseJson } from './http';

export const API_PATHS = {
  admin: {
    base: '/api/admin',
  },
  chaotang: {
    base: '/api/chaotang',
    studyBriefing: '/api/chaotang/study/briefing',
  },
  court: {
    intelSignals: '/api/court/intel/signals',
  },
  system: {
    health: '/api/health',
  },
  auth: {
    bootstrap: '/api/v1/auth/bootstrap',
    localLogin: '/api/auth/local-login',
    register: '/api/auth/register',
    verifyInvite: '/api/auth/verify-invite',
    logout: '/api/auth/logout',
  },
  prompt: {
    suggest: '/api/prompt/suggest',
  },
  frontend: {
    buildLedger: '/api/frontend/build-ledger',
    courtPulse: '/api/frontend/court-pulse',
    courtObservabilityEvents: '/api/court/observability/events',
    courtShangshufangFinanceIntelLoopCases: '/api/court/shangshufang/finance-intel-loop/cases',
    courtShangshufangDecisionAdvance: '/api/court/shangshufang/briefs',
    hanlinOverview: '/api/frontend/hanlin/overview',
    hanlinContributions: '/api/frontend/hanlin/contributions',
    governanceBills: '/api/frontend/governance/bills',
    governanceDeliberate: '/api/frontend/governance/deliberate',
    governanceConstitutions: '/api/frontend/governance/constitutions',
    governanceAuditSummary: '/api/frontend/governance/audit/summary',
    powerStatus: '/api/frontend/power-status',
    commandCenterOrchestrationRun: '/api/frontend/orchestration/run',
    courtDecision: '/api/court/decision',
    decisionBacktest: '/api/frontend/decision-backtest',
    libu: '/api/frontend/libu',
    manorMetrics: '/api/frontend/manor-metrics',
    reports: '/api/frontend/reports',
    reportById: (id: string) => `/api/frontend/reports/${encodeURIComponent(id)}`,
    shiguanStats: '/api/frontend/shiguan/stats',
    healthProfile: '/api/frontend/health-profile',
    intelBoard: (limit: number) => `/api/frontend/intel/board?limit=${limit}`,
    council: (limit: number) => `/api/frontend/council?limit=${limit}`,
    forecastBoard: (limit: number) => `/api/frontend/forecast/board?limit=${limit}`,
  },
} as const;

export type ApiPath = string;

export class ApiError extends Error {
  public readonly status: number;
  public readonly path: string;
  public readonly body: string;

  constructor(status: number, path: string, body: string) {
    super(`HTTP ${status} on ${path}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  expectJson?: boolean;
}

export function buildApiPath(path: string): string {
  return buildAbsoluteApiUrl(path);
}

async function requestJson<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(buildApiPath(path), buildApiRequestInit(init));
  const payloadText = normalizeApiResponseText(await response.text().catch(() => ''), init);

  if (!response.ok) {
    throw new ApiError(response.status, path, payloadText ?? '');
  }

  try {
    return parseJson<T>(payloadText ?? '', init, response.status);
  } catch {
    throw new Error(`Invalid JSON response from ${path}`);
  }
}

export const apiGateway = {
  get: <T>(path: string, init: ApiRequestOptions = {}): Promise<T> =>
    requestJson<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body: unknown, init: ApiRequestOptions = {}): Promise<T> =>
    requestJson<T>(path, { ...init, method: 'POST', body }),

  put: <T>(path: string, body: unknown, init: ApiRequestOptions = {}): Promise<T> =>
    requestJson<T>(path, { ...init, method: 'PUT', body }),

  patch: <T>(path: string, body: unknown, init: ApiRequestOptions = {}): Promise<T> =>
    requestJson<T>(path, { ...init, method: 'PATCH', body }),

  del: <T>(path: string, init: ApiRequestOptions = {}): Promise<T> =>
    requestJson<T>(path, { ...init, method: 'DELETE' }),
};

export async function getJson<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  return apiGateway.get<T>(path, init);
}

export async function postJson<T>(path: string, body: unknown, init: ApiRequestOptions = {}): Promise<T> {
  return apiGateway.post<T>(path, body, init);
}
