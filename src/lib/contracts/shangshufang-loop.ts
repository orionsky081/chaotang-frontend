/**
 * 上书房「新」DB-backed 九段回路契约（`web/routers/shangshufang.py`，`prefix=/api/court/shangshufang`）。
 *
 * SoT 优先级（2026-07-21 T3 联调核实）：字段名先照抄
 * `.plans/chaotang-golden-loop/docs/api-contracts.md`，但**真实响应比文档更细**——本文件已对照
 * e2e-tester 在 `:8081` 真跑的原始抓包
 * （`.plans/chaotang-golden-loop/e2e-tester/test-golden-loop-api/raw/*.json`）校正字段形状，
 * 例如 `formatted_memorial` 文档写的是 string，真实是 `{section_order, sections, text}` 对象；
 * `risk_notes` 文档提到但真实响应里不存在，实际是 `risk_flags[]` + `risk_register[]`；
 * `ministry_outputs[]` 真实字段比文档表多出 `position/confidence/evidence_used/missing_evidence/risks` 等。
 * 禁本地发明字段名，但允许比文档补全「真实存在、文档漏列」的字段——这不是发明，是对齐现实。
 *
 * 与旧 `study-edict.ts`（`/api/chaotang/study/*`，内存态，无 decision 端点）是**两套不同系统**，
 * 详见 `.plans/chaotang-golden-loop/frontend-dev/task-loop-ui/notes.md` 的分叉取证。
 * T3 起，`/shangshufang` 页面数据源已切到本文件对应的新系统；旧 `study-edict.ts` 代码保留不删
 * （AGENTS.md §16：隔离不是删除），新路验证稳定后再由 custodian 判断是否清理。
 */
import { z } from 'zod';

// ---- 试点准入：GET /api/ready ----

export const ZQuotePilotReadiness = z
  .object({
    enabled: z.boolean(),
    ready: z.boolean(),
    blockers: z.array(z.string()),
  })
  .passthrough();

export const ZInternalPilotReadiness = z
  .object({
    profile: z.literal('internal_supervised'),
    pilotReady: z.boolean(),
    productionClaimAllowed: z.literal(false),
    blockers: z.array(z.string()),
    constraints: z.array(z.string()),
    decisionRuntime: z.object({
      mode: z.string(),
      runtimeKind: z.string(),
      realAgentsEnabled: z.boolean(),
      truthLabelCeiling: z.string(),
    }).passthrough(),
    capabilities: z.object({
      deterministicDecisionLoop: z.boolean(),
      realModelDecisionLoop: z.boolean(),
    }).passthrough().optional(),
  })
  .passthrough();

export const ZPilotReadinessResponse = z
  .object({
    status: z.string(),
    version: z.string(),
    checks: z.record(z.string(), z.string()),
    details: z.record(z.string(), z.unknown()).optional(),
    ready: z.boolean(),
    blockers: z.array(z.string()),
    /** 旧后端可能只返回整体 readiness；可选以支持前后端滚动升级。 */
    quote_pilot: ZQuotePilotReadiness.optional(),
    /** 内部试用唯一准入真相；缺失时前端必须显示不可判定，而非沿用整体 ready。 */
    internal_pilot: ZInternalPilotReadiness.optional(),
  })
  .passthrough();

// ---- LangGraph 权威受旨：POST /kernel/intake ----

export const ZCourtKernelIntakeRequest = z.object({
  request_text: z.string().min(1).max(4000),
  idempotency_key: z.string().min(1).max(200),
  evidence_pack_id: z.string().min(1).max(128).optional(),
});

// ---- 段1 拟旨：POST /draft-edict ----

export const ZDraftEdict = z
  .object({
    original_question: z.string(),
    refined_edict: z.string(),
    decision_type: z.string(),
    known_facts: z.array(z.string()),
    unknown_gaps: z.array(z.string()),
    recommended_departments: z.array(z.string()),
    risk_flags: z.array(z.string()),
    expected_memorial_format: z.array(z.string()),
    emperor_confirmation_question: z.string(),
    source_label: z.string(),
  })
  .passthrough();

