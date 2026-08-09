/** Presentation-ready council projection returned by FastAPI. */
export interface CouncilDiscussionItem {
  speaker: string;
  content: string;
  tone: string;
}

export interface CouncilConflictItem {
  title: string;
  body: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CouncilStatusItem {
  title: string;
  body: string;
  tone: 'danger' | 'gold' | 'success';
}

export interface CouncilEventItem {
  time: string;
  title: string;
  body: string;
  tone: 'danger' | 'gold' | 'success' | 'info';
  speaker: string;
  department: string;
  phase: 'waiting' | 'ready' | 'running';
}

export interface CouncilSourceBundle {
  sourceLabel: 'LIVE_SWARM' | 'EMPTY';
  liveRunCount: number;
  currentCommand: string | null;
  currentVerdict: string | null;
  discussions: CouncilDiscussionItem[];
  conflicts: CouncilConflictItem[];
  actions: string[];
  waitChain: string[];
  statusItems: CouncilStatusItem[];
  events: CouncilEventItem[];
}
