import fulfillmentSchema from './fulfillment.json';

/**
 * 跨栈旨意兑现契约。
 *
 * `fulfillment.json` 是前后端共同读取的 SSOT；本模块提供前端可消费的
 * TypeScript 形状。运行时常量直接由 JSON 派生，并由
 * fulfillment-ssot.nodetest.ts 验证关键完成语义，避免静默漂移。
 */

export const FULFILLMENT_SCHEMA_VERSION =
  fulfillmentSchema.schemaVersion as 'fulfillment.v1';

export const CRITERION_STATUSES =
  fulfillmentSchema.criterionStatuses as [
    'achieved',
    'not_achieved',
    'unverifiable',
  ];

export const COMPLETION_STATUSES =
  fulfillmentSchema.completionStatuses as ['complete', 'incomplete'];

export const RISK_LEVELS =
  fulfillmentSchema.riskLevels as ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const UNCERTAINTY_LEVELS =
  fulfillmentSchema.uncertaintyLevels as ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];

export const TRUTH_LABELS =
  fulfillmentSchema.truthLabels as [
    'TRUE_SWARM',
    'MULTI_AGENT_WORKFLOW',
    'SINGLE_AGENT',
    'RULE_ENGINE',
    'SIMULATED',
    'FALLBACK',
  ];

export const VERIFICATION_OUTCOMES =
  fulfillmentSchema.verificationOutcomes as [
    'VERIFIED',
    'CONTRADICTED',
    'UNAVAILABLE',
  ];

export const AGENT_CONTRIBUTION_STATUSES =
  fulfillmentSchema.agentContributionStatuses as ['AVAILABLE', 'UNAVAILABLE'];

export const ARCHIVE_REF_STATUSES =
  fulfillmentSchema.archiveRefStatuses as ['UNSEALED', 'SEALED'];

export type FulfillmentSchemaVersion = typeof FULFILLMENT_SCHEMA_VERSION;
export type CriterionStatus = (typeof CRITERION_STATUSES)[number];
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type UncertaintyLevel = (typeof UNCERTAINTY_LEVELS)[number];
export type TruthLabel = (typeof TRUTH_LABELS)[number];
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];
export type AgentContributionStatus =
  (typeof AGENT_CONTRIBUTION_STATUSES)[number];
export type ArchiveRefStatus = (typeof ARCHIVE_REF_STATUSES)[number];

/**
 * Mission 中单项成功标准的兑现结论。
 *
 * `achieved` 的证据充分性以及非 achieved 项的下一步由后端质量门校验；
 * 浏览器只展示判定，不复刻裁决逻辑。
 */
export interface CriterionFulfillment {
  criterion_id: string;
  criterion: string;
  status: CriterionStatus;
  execution_artifact_refs: readonly string[];
  domain_evidence_refs: readonly string[];
  independent_evidence_refs: readonly string[];
  verifier_findings: readonly string[];
  confidence: number;
  gap_or_next_action: string | null;
}

/**
 * 唯一完成判定：只有所有成功标准均 achieved，后端才可返回 complete。
 */
export interface FulfillmentMatrix {
  schema_version: FulfillmentSchemaVersion;
  mission_id: string;
  objective_restatement: string;
  criterion_results: readonly CriterionFulfillment[];
  disagreements: readonly string[];
  unknowns: readonly string[];
  residual_risks: readonly string[];
  recommended_next_action: string;
  completion_status: CompletionStatus;
}

export interface DepartmentMemorial {
  department_id: string;
  position: string;
  key_findings: readonly string[];
  evidence_refs: readonly string[];
  red_flags: readonly string[];
  unresolved_questions: readonly string[];
  dissent: readonly string[];
  recommendation: string;
  office_result_refs: readonly string[];
}

export interface PublicVerificationRecord {
  criterion: string;
  verifier_department_id: 'jin_yi_wei';
  verification_ref: string;
  outcome: VerificationOutcome;
  evidence_refs: readonly string[];
  findings: readonly string[];
}

