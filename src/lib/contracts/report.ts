import type { AgentCode } from './agent';

export type ReportTemplate =
  | 'executive_digest'
  | 'strategy_report'
  | 'intel_brief'
  | 'health_report'
  | 'forecast_memo';

export type ReportSectionKind =
  | 'text'
  | 'markdown'
  | 'table'
  | 'chart'
  | 'list'
  | 'quote'
  | 'scenario'
  | 'metric_grid';

export interface ReportSection {
  id: string;
  title: string;
  kind: ReportSectionKind;
  content: unknown;
  order: number;
}

export interface ReportMetadata {
  author: string;
  audience: string;
  version: number;
  contributingAgents: AgentCode[];
}

export interface Report {
  id: string;
  taskId?: string;
  template: ReportTemplate;
  title: string;
  subtitle?: string;
  createdAt: string;
  sections: ReportSection[];
  metadata: ReportMetadata;
}

export interface ClassicReportSections {
  executiveSummary: string;
  coreRecommendations: string;
  departmentConclusions: DepartmentConclusion[];
  riskWarnings: string;
  observatoryForecast: string;
  reviewActions: string;
}

export interface DepartmentConclusion {
  agentCode: AgentCode;
  departmentName: string;
  summary: string;
  confidence: number;
  keyPoints: string[];
}
