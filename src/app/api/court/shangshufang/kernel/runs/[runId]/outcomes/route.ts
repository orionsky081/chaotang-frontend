import {
  ZBrowserOutcomeCommand,
  ZQueuedOutcomeEnvelope,
} from '@/lib/contracts/court-outcome';
import {
  postBackendJsonRequest,
  proxyBackendJsonRequest,
} from '@/lib/courtos/server-backend';
import {
  courtCommandFailure,
  readCourtCommandJson,
} from '@/lib/courtos/server-court-command';
import { sameOriginMutationError } from '@/lib/courtos/same-origin-mutation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ runId: string }>;
}

function backendPath(runId: string): string {
  return `/api/court/shangshufang/kernel/runs/${encodeURIComponent(runId)}/outcomes`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { runId } = await context.params;
  return proxyBackendJsonRequest(request, backendPath(runId));
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  let command: ReturnType<typeof ZBrowserOutcomeCommand.parse>;
  try {
    command = ZBrowserOutcomeCommand.parse(await request.json());
  } catch {
    return courtCommandFailure(
      400,
      'invalid_outcome_command',
      '结果回填只接受来源凭据、指标、实测值、观察时间与幂等键。',
    );
  }

  const { runId } = await context.params;
  const response = await postBackendJsonRequest(
    request,
    backendPath(runId),
    {
      ...command,
      // This assertion is server-owned: the browser never receives a toggle.
      human_validated: true,
    },
  );
  if (!response.ok) {
    return courtCommandFailure(
      response.status,
      'outcome_rejected',
      '结果未入队。请核对封印基线、来源凭据与观察窗口后重试。',
    );
  }

  try {
    const queued = ZQueuedOutcomeEnvelope.parse(
      await readCourtCommandJson(response),
    );
    return Response.json(queued, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return courtCommandFailure(
      502,
      'invalid_outcome_response',
      '后端结果入队响应不符合契约。',
    );
  }
}
