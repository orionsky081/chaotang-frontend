export type ForecastScenarioName = 'optimistic' | 'base' | 'pessimistic';

export interface ForecastBoardRiskWindow {
  id?: string;
  period: string;
  opportunity: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface ForecastBoardTrigger {
  id?: string;
  description: string;
  probability?: number;
  source?: string;
}

export interface ForecastBoardScenario {
  id: string;
  name: ForecastScenarioName;
  label: string;
  probability: number;
  confidence: number;
  timeframe: {
    start: string;
    end: string;
  };
  payoffDescription?: string;
  riskWindows: ForecastBoardRiskWindow[];
  triggerConditions: ForecastBoardTrigger[];
  preActions: string[];
  evidenceIds: string[];
}

export interface ForecastBoard {
  scenarios: ForecastBoardScenario[];
  primaryScenarioId: string | null;
  confidencePct: number;
  topRiskWindow: ForecastBoardRiskWindow | null;
  nextAction: string | null;
  stats: {
    scenarioCount: number;
    evidenceCount: number;
  };
  sourceLabel: 'LIVE_BACKEND';
}
