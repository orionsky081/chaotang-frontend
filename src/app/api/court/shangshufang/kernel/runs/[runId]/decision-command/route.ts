import {
  assertLiveDecisionChallenge,
  ZBrowserDecisionCommand,
  ZQueuedDecisionEnvelope,
} from '@/lib/contracts/court-decision-command';
import { postBackendJsonRequest } from '@/lib/courtos/server-backend';
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

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const originError = sameOriginMutationError(request);
  if (originError) return originError;

  let command: ReturnType<typeof ZBrowserDecisionCommand.parse>;
  try {
    command = ZBrowserDecisionCommand.parse(await request.json());
  } catch {
    return courtCommandFailure(400, 'invalid_decision_command', '裁决动作、理由或请求标识无效。');
  }

  const { runId } = await context.params;
  const encodedRunId = encodeURIComponent(runId);
  const challengeResponse = await postBackendJsonRequest(
    request,
    `/api/court/shangshufang/kernel/runs/${encodedRunId}/decision-challenge`,
    {
      action: command.action,
      reason: command.reason,
      idempotency_key: command.idempotency_key,
      ...(command.business_exception
        ? { business_exception: command.business_exception }
        : {}),
    },
  );
  if (!challengeResponse.ok) {
    return courtCommandFailure(
      challengeResponse.status,
      'decision_challenge_rejected',
      '裁决凭据签发失败，请刷新回奏后重试。',
    );
  }

  let challenge;
  try {
    challenge = assertLiveDecisionChallenge(
      await readCourtCommandJson(challengeResponse),
      command.action,
    );
  } catch {
    return courtCommandFailure(502, 'invalid_decision_challenge', '后端返回的裁决凭据无效或已过期。');
  }

  const decisionResponse = await postBackendJsonRequest(
    request,
    `/api/court/shangshufang/kernel/runs/${encodedRunId}/decision`,
    {
      action: command.action,
      reason: command.reason,
      idempotency_key: command.idempotency_key,
      expected_revision: challenge.expected_revision,
      review_token: challenge.review_token,
      ...(command.business_exception
        ? { business_exception: command.business_exception }
        : {}),
    },
  );
  if (!decisionResponse.ok) {
    return courtCommandFailure(
      decisionResponse.status,
      'decision_rejected',
      '裁决未入队，案件可能已更新，请刷新后重试。',
    );
  }

  try {
    const queued = ZQueuedDecisionEnvelope.parse(await readCourtCommandJson(decisionResponse));
    return Response.json(queued, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return courtCommandFailure(502, 'invalid_decision_response', '后端裁决入队响应不符合契约。');
  }
}
