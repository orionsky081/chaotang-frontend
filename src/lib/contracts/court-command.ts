import { z } from 'zod';

export const COURT_DECISION_ACTIONS = Object.freeze([
  'APPROVE',
  'REQUEST_EVIDENCE',
  'REJECT',
] as const);

export const ZCourtDecisionAction = z.enum(COURT_DECISION_ACTIONS);
export type CourtDecisionAction = z.infer<typeof ZCourtDecisionAction>;

export const ZBusinessExceptionInput = z.strictObject({
  reason: z.string().trim().min(1).max(1000),
  risk_exposure: z.string().trim().min(1).max(1000),
  owner: z.string().trim().min(1).max(200),
  remediation: z.string().trim().min(1).max(2000),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type BusinessExceptionInput = z.infer<typeof ZBusinessExceptionInput>;

export const ZBrowserDecisionCommand = z.strictObject({
  action: ZCourtDecisionAction,
  reason: z.string().trim().min(1).max(1000),
  idempotency_key: z.string().trim().min(8).max(200),
  business_exception: ZBusinessExceptionInput.optional(),
});

export const ZBrowserArchiveCommand = z.strictObject({
  idempotency_key: z.string().trim().min(8).max(200),
});

const ZChallengeCore = z.strictObject({
  review_token: z.string().min(1).max(2000),
  expected_revision: z.number().int().nonnegative(),
  expires_at: z.string().datetime({ offset: true }),
});

export const ZDecisionChallengeData = ZChallengeCore.extend({
  action: ZCourtDecisionAction,
});

export const ZArchiveChallengeData = ZChallengeCore.extend({
  action: z.literal('ARCHIVE'),
  runtime: z.literal('langgraph_court'),
});

export const ZQueuedDecisionData = z.strictObject({
  run_id: z.string().min(1),
  outbox_id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  status: z.literal('QUEUED'),
  command_kind: z.literal('COURT_DECISION'),
  runtime: z.literal('langgraph_court'),
});

export const ZQueuedArchiveData = z.strictObject({
  run_id: z.string().min(1),
  outbox_id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  status: z.literal('QUEUED'),
  command_kind: z.literal('COURT_ARCHIVE'),
  runtime: z.literal('langgraph_court'),
});

const successEnvelope = <T extends z.ZodType>(data: T) => z.strictObject({
  success: z.literal(true),
  data,
  error: z.null().optional(),
});

export const ZDecisionChallengeEnvelope = successEnvelope(ZDecisionChallengeData);
export const ZArchiveChallengeEnvelope = successEnvelope(ZArchiveChallengeData);
export const ZQueuedDecisionEnvelope = successEnvelope(ZQueuedDecisionData);
export const ZQueuedArchiveEnvelope = successEnvelope(ZQueuedArchiveData);

export type QueuedDecisionData = z.infer<typeof ZQueuedDecisionData>;
export type QueuedArchiveData = z.infer<typeof ZQueuedArchiveData>;
export const MAX_DECISION_POLL_ATTEMPTS = 40;
export const MAX_ARCHIVE_POLL_ATTEMPTS = 40;
export type DecisionPollingDisposition = 'POLL' | 'DONE' | 'STOP_ATTEMPT_LIMIT';
export type ArchivePollingDisposition =
  | 'POLL'
  | 'DONE'
  | 'STOP_STATUS_DRIFT'
  | 'STOP_ATTEMPT_LIMIT';

export function availableDecisionActions(
  status: string,
  permittedActions: readonly string[],
): CourtDecisionAction[] {
  if (status !== 'AWAITING_HUMAN') return [];
  const permitted = new Set(permittedActions);
  return COURT_DECISION_ACTIONS.filter((action) => permitted.has(action));
}

export function decisionPollingDisposition(
  status: string,
  attempts: number,
): DecisionPollingDisposition {
  if (status !== 'AWAITING_HUMAN') return 'DONE';
  if (attempts >= MAX_DECISION_POLL_ATTEMPTS) return 'STOP_ATTEMPT_LIMIT';
  return 'POLL';
}

export function archiveCommandAvailable(
  status: string,
  permittedActions: readonly string[],
): boolean {
  return status === 'APPROVED' && permittedActions.includes('WAIT_FOR_ARCHIVE');
}

export function archivePollingDisposition(
  status: string,
  attempts: number,
): ArchivePollingDisposition {
  if (status === 'ARCHIVED') return 'DONE';
  if (status !== 'APPROVED') return 'STOP_STATUS_DRIFT';
  if (attempts >= MAX_ARCHIVE_POLL_ATTEMPTS) return 'STOP_ATTEMPT_LIMIT';
  return 'POLL';
}

function assertLiveChallenge<T extends { expires_at: string }>(
  challenge: T,
  nowMs: number,
  errorPrefix: string,
): T {
  const expiresAt = Date.parse(challenge.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
    throw new Error(`${errorPrefix}_expired`);
  }
  return challenge;
}

export function assertLiveDecisionChallenge(
  value: unknown,
  requestedAction: CourtDecisionAction,
  nowMs: number = Date.now(),
) {
  const challenge = ZDecisionChallengeEnvelope.parse(value).data;
  if (challenge.action !== requestedAction) {
    throw new Error('decision_challenge_action_mismatch');
  }
  return assertLiveChallenge(challenge, nowMs, 'decision_challenge');
}

export function assertLiveArchiveChallenge(
  value: unknown,
  nowMs: number = Date.now(),
) {
  const challenge = ZArchiveChallengeEnvelope.parse(value).data;
  return assertLiveChallenge(challenge, nowMs, 'archive_challenge');
}