export const ZEvalResult = z
  .object({
    suite: z.string(),
    passed: z.boolean(),
    score: z.number(),
    failed: z.array(z.string()),
  })
  .passthrough();

export const ZDraftEdictResponse = z
  .object({
    task_id: z.string(),
    case_id: z.string(),
    status: z.string(),
    execution_mode: z.literal('restricted_deterministic').optional(),
    source_label: z.string(),
    evidence_pack: z.record(z.string(), z.unknown()).nullable().optional(),
    draft_edict: ZDraftEdict,
    eval_result: ZEvalResult.optional(),
    trace_id: z.string().optional(),
  })
  .passthrough();

export const ZDraftEdictRequest = z.object({
  raw_question: z.string().min(1).max(4000),
  evidence_pack_id: z.string().min(1).max(128).optional(),
});

// ---- 共用：证据 / 风险 / 分奏 / 质门 / 奏折 ----

export const ZEvidenceItem = z
  .object({
    title: z.string(),
    source_type: z.string().optional(),
    claim_supported: z.string().optional(),
    quote_or_location: z.string().optional(),
    confidence: z.string().optional(),
  })
  .passthrough();

export const ZRiskItem = z
  .object({
    risk: z.string(),
    severity: z.string().optional(),
    reason: z.string().optional(),
    requires_human_confirmation: z.boolean().optional(),
  })
  .passthrough();

export const ZMinistryOutput = z
  .object({
    department: z.string(),
    focus: z.string().optional(),
    /** 该部对本案的态度结论，如「补证」「准奏」「驳回」。真实字段，文档表未列。 */
    position: z.string().optional(),
    opinion: z.string(),
    key_findings: z.array(z.string()).optional(),
    evidence_used: z.array(ZEvidenceItem).optional(),
    missing_evidence: z.array(z.string()).optional(),
    risks: z.array(ZRiskItem).optional(),
    recommended_next_action: z.string().optional(),
    confidence: z.string().optional(),
    status: z.string(),
    source_label: z.string(),
  })
  .passthrough();

export const ZMemorialQualityGate = z
  .object({
    status: z.string(),
    reasons: z.array(z.string()),
    human_signoff_required: z.boolean(),
  })
  .passthrough();

export const ZDecisionOption = z
  .object({
    action: z.string(),
    label: z.string(),
    reason: z.string().optional(),
    enabled: z.boolean(),
  })
  .passthrough();

/** 真实形状是 `{section_order, sections, text}` 对象，不是文档写的 string。 */
export const ZFormattedMemorial = z
  .object({
    section_order: z.array(z.string()).optional(),
    sections: z.record(z.string(), z.string()).optional(),
    text: z.string().optional(),
  })
  .passthrough();

export const ZHorizontalReview = z
  .object({
    institution: z.enum(['锦衣卫', '钦天监']),
    triggered: z.boolean(),
    rule_id: z.string(),
    rule_version: z.string(),
    reasons: z.array(z.string()),
    status: z.enum(['completed', 'not_triggered', 'failed']),
    findings: z.array(z.string()),
    source_refs: z.array(z.string()),
  })
  .passthrough();

/** 奏折八要素：圣裁/分奏/证据/缺证/风险/后令/质门/来源都在这个结构里（分部证据见 ministry_outputs[].evidence_used）。 */
export const ZMemorial = z
  .object({
    title: z.string(),
    verdict: z.string(),
    summary: z.string().optional(),
    ministry_outputs: z.array(ZMinistryOutput),
    conflict_summary: z.array(z.record(z.string(), z.unknown())).optional(),
    /** 证据缺口（回审阶段汇总，等同 INV-13「缺证」要素）。 */
    evidence_gaps: z.array(z.string()),
    /** 真实响应字段：文档提到的 risk_notes 实测不存在，实际是 risk_flags + risk_register。 */
    risk_flags: z.array(z.string()).optional(),
    risk_register: z.array(ZRiskItem).optional(),
    evidence_chain: z.array(ZEvidenceItem).optional(),
    recommended_next_action: z.string(),
    decision_options: z.array(ZDecisionOption).optional(),
    quality_gate: ZMemorialQualityGate,
    source_label: z.string(),
    formatted_memorial: ZFormattedMemorial.optional(),
    horizontal_reviews: z.array(ZHorizontalReview).optional(),
  })
  .passthrough();

