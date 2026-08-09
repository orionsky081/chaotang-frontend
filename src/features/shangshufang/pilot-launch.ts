import type { PilotReadinessResponse } from '@/lib/contracts/shangshufang-loop';
import { buildPrimaryDecreeTemplate } from '@/lib/contracts/product-slice';

/** 上书房首旨必须消费产品主切口 SSOT，禁止在入口另写泛化首场景。 */
export const FIRST_DECREE_TEMPLATE = buildPrimaryDecreeTemplate();

export type PilotLaunchState = 'checking' | 'ready' | 'blocked' | 'unavailable';

export interface PilotLaunchGuide {
  state: PilotLaunchState;
  headline: string;
  description: string;
  serviceBlockers: string[];
  formalPilotLabel: string;
  formalPilotBlockers: string[];
}

export function resolvePilotLaunchGuide(
  readiness: PilotReadinessResponse | null,
  readinessError: string | null,
): PilotLaunchGuide {
  if (readinessError) {
    return {
      state: 'unavailable',
      headline: '准入状态不可用，暂不能据页面判断系统已就绪',
      description: '可先整理旨意，但下旨前应恢复后端实时准入检查。',
      serviceBlockers: [],
      formalPilotLabel: '正式对外试点 · 状态不可用',
      formalPilotBlockers: [],
    };
  }

  if (!readiness) {
    return {
      state: 'checking',
      headline: '正在核验内部试用链路',
      description: '页面正在读取后端、模型网关与主库的实时状态。',
      serviceBlockers: [],
      formalPilotLabel: '正式对外试点 · 核验中',
      formalPilotBlockers: [],
    };
  }

  const quotePilot = readiness.quote_pilot;
  const formalPilotLabel = !quotePilot
    ? '正式报价试点 · 后端状态待升级'
    : quotePilot.ready
      ? '正式报价试点 · 已放行'
      : quotePilot.enabled
        ? `正式报价试点 · 阻塞 ${quotePilot.blockers.length} 项`
        : '正式报价试点 · 未启用（不影响内部试用）';
  const internalPilot = readiness.internal_pilot;

  if (!internalPilot) {
    return {
      state: 'unavailable',
      headline: '后端尚未提供内部试用准入真相，暂不能判定可开始',
      description: '整体健康检查不能替代数据库、执行模式和签章能力核验。',
      serviceBlockers: ['internal_pilot_readiness_unavailable'],
      formalPilotLabel,
      formalPilotBlockers: quotePilot?.blockers ?? [],
    };
  }

  if (!internalPilot.pilotReady) {
    return {
      state: 'blocked',
      headline: '内部试用链路未就绪，先处理后端阻塞项',
      description: '页面可打开不等于蜂群可执行；请修复下列实时阻塞后再下旨。',
      serviceBlockers: internalPilot.blockers,
      formalPilotLabel,
      formalPilotBlockers: quotePilot?.blockers ?? [],
    };
  }

  const deterministicOnly = !internalPilot.decisionRuntime.realAgentsEnabled;
  return {
    state: 'ready',
    headline: '内部试用链路在线，可以拟第一道真实旨意',
    description: deterministicOnly
      ? '当前为受限确定性会审（FALLBACK，非真实多 Agent）；可验证裁决与归档，外部动作仍禁用。'
      : '本轮只形成建议、裁决与归档；付款、签约和对外发送仍须单独准奏。',
    serviceBlockers: [],
    formalPilotLabel,
    formalPilotBlockers: quotePilot?.ready ? [] : quotePilot?.blockers ?? [],
  };
}
