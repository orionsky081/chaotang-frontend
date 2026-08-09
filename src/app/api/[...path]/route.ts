/**
 * 朝堂OS 唯一通用 BFF：浏览器只访问同源 `/api/**`，这里原样转发 JSON REST。
 * 本文件不得出现领域判断、持久化、模型调用或上游选择。
 */
import { proxyBackendJsonRequest } from '@/lib/courtos/server-backend';
import { isServerOnlyBackendMutation } from '@/lib/courtos/server-only-backend-mutations';
import { isServerOnlyBackendPath } from '@/lib/courtos/server-only-backend-paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const EXACT_BACKEND_PATHS: Readonly<Record<string, string>> = Object.freeze({
  chat: '/api/frontend/chat',
  'court/decision-judgment': '/api/frontend/decision-judgments',
  'court/observability/events': '/api/observability/events',
  'court/shiguan/stats': '/api/frontend/shiguan/stats',
  'manor/analyze': '/api/frontend/manor/analyze',
  'orchestration/run': '/api/frontend/orchestration/run',
  'qintian/chat': '/api/frontend/qintian/chat',
});

function backendPath(parts: string[], search: string): string {
  const relative = parts.map(encodeURIComponent).join('/');
  const exact = EXACT_BACKEND_PATHS[relative];
  if (exact) return `${exact}${search}`;

  const taskStatus = /^court\/task-status\/([^/]+)$/.exec(relative);
  if (taskStatus) return `/api/runs/stream/${taskStatus[1]}/status${search}`;

  return `/api/${relative}${search}`;
}

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  if (
    isServerOnlyBackendPath(path)
    || isServerOnlyBackendMutation(request.method, path)
  ) {
    return Response.json(
      { detail: 'not_found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const search = new URL(request.url).search;
  return proxyBackendJsonRequest(request, backendPath(path, search));
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
