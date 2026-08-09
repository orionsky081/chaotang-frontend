/**
 * 朝堂 OS · 锦衣卫情报数据契约（SoT）
 *
 * 所有情报信号相关类型在此定义；下游组件从此处 import。
 * src/types/intel.ts 中的类型已迁移至此；旧文件保留向后兼容 re-export。
 */

import type { AgentCode } from './agent';
import type { CredTier } from './court-boundary';

/* ==========================================================================
   基础枚举
   ========================================================================== */

export type IntelCategory = 'risk' | 'opportunity' | 'neutral';

export type IntelLevel = 'info' | 'watch' | 'warning' | 'critical';

export type IntelCredibility = 'low' | 'medium' | 'high' | 'verified';

export type IntelIndustryLane = 'competitor' | 'upstream' | 'policy' | 'customer' | 'tech' | 'other';

export type IntelIndustryLens = 'geopolitics' | 'military' | 'finance' | 'ai' | 'people';

/* ==========================================================================
   情报来源
   ========================================================================== */

export interface IntelSource {
  name: string;
  url?: string;
  publishedAt: string;
  /** 后端给出的信源历史可信度分级。 */
  credibilityTier?: CredTier;
}

/* ==========================================================================
   地理坐标
   ========================================================================== */

export interface IntelCoordinate {
  lat: number;
  lng: number;
}

/* ==========================================================================
   领先度原料（仙狐后端填 · 前端不臆造）
   ========================================================================== */

/**
 * 领先度 = 我方比市场早多少。由仙狐分级采集提供两个时间戳；
 * 缺 edgeFirstSeenAt → 领先度不可算，前端必须空态、禁写死数字（铁律4 回归断言守）。
 */
export interface IntelLeadTime {
  /** 边缘 / 非主流源首次捕获（ISO）。 */
  edgeFirstSeenAt: string;
  /** 主流媒体首次命中（ISO）；缺省=尚未被主流跟进=仍领先。 */
  mainstreamHitAt?: string;
}

/* ==========================================================================
   情报信号（核心数据结构）
   ========================================================================== */

export interface IntelSignal {
  id: string;
  category: IntelCategory;
  level: IntelLevel;
  title: string;
  summary: string;
  /** ISO-2 或自定义 region code */
  region: string;
  regionLabel: string;
  industry: string;
  /** 后端行业分类；前端只分栏呈现，不做关键词推断。 */
  industryLane?: IntelIndustryLane;
  /** 后端可多选的行业透镜标签。 */
  industryLenses?: IntelIndustryLens[];
  credibility: IntelCredibility;
  sources: IntelSource[];
  firstSeenAt: string;
  lastUpdatedAt: string;
  coordinates?: IntelCoordinate;
  /** 已转派给哪些 agent */
  routedTo?: AgentCode[];
  /** 风险等级着色用（0-100） */
  impactScore?: number;
  /** 领先度原料（仙狐后端填）；缺则领先度不可算、前端空态。 */
  leadTime?: IntelLeadTime;
  /** 一句话「对我们=?」（编排/后端填）；缺则不显示，不臆造。 */
  soWhat?: string;
}

export type IntelDepartmentCode =
  | 'hu_bu'
  | 'bing_bu'
  | 'li_bu'
  | 'li_bu_rites'
  | 'xing_bu'
  | 'gong_bu'
  | 'jinyiwei';

export type IntelProcessStatus = 'new' | 'verified' | 'packed' | 'routed' | 'archived';
export type IntelSourceGrade = 'real' | 'mixed';

/** 后端完成领域归属、证据状态与来源等级判断后的情报视图。 */
export interface IntelBoardSignal extends IntelSignal {
  departmentCode: IntelDepartmentCode;
  processStatus: IntelProcessStatus;
  sourceGrade: IntelSourceGrade;
}

export interface IntelBoardHeadline {
  signalId: string;
  ceremony: 'urgent' | 'brief';
  leadHours: number | null;
  stillLeading: boolean | null;
}

export interface IntelDispatchTarget {
  agentCode: AgentCode;
  nameCn: string;
  emoji: string;
  color: string;
}

export interface IntelBoard {
  signals: IntelBoardSignal[];
  headline: IntelBoardHeadline | null;
  dispatchTargets: IntelDispatchTarget[];
  stats: {
    total: number;
    urgent: number;
    verified: number;
    sourceCount: number;
  };
  sourceLabel: string;
}
