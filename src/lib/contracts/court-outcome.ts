import { z } from 'zod';

export const COURT_OUTCOME_METRICS = [
  'gross_margin',
  'delivery_days',
  'payment_days',
] as const;

export const ZCourtOutcomeMetric = z.enum(COURT_OUTCOME_METRICS);
export type CourtOutcomeMetric = z.infer<typeof ZCourtOutcomeMetric>;

export const ZBrowserOutcomeCommand = z.strictObject({
  source_artifact_id: z.string().trim().min(1).max(240),
  metric: ZCourtOutcomeMetric,
  actual_value: z.number().finite(),
  observed_at: z.string().datetime({ offset: true }),
  idempotency_key: z.string().trim().min(8).max(200),
});
export type BrowserOutcomeCommand = z.infer<typeof ZBrowserOutcomeCommand>;

export const ZQueuedOutcomeData = z.strictObject({
  run_id: z.string().min(1),
  outbox_id: z.string().min(1),
  status: z.literal('QUEUED'),
});
export type QueuedOutcomeData = z.infer<typeof ZQueuedOutcomeData>;

export const ZRunOutcomeMetricProjection = z.strictObject({
  prediction_id: z.string().min(1),
  metric: ZCourtOutcomeMetric,
  metric_unit: z.string().min(1),
  expected_value: z.number().finite(),
  observation_window: z.string().min(1),
  status: z.enum(['PENDING', 'RECORDED']),
  actual_value: z.number().finite().nullable().optional(),
  signed_delta: z.number().finite().nullable().optional(),
  observed_at: z.string().nullable().optional(),
  observation_ref: z.string().nullable().optional(),
});
export type RunOutcomeMetricProjection = z.infer<typeof ZRunOutcomeMetricProjection>;

export const ZRunOutcomeProjection = z.strictObject({
  tenant_id: z.string().min(1),
  run_id: z.string().min(1),
  sealed_archive_id: z.string().length(64),
  sealed_chain_hash: z.string().length(64),
  metrics: z.array(ZRunOutcomeMetricProjection),
});
export type RunOutcomeProjection = z.infer<typeof ZRunOutcomeProjection>;

export const COURT_OUTCOME_REQUEST_STATUSES = [
  'PENDING',
  'CLAIMED',
  'COMPLETED',
  'FAILED',
  'RECONCILIATION_REQUIRED',
] as const;

export const ZOutcomeRequestStatus = z.strictObject({
  run_id: z.string().min(1),
  outbox_id: z.string().min(1),
  status: z.enum(COURT_OUTCOME_REQUEST_STATUSES),
  result_ref: z.string().nullable().optional(),
});
export type OutcomeRequestStatus = z.infer<typeof ZOutcomeRequestStatus>;

const successEnvelope = <T extends z.ZodType>(data: T) => z.strictObject({
  success: z.literal(true),
  data,
  error: z.null().optional(),
});

export const ZQueuedOutcomeEnvelope = successEnvelope(ZQueuedOutcomeData);

export const MAX_OUTCOME_POLL_ATTEMPTS = 24;

export function outcomeRequestIsTerminal(value: OutcomeRequestStatus): boolean {
  return value.status === 'COMPLETED'
    || value.status === 'FAILED'
    || value.status === 'RECONCILIATION_REQUIRED';
}