export const ZRoutingPlan = z
  .object({
    routing_id: z.string().optional(),
    ministry_candidates: z.array(z.unknown()).optional(),
    swarm_plan: z.array(z.unknown()).optional(),
    route_reason: z.string().optional(),
    source_label: z.string().optional(),
  })
  .passthrough();

// ---- 段2-3 确认并派发：POST /confirm-edict ----

export const ZConfirmEdictResponse = z
  .object({
    task_id: z.string(),
    case_id: z.string(),
    status: z.string(),
    message: z.string().optional(),
    review_id: z.string().optional(),
    routing_plan: ZRoutingPlan.optional(),
    memorial: ZMemorial.optional(),
    swarm_run: z.record(z.string(), z.unknown()).optional(),
    review_status_url: z.string().optional(),
  })
  .passthrough();

export const ZConfirmEdictRequest = z.object({
  task_id: z.string(),
  confirmed: z.boolean().optional(),
  edited_edict: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().min(8).max(200).optional(),
});

// ---- 段4-7 进度轮询：GET /tasks/{task_id}/status ----

/** 已裁决后 task 上会带这个，真实字段，文档表未列。 */
export const ZLatestDecision = z
  .object({
    decision_id: z.string(),
    action: z.string(),
    reason: z.string().optional(),
    human_confirmed_declared: z.boolean().optional(),
    decided_at: z.string().optional(),
  })
  .passthrough();

