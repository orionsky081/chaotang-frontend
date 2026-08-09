/** Governance wire contracts. State transitions and policy live in the backend. */

export type Verdict = '准' | '驳' | '再议';

export type BlastRadius = 'internal' | 'external' | 'irreversible';

export interface Constitution {
  id: string;
  clause: string;
  severity: 'forbidden' | 'warning' | 'advisory';
  scope: string[];
  createdAt: string;
}

export interface ZhongshuDraft {
  draft: string;
  benefits: string[];
  concerns: string[];
  affectedDepts: string[];
  citations: Array<{ scrollId: string; chunkId: string; text: string }>;
}

export interface MenxiaReview {
  verdict: Verdict;
  reasoning: string;
  violatedConstitutions: string[];
  precedents: Array<{ caseId: string; outcome: string; relevance: string }>;
  suggestedEdits: string[];
}

export interface ExecutionStep {
  id: string;
  dept: string;
  action: string;
  depends: string[];
  blastRadius: 'low' | 'medium' | 'high';
  compensatingAction?: string;
}

export interface ShangshuExecution {
  steps: ExecutionStep[];
  etaMs: number;
  dispatchedTo: string[];
}

export interface DeliberationResult {
  sessionId: string;
  timestamp: string;
  originalCommand: string;
  zhongshu: ZhongshuDraft;
  menxia: MenxiaReview;
  shangshu?: ShangshuExecution;
  finalVerdict: Verdict;
  totalMs: number;
  sourceLabel: 'LIVE' | 'FALLBACK';
}

export type BillState =
  | 'drafted'
  | 'under_review'
  | 'revising'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'shelved'
  | 'archived';

export type Actor = 'ruler' | 'zhongshu' | 'menxia' | 'shangshu' | 'liubu' | 'system';

export type EventType =
  | 'create'
  | 'submit_to_review'
  | 'approve'
  | 'reject_for_revision'
  | 'reject_final'
  | 'shelve'
  | 'resubmit'
  | 'dispatch'
  | 'mark_completed'
  | 'mark_failed'
  | 'archive';

export interface BillEvent {
  id: string;
  billId: string;
  type: EventType;
  actor: Actor;
  ts: string;
  reason: string;
  payload?: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export interface AllowedBillTransition {
  type: Exclude<EventType, 'create'>;
  actor: Actor;
}

export interface Bill {
  id: string;
  title: string;
  command: string;
  state: BillState;
  draft?: string;
  menxiaReview?: { verdict: Verdict; reasoning: string; violations: string[] };
  shangshuPlan?: { steps: Array<{ dept: string; action: string }>; etaMs: number };
  events: BillEvent[];
  createdAt: string;
  lastTransitionAt: string;
  revisionCount: number;
  allowedTransitions: AllowedBillTransition[];
}
