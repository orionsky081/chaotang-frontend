/** Agent DTOs plus display identity derived from the cross-stack department SSOT. */
import departmentSsot from './departments.json';

export type AgentCode =
  | 'prime_minister'
  | 'scribe'
  | 'li_bu'
  | 'hu_bu'
  | 'li_bu_rites'
  | 'bing_bu'
  | 'xing_bu'
  | 'gong_bu'
  | 'qin_tian_jian'
  | 'jin_yi_wei'
  | 'tai_yi_yuan';

export type AgentTier = 'core' | 'ministry' | 'special_bureau';

/** Presentation identity only. Capabilities, routing and fallback policy come from backend APIs. */
export interface AgentMeta {
  code: AgentCode;
  nameCn: string;
  nameEn: string;
  tier: AgentTier;
  emoji: string;
  color: string;
}

export type AgentState =
  | 'idle'
  | 'assigned'
  | 'running'
  | 'waiting_dependency'
  | 'summarizing'
  | 'completed'
  | 'failed'
  | 'fallback_completed'
  | 'archived';

export type RequestedOutputType = 'brief' | 'report' | 'plan' | 'forecast';
export type AgentRunStatus = 'completed' | 'failed' | 'fallback_completed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentRun {
  id: string;
  taskId: string;
  subtaskId: string;
  agentCode: AgentCode;
  assignedNodeId?: string;
  routingNodeIds?: string[];
  nodeType?: string;
  nodeMaturity?: string;
  state: AgentState;
  progressPct: number;
  currentTaskTitle?: string;
  latestSummary?: string;
  riskLevel?: RiskLevel;
  isWaitingDependency: boolean;
  hasReported: boolean;
  confidence?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface RiskFlag {
  level: RiskLevel;
  category: string;
  description: string;
  source?: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
}

export type DisplayPayloadType =
  | 'text'
  | 'markdown'
  | 'chart'
  | 'map'
  | 'table'
  | 'kv_list'
  | 'metric_grid'
  | 'scenario'
  | 'mixed';

export interface DisplayPayload {
  type: DisplayPayloadType;
  content: unknown;
}

export interface AgentInput {
  taskId: string;
  subtaskId: string;
  agentId: AgentCode;
  goal: string;
  taskContext: Record<string, unknown>;
  dependencyInputs: Record<string, unknown>;
  attachments: Attachment[];
  constraints: string[];
  mode: 'scripted' | 'hybrid' | 'live';
  userPreferences: Record<string, unknown>;
  requestedOutputType: RequestedOutputType;
}

export interface AgentOutput {
  taskId: string;
  subtaskId: string;
  agentId: AgentCode;
  status: AgentRunStatus;
  summary: string;
  structuredOutput: Record<string, unknown>;
  riskFlags: RiskFlag[];
  assumptions: string[];
  confidence: number;
  needsFollowup: boolean;
  nextNeededInputs: string[];
  displayPayload: DisplayPayload;
}

export const AGENT_META = Object.fromEntries(
  departmentSsot.departments.map((department) => [
    department.agentCode,
    {
      code: department.agentCode,
      nameCn: department.nameCn,
      nameEn: department.nameEn,
      tier: department.tier,
      emoji: department.emoji,
      color: department.color,
    },
  ]),
) as Record<AgentCode, AgentMeta>;

export const AGENT_DISPLAY_ORDER = departmentSsot.departments.map(
  (department) => department.agentCode,
) as AgentCode[];

/** UI labels for backend node identifiers that are not Tier-0 department codes. */
export const NODE_LABELS: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  human_throne_review: '王座终裁',
  waijiaobu_sales: '销售蜂群',
  waijiaobu_web_marketing: '网站营销蜂群',
  waijiaobu_short_video: '短视频营销蜂群',
  waijiaobu_brand: '品牌宣传蜂群',
  yuanyangbu_overseas_commerce: '海外电商蜂群',
  yuanyangbu_cross_border_ads: '跨境投放蜂群',
  yuanyangbu_overseas_site_ops: '海外站点运营蜂群',
  jinyiwei_signal: '信号侦缉蜂群',
  jinyiwei_policy_watch: '政策监看蜂群',
  qintianjian_forecast: '趋势预测蜂群',
  qintianjian_scenario: '情景推演蜂群',
};

export function getNodeDisplayName(nodeId: string): string {
  return NODE_LABELS[nodeId] ?? AGENT_META[nodeId as AgentCode]?.nameCn ?? nodeId;
}
