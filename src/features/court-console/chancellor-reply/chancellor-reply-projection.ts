import {
  AGENT_CONTRIBUTION_STATUSES,
  ARCHIVE_REF_STATUSES,
  COMPLETION_STATUSES,
  CRITERION_STATUSES,
  FULFILLMENT_SCHEMA_VERSION,
  RISK_LEVELS,
  TRUTH_LABELS,
  UNCERTAINTY_LEVELS,
  VERIFICATION_OUTCOMES,
  type ChancellorReply,
  type CompletionStatus,
  type CriterionStatus,
} from '@/lib/contracts/fulfillment';

export type ReplyEvidenceKind = 'execution' | 'domain' | 'independent';

const CRITERION_STATUS_SET = new Set<string>(CRITERION_STATUSES);
const COMPLETION_STATUS_SET = new Set<string>(COMPLETION_STATUSES);
const RISK_LEVEL_SET = new Set<string>(RISK_LEVELS);
const UNCERTAINTY_LEVEL_SET = new Set<string>(UNCERTAINTY_LEVELS);
const TRUTH_LABEL_SET = new Set<string>(TRUTH_LABELS);
const VERIFICATION_OUTCOME_SET = new Set<string>(VERIFICATION_OUTCOMES);
const AGENT_CONTRIBUTION_STATUS_SET = new Set<string>(
  AGENT_CONTRIBUTION_STATUSES,
);
const ARCHIVE_REF_STATUS_SET = new Set<string>(ARCHIVE_REF_STATUSES);

export interface ReplyEvidenceItem {
  kind: ReplyEvidenceKind;
  ref: string;
}

export interface ChancellorCriterionView {
  id: string;
  criterion: string;
  status: CriterionStatus;
  evidence: readonly ReplyEvidenceItem[];
  verifierFindings: readonly string[];
  confidence: number;
  gap: string | null;
}

export interface ChancellorReplyDossier {
  missionId: string | null;
  objective: string | null;
  disagreements: readonly string[];
  unknowns: readonly string[];
  residualRisks: readonly string[];
  evidenceRefs: readonly string[];
  foresightBriefRefs: readonly string[];
  alternatives: readonly string[];
  mattersForImperialDecision: readonly string[];
  budgetAndTimeline: Readonly<Record<string, unknown>>;
  truthLabel: ChancellorReply['truth_label'];
  riskLevel: ChancellorReply['risk_level'];
  uncertaintyLevel: ChancellorReply['uncertainty_level'];
  departmentMemorials: ChancellorReply['department_memorials'];
  verificationRecords: ChancellorReply['verification_records'];
  councilReview: ChancellorReply['council_review'];
  agentContributions: ChancellorReply['agent_contributions'];
  archiveRef: ChancellorReply['archive_ref'];
}

export interface ChancellorReplyView {
  conclusion: string;
  keyReasons: readonly string[];
  nextAction: string;
  completionStatus: CompletionStatus | null;
  criteria: readonly ChancellorCriterionView[];
  dossier: ChancellorReplyDossier;
}

/**
 * Public presentation seam for the emperor's single Chancellor reply.
 *
 * This is deliberately a projection, not a judge: every conclusion, criterion
 * status and completion status is copied from the backend contract verbatim.
 */
export function projectChancellorReply(reply: ChancellorReply): ChancellorReplyView {
  const matrix = reply.fulfillment_matrix;

  return {
    conclusion: reply.conclusion,
    keyReasons: reply.key_reasons.filter((reason) => reason.trim().length > 0).slice(0, 3),
    nextAction: reply.next_step,
    completionStatus: matrix?.completion_status ?? null,
    criteria: (matrix?.criterion_results ?? []).map((criterion) => ({
      id: criterion.criterion_id,
      criterion: criterion.criterion,
      status: criterion.status,
      evidence: [
        ...criterion.execution_artifact_refs.map((ref) => ({ kind: 'execution' as const, ref })),
        ...criterion.domain_evidence_refs.map((ref) => ({ kind: 'domain' as const, ref })),
        ...criterion.independent_evidence_refs.map((ref) => ({ kind: 'independent' as const, ref })),
      ],
      verifierFindings: criterion.verifier_findings,
      confidence: criterion.confidence,
      gap: criterion.gap_or_next_action,
    })),
    dossier: {
      missionId: matrix?.mission_id ?? null,
      objective: matrix?.objective_restatement ?? null,
      disagreements: matrix?.disagreements ?? reply.disagreements,
      unknowns: matrix?.unknowns ?? [],
      residualRisks: matrix?.residual_risks ?? [],
      evidenceRefs: reply.evidence_refs,
      foresightBriefRefs: reply.foresight_brief_refs,
      alternatives: reply.alternatives,
      mattersForImperialDecision: reply.matters_for_imperial_decision,
      budgetAndTimeline: reply.budget_and_timeline,
      truthLabel: reply.truth_label,
      riskLevel: reply.risk_level,
      uncertaintyLevel: reply.uncertainty_level,
      departmentMemorials: reply.department_memorials,
      verificationRecords: reply.verification_records,
      councilReview: reply.council_review,
      agentContributions: reply.agent_contributions,
      archiveRef: reply.archive_ref,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDepartmentMemorial(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonBlankString(value.department_id)
    && isNonBlankString(value.position)
    && isStringArray(value.key_findings)
    && isStringArray(value.evidence_refs)
    && isStringArray(value.red_flags)
    && isStringArray(value.unresolved_questions)
    && isStringArray(value.dissent)
    && isNonBlankString(value.recommendation)
    && isStringArray(value.office_result_refs)
  );
}

function isPublicVerificationRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonBlankString(value.criterion)
    && value.verifier_department_id === 'jin_yi_wei'
    && typeof value.verification_ref === 'string'
    && /^sha256:[0-9a-f]{64}$/.test(value.verification_ref)
    && VERIFICATION_OUTCOME_SET.has(String(value.outcome))
    && isStringArray(value.evidence_refs)
    && isStringArray(value.findings)
    && value.findings.length > 0
  );
}