export const ZShangshufangTask = z
  .object({
    task_id: z.string(),
    status: z.string(),
    raw_question: z.string(),
    draft_edict: ZDraftEdict.nullable().optional(),
    source_label: z.string(),
    risk_flags: z.array(z.string()),
    known_facts: z.array(z.string()),
    unknown_gaps: z.array(z.string()),
    /** 契约标准名（INV-13「缺证」要素）；`_task_to_payload()` 保证永不为 null，空数组=无缺证。
     *  注意：这是**拟旨阶段**识别的缺口，可能与 memorial.evidence_gaps（**会审阶段**新发现的缺口）不同——
     *  实测两者会不相等，不是同一份数据的重复字段，UI 需分别展示。 */
    missing_evidence: z.array(z.string()),
    recommended_departments: z.array(z.string()),
    latest_decision: ZLatestDecision.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const ZShangshufangReview = z
  .object({
    review_id: z.string(),
    review_status: z.string(),
    routing_plan: ZRoutingPlan.optional(),
    ministry_outputs: z.array(ZMinistryOutput).optional(),
    conflict_summary: z.array(z.record(z.string(), z.unknown())).optional(),
    memorial: ZMemorial.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const ZTaskStatusResponse = z.object({
  task: ZShangshufangTask,
  review: ZShangshufangReview.nullable(),
});

// ---- 段8 皇帝裁决：POST /tasks/{task_id}/decision ----

export const ZDecisionAction = z.enum(['approve', 'reject', 'request_evidence', 'archive']);

export const ZHumanSignoffClaims = z
  .object({
    version: z.literal(1),
    key_id: z.string().min(1).max(128),
    tenant_slug: z.string().min(1),
    user_id: z.string().min(1),
    task_id: z.string().min(1),
    action: z.enum(['approve', 'archive']),
    context_digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    issued_at: z.string().datetime({ offset: true }),
    expires_at: z.string().datetime({ offset: true }),
    nonce: z.string().min(16).max(128),
  })
  .strict();

const ZSignoffDigest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const ZServerOwnedEditedRiskMarker = z
  .object({
    source: z.literal('user_edited_edict'),
    level: z.literal('black'),
    keyword: z.string().min(1),
  })
  .strict();

export const ZHumanSignoffChallenge = z
  .object({
    version: z.literal(1),
    tenant_slug: z.string().min(1),
    user_id: z.string().min(1),
    task_id: z.string().min(1),
    action: z.enum(['approve', 'archive']),
    context: z
      .object({
        version: z.literal(1),
        tenant_slug: z.string().min(1),
        user_id: z.string().min(1),
        task_id: z.string().min(1),
        action: z.enum(['approve', 'archive']),
        task_revision: z
          .object({
            updated_at: z.string().min(1),
            status: z.string().min(1),
            raw_question: z.string(),
            refined_edict: z.string(),
            decision_type: z.string().min(1),
            source_label: z.string().min(1),
            risk_flags: z.array(z.union([z.string(), ZServerOwnedEditedRiskMarker])),
            known_facts: z.array(z.string()),
            unknown_gaps: z.array(z.string()),
          })
          .strict(),
        latest_review: z
          .object({
            id: z.string().min(1),
            round_number: z.number().int().nonnegative(),
            updated_at: z.string().min(1),
            review_status: z.string().min(1),
            formal_memorial_digest: ZSignoffDigest,
            routing_plan_digest: ZSignoffDigest,
          })
          .strict(),
        archive_inputs: z
          .object({
            evidence_digest: ZSignoffDigest,
            telemetry_digest: ZSignoffDigest,
          })
          .strict()
          .optional(),
      })
      .strict(),
    context_digest: ZSignoffDigest,
  })
  .strict()
  .superRefine((challenge, context) => {
    const identityFields = ['tenant_slug', 'user_id', 'task_id', 'action'] as const;
    for (const field of identityFields) {
      if (challenge.context[field] !== challenge[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['context', field],
          message: `challenge context ${field} mismatch`,
        });
      }
    }
  });

export const ZHumanSignoffChallengeResponse = z
  .object({
    challenge: ZHumanSignoffChallenge,
  })
  .strict();

export const ZHumanSignoffCredential = z
  .object({
    claims: ZHumanSignoffClaims,
    signature: z.string().min(1),
  })
  .strict();

export const ZDecisionRequest = z.object({
  action: ZDecisionAction,
  reason: z.string().optional(),
  /** ⚠️ 2026-07-21 起即将变成必填无默认（不传 → 422）；本契约按必填写，UI 必须显式传。 */
  human_confirmed: z.boolean(),
  /** 高风险准奏/归档的一次性凭据。只由外部签字端生成，浏览器不持有私钥、不自行签名。 */
  signoff_credential: ZHumanSignoffCredential.optional(),
});

export const ZDecisionResponse = z
  .object({
    task_id: z.string(),
    status: z.string(),
    decision_id: z.string().optional(),
    action: z.string().optional(),
  })
  .passthrough();

export const ZPilotPrediction = z
  .object({
    prediction_type: z.string(),
    status: z.enum(['available', 'unavailable']),
    expected_value: z.number().optional(),
    unit: z.string().optional(),
    unavailable_reason_code: z.string().optional(),
    scenarios: z
      .object({
        base: z
          .object({
            expected_value: z.number(),
            unit: z.string(),
            assumptions: z.array(z.string()),
            evidence_refs: z.array(z.string()),
            probability: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
        optimistic: z
          .object({
            expected_value: z.number(),
            unit: z.string(),
            assumptions: z.array(z.string()),
            evidence_refs: z.array(z.string()),
            probability: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
        pessimistic: z
          .object({
            expected_value: z.number(),
            unit: z.string(),
            assumptions: z.array(z.string()),
            evidence_refs: z.array(z.string()),
            probability: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
      })
      .optional(),
    interval: z
      .object({
        lower: z.number(),
        upper: z.number(),
        unit: z.string(),
        kind: z.string(),
      })
      .passthrough()
      .optional(),
    probability: z.record(z.string(), z.unknown()).optional(),
    evidence_refs: z.array(z.string()).optional(),
    sensitivity: z.array(z.record(z.string(), z.string())).optional(),
    risk_triggers: z.array(z.string()).optional(),
    recommended_actions: z.array(z.string()).optional(),
    versions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    advisory_only: z.boolean().optional(),
  })
  .passthrough();

export const ZPilotArchiveResponse = z
  .object({
    case_id: z.string(),
    status: z.string(),
    archive_id: z.string(),
    evidence_pack_id: z.string(),
    snapshot_hash: z.string(),
    chain_hash: z.string(),
    created_at: z.string(),
    prediction_snapshot: z
      .object({
        sealed: z.literal(true),
        decision_as_of: z.string(),
        qintian_role: z
          .object({
            advisory_only: z.literal(true),
            can_block_decision: z.literal(false),
            description: z.string(),
          })
          .passthrough()
          .optional(),
        predictions: z.array(ZPilotPrediction),
      })
      .passthrough(),
  })
  .passthrough();

export const ZPilotDeviationCard = z
  .object({
    case_id: z.string(),
    snapshot_hash: z.string(),
    chain_hash: z.string(),
    deviations: z.array(
      z
        .object({
          prediction_type: z.enum(['gross_margin', 'delivery', 'payment']),
          expected_value: z.number(),
          actual_value: z.number(),
          unit: z.string(),
          absolute_deviation: z.number(),
          outcome: z
            .object({
              outcome_id: z.string(),
              observed_at: z.string(),
              source_ref: z.string(),
              human_validated: z.boolean(),
              provenance_status: z.enum(['verified', 'legacy_unverified']),
              trusted_for_learning: z.boolean(),
              source_artifact_digest: z.string().nullable().optional(),
              validated_by: z.string().nullable().optional(),
              validation_authority: z.string().nullable().optional(),
              validated_at: z.string().nullable().optional(),
            })
            .passthrough(),
          recorded_at: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const ZPilotTelemetryResponse = z
  .object({
    case_id: z.string(),
    effect_coverage: z.object({
      status: z.enum(['complete', 'incomplete']),
      reason: z.string(),
    }),
    measurements: z.record(z.string(), z.record(z.string(), z.unknown())),
    gates: z
      .object({
        time_20_minutes: z.record(z.string(), z.unknown()),
        cost_15_cny: z.record(z.string(), z.unknown()),
        external_mutations_zero: z.record(z.string(), z.unknown()),
        overall: z.record(z.string(), z.unknown()),
      })
      .passthrough(),
    draft_started_at: z.string(),
    memorial_completed_at: z.string().nullable(),
  })
  .passthrough();

export const ZPilotOutcomeRequest = z.object({
  outcome_id: z.string().min(1).max(160),
  prediction_type: z.enum(['gross_margin', 'delivery', 'payment']),
  actual_value: z.number().finite(),
  unit: z.string().min(1).max(40),
  observed_at: z.string().datetime({ offset: true }),
  source_ref: z.string().min(1).max(500),
  source_artifact_base64: z.string().min(4).max(2_800_000),
  human_validated: z.literal(true),
  idempotency_key: z.string().min(1).max(160),
});

export const ZPilotOutcomeResponse = z
  .object({
    case_id: z.string(),
    outcome_id: z.string(),
    prediction_type: z.enum(['gross_margin', 'delivery', 'payment']),
    status: z.literal('recorded'),
    provenance_status: z.literal('verified'),
  })
  .passthrough();

export type DraftEdict = z.infer<typeof ZDraftEdict>;
export type CourtKernelIntakeRequest = z.infer<typeof ZCourtKernelIntakeRequest>;
export type DraftEdictResponse = z.infer<typeof ZDraftEdictResponse>;
export type DraftEdictRequest = z.infer<typeof ZDraftEdictRequest>;
export type EvidenceItem = z.infer<typeof ZEvidenceItem>;
export type RiskItem = z.infer<typeof ZRiskItem>;
export type MinistryOutput = z.infer<typeof ZMinistryOutput>;
export type DecisionOption = z.infer<typeof ZDecisionOption>;
export type FormattedMemorial = z.infer<typeof ZFormattedMemorial>;
export type HorizontalReview = z.infer<typeof ZHorizontalReview>;
export type Memorial = z.infer<typeof ZMemorial>;
export type RoutingPlan = z.infer<typeof ZRoutingPlan>;
export type ConfirmEdictResponse = z.infer<typeof ZConfirmEdictResponse>;
export type ConfirmEdictRequest = z.infer<typeof ZConfirmEdictRequest>;
export type LatestDecision = z.infer<typeof ZLatestDecision>;
export type ShangshufangTask = z.infer<typeof ZShangshufangTask>;
export type ShangshufangReview = z.infer<typeof ZShangshufangReview>;
export type TaskStatusResponse = z.infer<typeof ZTaskStatusResponse>;
export type DecisionAction = z.infer<typeof ZDecisionAction>;
export type HumanSignoffCredential = z.infer<typeof ZHumanSignoffCredential>;
export type HumanSignoffChallenge = z.infer<typeof ZHumanSignoffChallenge>;
export type HumanSignoffChallengeResponse = z.infer<typeof ZHumanSignoffChallengeResponse>;
export type DecisionRequest = z.infer<typeof ZDecisionRequest>;
export type DecisionResponse = z.infer<typeof ZDecisionResponse>;
export type PilotPrediction = z.infer<typeof ZPilotPrediction>;
export type PilotArchiveResponse = z.infer<typeof ZPilotArchiveResponse>;
export type PilotDeviationCard = z.infer<typeof ZPilotDeviationCard>;
export type PilotTelemetryResponse = z.infer<typeof ZPilotTelemetryResponse>;
export type PilotOutcomeRequest = z.infer<typeof ZPilotOutcomeRequest>;
export type PilotOutcomeResponse = z.infer<typeof ZPilotOutcomeResponse>;
export type QuotePilotReadiness = z.infer<typeof ZQuotePilotReadiness>;
export type InternalPilotReadiness = z.infer<typeof ZInternalPilotReadiness>;
export type PilotReadinessResponse = z.infer<typeof ZPilotReadinessResponse>;

/** 段8 裁决落到终态才算「已生效」；`awaiting_decision` 是已知中间态（H1 已修，approve/reject 现应正确落
 *  `approved`/`rejected`；`archive` 落 `archived`）。 */
export const TERMINAL_TASK_STATUSES = new Set(['approved', 'rejected', 'archived']);

export function isTerminalTaskStatus(status: string): boolean {
  return TERMINAL_TASK_STATUSES.has(status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 只识别后端明确返回的签字门；绝不从文案关键词猜测业务状态。 */
export function hasSignoffRequiredFlag(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const data = isRecord(payload.data) ? payload.data : {};
  const error = isRecord(payload.error) ? payload.error : {};
  return (
    data.needs_signoff === true
    || data.signoff_required === true
    || error.code === 'signoff_required'
  );
}

/**
 * 浏览器只做 JSON/字段结构与当前案件动作匹配，不验证签名真实性。
 * 密钥信任、签名、有效期、租户和防重放全部由后端裁决门负责。
 */
export function parseHumanSignoffCredentialJson(
  raw: string,
  challenge: HumanSignoffChallenge,
): HumanSignoffCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('签字凭据不是有效 JSON。');
  }
  const credential = ZHumanSignoffCredential.safeParse(parsed);
  if (!credential.success) throw new Error('签字凭据字段结构不完整或含有未允许字段。');
  if (credential.data.claims.action !== challenge.action) {
    throw new Error(`签字凭据动作不匹配：当前需要 ${challenge.action} 凭据。`);
  }
  if (credential.data.claims.task_id !== challenge.task_id) {
    throw new Error('签字凭据不属于当前案件。');
  }
  if (credential.data.claims.context_digest !== challenge.context_digest) {
    throw new Error('签字凭据与当前裁决上下文摘要不匹配，请重新签发。');
  }
  return credential.data;
}

/** 统一保证驳回/补证永远不携带签字凭据。 */
export function buildDecisionRequest(
  action: DecisionAction,
  reason: string,
  credential?: HumanSignoffCredential,
): DecisionRequest {
  const request: DecisionRequest = {
    action,
    reason: reason.trim() || undefined,
    human_confirmed: true,
  };
  if ((action === 'approve' || action === 'archive') && credential) {
    if (credential.claims.action !== action) {
      throw new Error(`签字凭据动作不匹配：不能用于 ${action} 请求。`);
    }
    request.signoff_credential = credential;
  }
  return request;
}
