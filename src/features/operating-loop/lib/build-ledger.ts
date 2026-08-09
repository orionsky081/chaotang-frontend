export type BuildLedgerStatus = 'dispatched' | 'reviewing' | 'returned' | 'archived';

export interface BuildLedgerAuditEvent {
  id: string;
  taskId: string;
  actor: string;
  actorId?: string | null;
  actorRole?: string | null;
  source?: string | null;
  action: string;
  fromStatus: BuildLedgerStatus;
  toStatus: BuildLedgerStatus;
  note: string;
  createdAt: string;
}

export interface BuildLedgerAssessment {
  score: number;
  grade: '优' | '良' | '中';
  riskLevel: 'low' | 'medium' | 'high';
  riskNotes: string[];
  nextSuggestion: string;
}

/** Fully projected by FastAPI; none of these conclusions are recomputed here. */
export interface BuildLedgerEntry {
  id: string;
  taskId: string;
  title: string;
  command: string;
  jiqunTaskId?: string | null;
  jiqunSessionId?: string | null;
  jiqunEntrySwarm?: string | null;
  releaseGate?: string | null;
  source?: string | null;
  suggestion?: string | null;
  evidence: string[];
  ministers: string[];
  createdAt: string;
  updatedAt: string;
  status: BuildLedgerStatus;
  assessment: BuildLedgerAssessment;
  auditTrail: BuildLedgerAuditEvent[];
  allowedTransitions: BuildLedgerStatus[];
  nextOwner: string;
  archiveGatePassed: boolean;
  archiveGateIssues: string[];
  revision: number;
}

export const BUILD_LEDGER_STATUS_LABEL: Record<BuildLedgerStatus, string> = {
  dispatched: '待军机复核',
  reviewing: '军机复核中',
  returned: '退回工部补证',
  archived: '已入史馆',
};