export interface CouncilReview {
  participating_departments: readonly string[];
  agreed_findings: readonly string[];
  resolved_conflicts: readonly string[];
  unresolved_conflicts: readonly string[];
  evidence_gaps: readonly string[];
  foresight_brief_refs: readonly string[];
  required_human_decisions: readonly string[];
  recommendation: string;
  quality_gate_results: readonly Readonly<Record<string, unknown>>[];
}

export interface AgentContributionRecord {
  agent_id: string;
  summary: string;
  evidence_refs: readonly string[];
}

export interface AgentContributionDossier {
  status: AgentContributionStatus;
  contributions: readonly AgentContributionRecord[];
  unavailable_reason: string | null;
}

export interface ReplyArchiveRef {
  status: ArchiveRefStatus;
  archive_id: string | null;
  ref: string | null;
}

export interface ChancellorReply {
  conclusion: string;
  fulfillment_matrix: FulfillmentMatrix | null;
  key_reasons: readonly string[];
  evidence_refs: readonly string[];
  risk_level: RiskLevel;
  uncertainty_level: UncertaintyLevel;
  foresight_brief_refs: readonly string[];
  budget_and_timeline: Readonly<Record<string, unknown>>;
  alternatives: readonly string[];
  disagreements: readonly string[];
  matters_for_imperial_decision: readonly string[];
  next_step: string;
  truth_label: TruthLabel;
  department_memorials: readonly DepartmentMemorial[];
  verification_records: readonly PublicVerificationRecord[];
  council_review: CouncilReview | null;
  agent_contributions: AgentContributionDossier | null;
  archive_ref: ReplyArchiveRef | null;
}

export interface CourtRunPublicResult {
  runtime_authority: 'LANGGRAPH';
  run_id: string;
  revision: number;
  status: string;
  chancellor_message: string;
  permitted_actions: readonly string[];
  reply: ChancellorReply | null;
}

type ExactFieldList<
  Shape,
  Fields extends readonly PropertyKey[],
> = Exclude<keyof Shape, Fields[number]> extends never
  ? Exclude<Fields[number], keyof Shape> extends never
    ? Fields
    : never
  : never;

const criterionResultFields =
  fulfillmentSchema.criterionResultFields as [
    'criterion_id',
    'criterion',
    'status',
    'execution_artifact_refs',
    'domain_evidence_refs',
    'independent_evidence_refs',
    'verifier_findings',
    'confidence',
    'gap_or_next_action',
  ];

const fulfillmentMatrixFields =
  fulfillmentSchema.fulfillmentMatrixFields as [
    'schema_version',
    'mission_id',
    'objective_restatement',
    'criterion_results',
    'disagreements',
    'unknowns',
    'residual_risks',
    'recommended_next_action',
    'completion_status',
  ];

const replyFields = fulfillmentSchema.replyFields as [
  'conclusion',
  'fulfillment_matrix',
  'key_reasons',
  'evidence_refs',
  'risk_level',
  'uncertainty_level',
  'foresight_brief_refs',
  'budget_and_timeline',
  'alternatives',
  'disagreements',
  'matters_for_imperial_decision',
  'next_step',
  'truth_label',
  'department_memorials',
  'verification_records',
  'council_review',
  'agent_contributions',
  'archive_ref',
];

const courtRunPublicResultFields =
  fulfillmentSchema.courtRunPublicResultFields as [
    'runtime_authority',
    'run_id',
    'revision',
    'status',
    'chancellor_message',
    'permitted_actions',
    'reply',
  ];

export const CRITERION_RESULT_FIELDS: ExactFieldList<
  CriterionFulfillment,
  typeof criterionResultFields
> = criterionResultFields;

export const FULFILLMENT_MATRIX_FIELDS: ExactFieldList<
  FulfillmentMatrix,
  typeof fulfillmentMatrixFields
> = fulfillmentMatrixFields;

export const REPLY_FIELDS: ExactFieldList<
  ChancellorReply,
  typeof replyFields
> = replyFields;

export const COURT_RUN_PUBLIC_RESULT_FIELDS: ExactFieldList<
  CourtRunPublicResult,
  typeof courtRunPublicResultFields
> = courtRunPublicResultFields;
