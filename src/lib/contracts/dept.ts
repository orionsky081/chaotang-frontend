import type { AgentCode, AgentTier } from './agent';
import type { MemorialBrief } from './memorial';
import departmentsData from './departments.json';

// =========================================================================
// 部门码单一真相源 (SSOT · 铁律2/6) —— departments.json 是唯一源,前后端同读。
// 本文件的部门码映射一律【从 JSON 派生】,禁再手写平行副本。
// 后端对应加载器: backend/src/contracts/departments.py(读同一份 JSON)。
// =========================================================================

/** SSOT 单行(见 departments.json) */
export interface DepartmentRow {
  agentCode: AgentCode;
  nameCn: string;
  nameEn: string;
  tier: AgentTier;
  emoji: string;
  color: string;
  /** L4 上书房蜂群 sid(无则 null) */
  swarmId: string | null;
  /** 前端六部门页码(无则 null) */
  pageCode: DeptCode | null;
}

/** 11 码全表(SSOT) */
export const DEPARTMENTS: readonly DepartmentRow[] =
  (departmentsData.departments as unknown as DepartmentRow[]);

/** agentCode → 中文名(SSOT 派生) */
export const AGENT_CODE_TO_CN: Record<AgentCode, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.agentCode, d.nameCn]),
) as Record<AgentCode, string>;

// =========================================================================
// 部门契约 — 字段表来源: api-contracts.md §GET /api/chaotang/dept/{code}/overview
// =========================================================================

/** 部门状态(复用后端 aggregate_ministers 输出) */
export type DeptStatus = 'idle' | 'processing' | 'risk' | 'pending_review' | 'done';

export const DEPT_STATUS_LABEL: Record<DeptStatus, string> = {
  idle: '待命',
  processing: '处理中',
  risk: '风险',
  pending_review: '待审',
  done: '已完成',
};

export const DEPT_STATUS_COLOR: Record<DeptStatus, string> = {
  idle: '#6A7299',
  processing: '#6BA0FF',
  risk: '#F43F5E',
  pending_review: '#F0C66A',
  done: '#3DD68C',
};

/** 部门代号(6 个页面支持的) */
export type DeptCode = 'finance' | 'legal' | 'market' | 'guard' | 'ops' | 'physician';

/**
 * dept(页码) → AgentCode 映射 ——【从 departments.json 派生 · 铁律2】。
 * 全仓任何 dept→agent/中文名 映射必须 import 这里,禁各自维护平行副本
 * 页面与后端都从 departments.json 派生，不维护平行映射。
 * 漂移由 dept-ssot.nodetest.ts 回归断言看守(改码先改 departments.json)。
 */
export const DEPT_TO_AGENT_CODE: Record<DeptCode, AgentCode> = Object.fromEntries(
  DEPARTMENTS
    .filter((d): d is DepartmentRow & { pageCode: DeptCode } => d.pageCode !== null)
    .map((d) => [d.pageCode, d.agentCode]),
) as Record<DeptCode, AgentCode>;

/** 页码 → L4 蜂群 sid(SSOT 派生;后端 swarm_execution_loop 认这些 sid) */
export const DEPT_TO_SWARM_ID: Partial<Record<DeptCode, string>> = Object.fromEntries(
  DEPARTMENTS
    .filter((d): d is DepartmentRow & { pageCode: DeptCode } => d.pageCode !== null && d.swarmId !== null)
    .map((d) => [d.pageCode, d.swarmId]),
) as Partial<Record<DeptCode, string>>;

/** 部门显示名(前端用) */
export const DEPT_DISPLAY: Record<DeptCode, { nameCn: string; nameEn: string; emoji: string; color: string }> = {
  finance:   { nameCn: '户部',  nameEn: 'Revenue',       emoji: '💰', color: '#F0C66A' },
  legal:     { nameCn: '刑部',  nameEn: 'Justice',       emoji: '⚖️', color: '#3DD68C' },
  market:    { nameCn: '礼部',  nameEn: 'Rites',         emoji: '🎨', color: '#C070D0' },
  guard:     { nameCn: '锦衣卫', nameEn: 'Imperial Guard', emoji: '🛰', color: '#FB923C' },
  ops:       { nameCn: '兵部',  nameEn: 'Operations',   emoji: '⚔️', color: '#6BA0FF' },
  physician: { nameCn: '太医院', nameEn: 'Physician',    emoji: '🩺', color: '#2DD4BF' },
};

/** 任务简报 */
export interface TaskBrief {
  taskId: string;
  title: string;
  progressPct: number;
}

/** 关键指标(可包含 mock 演示数据) */
export interface Metric {
  label: string;
  value: string;
  unit?: string;
}

/** 风险条目 */
export interface RiskItem {
  label: string;
  level: 'low' | 'medium' | 'high' | 'critical';
}

export const RISK_LEVEL_COLOR: Record<RiskItem['level'], string> = {
  low: '#3DD68C',
  medium: '#F0C66A',
  high: '#FB923C',
  critical: '#F43F5E',
};

/** 大臣元数据 */
export interface MinisterInfo {
  id: string;
  name: string;
  role: string;
  iconKey: string;
  description: string;
}

/** 部门详情聚合 */
export interface DeptOverview {
  code: string;
  agentCode: AgentCode;
  minister: MinisterInfo;
  status: DeptStatus;
  recentMemorials: MemorialBrief[];
  activeTasks: TaskBrief[];
  keyMetrics: Metric[];   // 部门特定,可含 [MOCK] 演示数据
  risks?: RiskItem[];
}