function isCouncilReview(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isStringArray(value.participating_departments)
    && value.participating_departments.length > 0
    && isStringArray(value.agreed_findings)
    && isStringArray(value.resolved_conflicts)
    && isStringArray(value.unresolved_conflicts)
    && isStringArray(value.evidence_gaps)
    && isStringArray(value.foresight_brief_refs)
    && isStringArray(value.required_human_decisions)
    && isNonBlankString(value.recommendation)
    && Array.isArray(value.quality_gate_results)
    && value.quality_gate_results.every(isRecord)
  );
}

function isAgentContributionRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonBlankString(value.agent_id)
    && isNonBlankString(value.summary)
    && isStringArray(value.evidence_refs)
  );
}

function isAgentContributionDossier(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!AGENT_CONTRIBUTION_STATUS_SET.has(String(value.status))) return false;
  if (
    !Array.isArray(value.contributions)
    || !value.contributions.every(isAgentContributionRecord)
  ) {
    return false;
  }
  if (
    value.unavailable_reason !== null
    && typeof value.unavailable_reason !== 'string'
  ) {
    return false;
  }
  if (value.status === 'AVAILABLE') {
    return (
      value.contributions.length > 0
      && value.unavailable_reason === null
    );
  }
  return (
    value.contributions.length === 0
    && isNonBlankString(value.unavailable_reason)
  );
}

function isReplyArchiveRef(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!ARCHIVE_REF_STATUS_SET.has(String(value.status))) return false;
  if (value.status === 'SEALED') {
    return (
      isNonBlankString(value.archive_id)
      && isNonBlankString(value.ref)
    );
  }
  return value.archive_id === null && value.ref === null;
}

function isCriterionResult(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.criterion_id === 'string'
    && typeof value.criterion === 'string'
    && CRITERION_STATUS_SET.has(String(value.status))
    && isStringArray(value.execution_artifact_refs)
    && isStringArray(value.domain_evidence_refs)
    && isStringArray(value.independent_evidence_refs)
    && isStringArray(value.verifier_findings)
    && typeof value.confidence === 'number'
    && (value.gap_or_next_action === null || typeof value.gap_or_next_action === 'string')
  );
}

function isFulfillmentMatrix(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    value.schema_version === FULFILLMENT_SCHEMA_VERSION
    && typeof value.mission_id === 'string'
    && typeof value.objective_restatement === 'string'
    && Array.isArray(value.criterion_results)
    && value.criterion_results.every(isCriterionResult)
    && isStringArray(value.disagreements)
    && isStringArray(value.unknowns)
    && isStringArray(value.residual_risks)
    && typeof value.recommended_next_action === 'string'
    && COMPLETION_STATUS_SET.has(String(value.completion_status))
  );
}

function isChancellorReply(value: unknown): value is ChancellorReply {
  if (!isRecord(value)) return false;
  return (
    typeof value.conclusion === 'string'
    && typeof value.next_step === 'string'
    && isStringArray(value.key_reasons)
    && (value.fulfillment_matrix === null || isFulfillmentMatrix(value.fulfillment_matrix))
    && isStringArray(value.evidence_refs)
    && RISK_LEVEL_SET.has(String(value.risk_level))
    && UNCERTAINTY_LEVEL_SET.has(String(value.uncertainty_level))
    && isStringArray(value.foresight_brief_refs)
    && isRecord(value.budget_and_timeline)
    && isStringArray(value.alternatives)
    && isStringArray(value.disagreements)
    && isStringArray(value.matters_for_imperial_decision)
    && TRUTH_LABEL_SET.has(String(value.truth_label))
    && Array.isArray(value.department_memorials)
    && value.department_memorials.every(isDepartmentMemorial)
    && Array.isArray(value.verification_records)
    && value.verification_records.every(isPublicVerificationRecord)
    && (value.council_review === null || isCouncilReview(value.council_review))
    && (
      value.agent_contributions === null
      || isAgentContributionDossier(value.agent_contributions)
    )
    && (
      value.archive_ref === null
      || isReplyArchiveRef(value.archive_ref)
    )
  );
}

/**
 * Accepts only the authoritative Court Runtime public result (`{ reply }`).
 * Legacy ledger payloads must use an explicit migration adapter elsewhere;
 * this presentation boundary never chooses among parallel authorities.
 */
export function extractChancellorReply(payload: unknown): ChancellorReply | null {
  if (!isRecord(payload)) return null;
  if (payload.runtime_authority !== 'LANGGRAPH') return null;
  if (isChancellorReply(payload.reply)) return payload.reply;
  return null;
}
