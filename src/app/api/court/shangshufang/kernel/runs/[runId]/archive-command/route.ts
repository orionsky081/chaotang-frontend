import {
  assertLiveArchiveChallenge,
  ZBrowserArchiveCommand,
  ZQueuedArchiveEnvelope,
} from '@/lib/contracts/court-command';
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

  let command: ReturnType<typeof ZBrowserArchiveCommand.parse>;
  try {
    command = ZBrowserArchiveCommand.parse(await request.json());
  } catch {
    return courtCommandFailure(400, 'invalid_archive_command', '归档请求标识无效。');
  }

  const { runId } = await context.params;
  const encodedRunId = encodeURIComponent(runId);
  const challengeResponse = await postBackendJsonRequest(
    request,
    `/api/court/shangshufang/kernel/runs/${encodedRunId}/archive-challenge`,
    { idempotency_key: command.idempotency_key },
  );
  if (!challengeResponse.ok) {
    return courtCommandFailure(
      challengeResponse.status,
      'archive_challenge_rejected',
      '归档凭据签发失败，请刷新回奏后重试。',
    );
  }

  let challenge;
  try {
    challenge = assertLiveArchiveChallenge(
      await readCourtCommandJson(challengeResponse),
    );
  } catch {
    return courtCommandFailure(
      502,
      'invalid_archive_challenge',
      '后端返回的归档凭据无效或已过期。',
    );
  }

  const archiveResponse = await postBackendJsonRequest(
    request,
    `/api/court/shangshufang/kernel/runs/${encodedRunId}/archive`,
    {
      review_token: challenge.review_token,
      idempotency_key: command.idempotency_key,
    },
  );
  if (!archiveResponse.ok) {
    return courtCommandFailure(
      archiveResponse.status,
      'archive_rejected',
      '归档未入队，案件可能已更新，请刷新后重试。',
    );
  }

  try {
    const queued = ZQueuedArchiveEnvelope.parse(
      await readCourtCommandJson(archiveResponse),
    );
    return Response.json(queued, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return courtCommandFailure(
      502,
      'invalid_archive_response',
      '后端归档入队响应不符合契约。',
    );
  }
}
