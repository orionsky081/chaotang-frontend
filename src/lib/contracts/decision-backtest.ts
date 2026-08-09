export interface PastDecision {
  id: string;
  command: string;
  action: string;
}

export interface BacktestFinding {
  id: string;
  command: string;
  action: string;
  engineVerdict: string;
  missedRisks: string[];
}

export interface BacktestReport {
  total: number;
  replayed: number;
  missedCount: number;
  missed: BacktestFinding[];
}
