'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { pollUntilTerminal } from '@/lib/api/rest-polling';
import {
  isShangshufangSignoffRequiredError,
  shangshufangLoop,
} from '@/lib/api/clients/shangshufang-loop';
import { assetUrl } from '@/lib/asset';
import { getSession } from '@/lib/auth';
import { normalizeSession } from '@/lib/auth/session-claims';
import {
  isTerminalTaskStatus,
  buildDecisionRequest,
  parseHumanSignoffCredentialJson,
  type ConfirmEdictResponse,
  type DecisionAction,
  type HumanSignoffChallenge,
  type HumanSignoffCredential,
  type DraftEdict,
  type Memorial,
  type PilotArchiveResponse,
  type PilotDeviationCard,
  type PilotOutcomeRequest,
  type PilotPrediction,
  type PilotReadinessResponse,
  type PilotTelemetryResponse,
  type ShangshufangTask,
  type TaskStatusResponse,
} from '@/lib/contracts/shangshufang-loop';
import { ChancellorColumn } from './components/ChancellorColumn';
import { EdictStage } from './components/MemorialScroll';
import { WangColumn } from './components/WangColumn';
import { DecreeInput, type AskTarget } from './components/DecreeInput';
import { ImperialButton } from './components/atoms';
import { SHANGSHUFANG_ASSETS } from './constants';
import {
  FIRST_DECREE_TEMPLATE,
  resolvePilotLaunchGuide,
  type PilotLaunchGuide,
} from './pilot-launch';
import type { ChancellorSuggestion, DecreeMode, DecreeState, WangTutorial } from './types';
import type { EdictView } from './edict-content';

type PilotPhase =
  | 'idle'
  | 'drafting'
  | 'drafted'
  | 'dispatching'
  | 'polling'
  | 'ready'
  | 'deciding'
  | 'decided'
  | 'error';

type DecisionOutcome = {
  tone: 'success' | 'warning';
  text: string;
};

type ImperialAuthority = 'checking' | 'allowed' | 'denied' | 'unknown';

const MAX_OUTCOME_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_SIGNOFF_CREDENTIAL_BYTES = 64 * 1024;

async function outcomeArtifactBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 32_768;
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

const ACTION_LABEL: Record<Exclude<DecisionAction, 'archive'>, string> = {
  approve: '准奏',
  reject: '驳回',
  request_evidence: '补证',
};

type PilotPredictionType = PilotOutcomeRequest['prediction_type'];

const PREDICTION_LABEL: Record<PilotPredictionType, string> = {
  gross_margin: '毛利率',
  delivery: '交付周期',
  payment: '回款周期',
};

const READINESS_BLOCKER_LABEL: Record<string, string> = {
  model_gateway_unavailable: '模型网关不可用',
  internal_pilot_readiness_unavailable: '后端未提供内部试用准入真相',
  model_provider_unconfigured: '真实模型供应商尚未配置',
  model_provider_unreachable: '真实模型供应商不可达',
  primary_database_unavailable: '内部试用数据库不可用',
  primary_database_migration_not_at_head: '内部试用数据库迁移未到最新版本',
  primary_database_schema_incompatible: '内部试用数据库结构不兼容',
  backend_port_in_use: '后端端口 8081 已被其他进程占用',
  backend_port_must_be_8081: '内部试用后端必须使用端口 8081',
  unverified_production_court_kernel_enabled: '未验证的生产内核被错误启用',
  external_execution_mode_not_allowed: '内部试用禁止外部执行模式',
  quote_pilot_not_enabled: '正式报价试点尚未启用',
  quote_authentication_disabled: '正式认证尚未启用',
  quote_test_only_evidence_enabled: '仍允许测试证据进入正式链路',
  quote_backend_port_invalid: '后端未运行在固定端口 8081',
  quote_database_unavailable: '主数据库不可用',
  quote_database_dialect_unsupported: '数据库类型不在正式试点允许范围',
  quote_database_migration_not_at_head: '数据库迁移未到登记版本',
  quote_database_audit_guards_missing: '关键审计防篡改守门缺失',
  quote_evidence_root_unavailable: '证据根目录不可用',
  quote_evidence_root_missing: '证据根目录不存在',
  quote_evidence_root_unsafe: '证据根目录权限不安全',
  quote_evidence_root_parent_unsafe: '证据根目录上级路径权限不安全',
  quote_evidence_signers_missing: '证据签名人名册缺失',
  quote_evidence_signers_invalid: '证据签名人名册无效',
  quote_effect_signing_authority_unavailable: '执行效果签名权不可用',
  quote_outcome_signing_authority_unavailable: '结果回填签名权不可用',
  quote_fx_artifact_unavailable: '汇率签名材料不可用',
  quote_egress_census_unavailable: '外部出口清册不可用',
  quote_egress_census_drift: '外部出口清册与代码漂移',
  quote_execution_mode_not_production_approved: '执行模式未获正式试点批准',
  quote_cost_attribution_unavailable: '成本归因材料不可用',
};

function readinessBlockerLabel(code: string): string {
  return READINESS_BLOCKER_LABEL[code] ?? code;
}

function isPilotPredictionType(value: string): value is PilotPredictionType {
  return value === 'gross_margin' || value === 'delivery' || value === 'payment';
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === 'ratio') return `${(value * 100).toFixed(2)}%`;
  return `${value.toLocaleString('zh-CN')} ${unit}`.trim();
}

function formatDeviationValue(value: number, unit: string): string {
  if (unit === 'ratio') return `${(value * 100).toFixed(2)} 个百分点`;
  return `${value.toLocaleString('zh-CN')} ${unit}`.trim();
}

function formatVersionFact(
  versions: PilotPrediction['versions'],
  key: 'model' | 'prompt' | 'data' | 'rule',
): string {
  const fact = versions?.[key];
  if (!fact) return '未记录';
  if (fact.status === 'not_applicable') return '不适用（确定性规则）';
  return typeof fact.version === 'string' && fact.version ? fact.version : '不可用';
}

function formatPredictionWarning(prediction: PilotPrediction): string {
  const label = isPilotPredictionType(prediction.prediction_type)
    ? PREDICTION_LABEL[prediction.prediction_type]
    : prediction.prediction_type;
  if (prediction.status !== 'available' || typeof prediction.expected_value !== 'number') {
    return [
      `${label}：不可用（${prediction.unavailable_reason_code ?? '未说明'}）`,
      '概率：不可用；缺证时不生成情景概率',
    ].join('\n');
  }
  if (!prediction.scenarios) {
    return `${label}：${formatMetricValue(prediction.expected_value, prediction.unit ?? '')}`;
  }

  const { base, optimistic, pessimistic } = prediction.scenarios;
  const lines = [
    `${label} · 基准：${formatMetricValue(base.expected_value, base.unit)}`,
    `乐观：${formatMetricValue(optimistic.expected_value, optimistic.unit)}（${optimistic.assumptions.join('；')}）`,
    `悲观：${formatMetricValue(pessimistic.expected_value, pessimistic.unit)}（${pessimistic.assumptions.join('；')}）`,
  ];
  if (prediction.interval) {
    lines.push(
      `压力区间：${formatMetricValue(prediction.interval.lower, prediction.interval.unit)} ～ ${formatMetricValue(prediction.interval.upper, prediction.interval.unit)}`,
    );
  }
  lines.push(
    `概率：${prediction.probability?.status === 'available' ? '已有证据分布' : '不可用（现有证据不足以估计概率）'}`,
    `证据引用：${prediction.evidence_refs?.join('；') || '不可用'}`,
    `敏感性：${prediction.sensitivity?.map((item) => `${item.factor ?? '因素'} ${item.stress_change ?? ''}`).join('；') || '未记录'}`,
    `风险触发器：${prediction.risk_triggers?.join('；') || '未记录'}`,
    `建议动作：${prediction.recommended_actions?.join('；') || '未记录'}`,
    `版本：模型 ${formatVersionFact(prediction.versions, 'model')}；提示词 ${formatVersionFact(prediction.versions, 'prompt')}；数据 ${formatVersionFact(prediction.versions, 'data')}；规则 ${formatVersionFact(prediction.versions, 'rule')}`,
  );
  return lines.join('\n');
}

function writeCaseIdToUrl(caseId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('caseId', caseId);
  window.history.replaceState(window.history.state, '', url);
}

function joinLines(values: Array<string | undefined>, fallback: string): string {
  const visible = values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return visible.length ? visible.join('\n') : fallback;
}

function draftView(taskId: string, draft: DraftEdict): EdictView {
  return {
    id: `${taskId}-draft`,
    title: '圣旨草案',
    subtitle: draft.emperor_confirmation_question,
    question: draft.original_question,
    seal: 'imperial',
    meta: {
      petitioner: '上书房',
      reporter: '丞相',
      badges: [{ label: draft.source_label, tone: draft.source_label.includes('LIVE') ? 'green' : 'amber' }],
    },
    rows: [
      { label: '拟旨', body: draft.refined_edict },
      { label: '已知', body: joinLines(draft.known_facts, '尚无已核验事实。') },
      { label: '缺口', body: joinLines(draft.unknown_gaps, '拟旨阶段未发现新增缺口。') },
      { label: '参审', body: joinLines(draft.recommended_departments, '待丞相路由。') },
      { label: '风险', body: joinLines(draft.risk_flags, '拟旨阶段未标记新增风险。') },
      { label: '来源', body: draft.source_label },
    ],
  };
}

function measurementText(
  measurement: Record<string, unknown> | undefined,
  formatter?: (value: number) => string,
): string {
  if (measurement?.status !== 'available' || typeof measurement.value !== 'number') return '不可用';
  return formatter ? formatter(measurement.value) : `${measurement.value} ${String(measurement.unit ?? '')}`.trim();
}

function memorialView(
  task: ShangshufangTask,
  memorial: Memorial,
  routeReason?: string,
  telemetry?: PilotTelemetryResponse | null,
): EdictView {
  const ministries = memorial.ministry_outputs.map((item) => (
    `${item.department}${item.position ? ` · ${item.position}` : ''}：${item.opinion}`
  ));
  const evidence = memorial.evidence_chain?.map((item) => (
    `${item.title}${item.source_type ? `（${item.source_type}）` : ''}`
  )) ?? [];
  const gaps = [...task.missing_evidence, ...memorial.evidence_gaps];
  const risks = memorial.risk_register?.map((item) => (
    `${item.risk}${item.severity ? `（${item.severity}）` : ''}${item.reason ? `：${item.reason}` : ''}`
  )) ?? memorial.risk_flags ?? [];
  const qualityReasons = memorial.quality_gate.reasons.join('；');
  const horizontalReviews = (memorial.horizontal_reviews ?? []).map((review) => (
    `${review.institution} · ${review.triggered ? '已触发' : '未触发'} · ${review.status}：${
      joinLines([...review.reasons, ...review.findings], '未返回说明。')
    }`
  ));
  const blocked = memorial.quality_gate.status.toLowerCase().includes('block');
  const effectCoverageText = telemetry?.effect_coverage.status === 'complete'
    ? '副作用观测完整'
    : `副作用观测未完整（${telemetry?.effect_coverage.reason ?? '未返回覆盖证明'}）`;
  const telemetryBody = telemetry
    ? [
        effectCoverageText,
        `耗时：${measurementText(
          telemetry.measurements.draft_to_memorial_elapsed,
          (value) => `${(value / 1000).toFixed(1)} 秒`,
        )}（20分钟门 ${String(telemetry.gates.time_20_minutes.status ?? 'unknown')}）`,
        `成本：${measurementText(telemetry.measurements.cost)}（15元门 ${
          String(telemetry.gates.cost_15_cny.status ?? 'unknown')
        }；${String(telemetry.gates.cost_15_cny.reason ?? '已核验')}）`,
        `外部读取：${measurementText(telemetry.measurements.external_reads)}`,
        `外部变更：${measurementText(telemetry.measurements.external_mutations)}（零变更门 ${
          String(telemetry.gates.external_mutations_zero.status ?? 'unknown')
        }）`,
        `总门：${String(telemetry.gates.overall.status ?? 'unknown')}`,
      ].join('\n')
    : '本案遥测尚未回读，不能证明20分钟、15元和零外部变更目标。';

  return {
    id: `${task.task_id}-${task.updated_at}`,
    title: memorial.title,
    subtitle: `案号 ${task.task_id}`,
    documentKind: '回奏',
    question: task.raw_question,
    seal: 'imperial',
    alert: blocked
      ? { tone: 'red', text: `质门阻断：${qualityReasons || '当前不可准奏'}` }
      : undefined,
    meta: {
      petitioner: '军机处',
      reporter: '丞相',
      badges: [{ label: memorial.source_label, tone: memorial.source_label.includes('LIVE') ? 'green' : 'amber' }],
    },
    rows: [
      { label: '圣裁', body: joinLines([memorial.verdict, memorial.summary], '未形成明确建议。') },
      { label: '路由', body: routeReason?.trim() || '后端未返回路由理由。' },
      { label: '分奏', body: joinLines(ministries, '后端未返回部门分奏。') },
      { label: '横审', body: joinLines(horizontalReviews, '后端未返回锦衣卫/钦天监触发记录。') },
      { label: '证据', body: joinLines(evidence, '本轮未返回可核验证据链。') },
      { label: '缺证', body: joinLines(gaps, '无新增缺证。') },
      { label: '风险', body: joinLines(risks, '无新增风险披露。') },
      { label: '后令', body: memorial.recommended_next_action || '未返回下一步安排。' },
      {
        label: '质门',
        body: `${memorial.quality_gate.status}${qualityReasons ? `：${qualityReasons}` : ''}${
          memorial.quality_gate.human_signoff_required ? '；需人工圣裁' : ''
        }`,
      },
      { label: '审计', body: telemetryBody },
      { label: '来源', body: `奏折 ${memorial.source_label}；任务 ${task.source_label}` },
    ],
  };
}

function archivedMemorialView(
  task: ShangshufangTask,
  memorial: Memorial,
  archive: PilotArchiveResponse,
  deviationCard: PilotDeviationCard | null,
  telemetry: PilotTelemetryResponse | null,
  routeReason?: string,
): EdictView {
  const base = memorialView(task, memorial, routeReason, telemetry);
  const predictions = archive.prediction_snapshot.predictions.map(formatPredictionWarning);
  const deviations = deviationCard?.deviations ?? [];
  return {
    ...base,
    id: `${base.id}-${archive.snapshot_hash}`,
    documentKind: '奏折',
    rows: [
      ...base.rows,
      {
        label: '签封',
        body: `决策时点 ${archive.prediction_snapshot.decision_as_of}\n快照 ${archive.snapshot_hash}\n证据链 ${archive.chain_hash}`,
      },
      {
        label: '钦天监',
        body: [
          archive.prediction_snapshot.qintian_role?.description
            ?? '钦天监仅提供预测预警，不直接形成硬否决。',
          joinLines(predictions, '本案没有可用预测。'),
        ].join('\n\n'),
      },
      {
        label: '偏差',
        body: deviations.length
          ? deviations.map((item) => {
              const label = PREDICTION_LABEL[item.prediction_type];
              return [
                label,
                `预测值：${formatMetricValue(item.expected_value, item.unit)}`,
                `实际值：${formatMetricValue(item.actual_value, item.unit)}`,
                `偏差：${formatDeviationValue(item.absolute_deviation, item.unit)}`,
                `观测时间：${item.outcome.observed_at}`,
                `结果来源：${item.outcome.source_ref}`,
                `人工核验：${
                  item.outcome.trusted_for_learning
                    ? '已验签，可进入飞轮'
                    : '未验签，不进入飞轮'
                }`,
                item.outcome.source_artifact_digest
                  ? `来源摘要：${item.outcome.source_artifact_digest}`
                  : '来源摘要：不可用',
              ].join('\n');
            }).join('\n\n')
          : '尚未揭盲；原预测已冻结，等待实际结果追加。',
      },
    ],
  };
}

function idleView(): EdictView {
  return {
    id: 'pilot-empty',
    title: '御前试行 · 待拟旨',
    subtitle: '输入真实需求，可选填服务端已登记的证据包编号',
    documentKind: '圣旨',
    seal: 'imperial',
    rows: [
      { label: '流程', body: '拟旨 → 下旨 → 军机处会审 → 一页回奏 → 准奏、驳回或补证。' },
      { label: '边界', body: '内部试行；不触发报价外发、签约、付款或其他外部动作。' },
      { label: '证据', body: '证据包只能引用服务端已登记编号，浏览器不能自行声明证据为真。' },
    ],
  };
}

function isReviewReady(value: TaskStatusResponse): boolean {
  return Boolean(value.review?.memorial)
    || isTerminalTaskStatus(value.task.status)
    || value.task.status === 'awaiting_evidence'
    || value.task.status.startsWith('failed');
}

function PilotScrollBody({ view }: { view: EdictView }) {
  return (
    <div
      data-testid="pilot-one-page-memorial"
      className="memorial-body-scroll flex min-h-0 flex-col gap-2 overflow-y-auto pr-2 text-[#2E2410]"
    >
      {view.question && (
        <section className="rounded-lg border border-[#8A6A2A]/30 bg-[#FFF8E0]/40 px-3 py-2">
          <div className="text-[10px] font-semibold tracking-[0.18em] text-[#7A4A08]">皇上原问</div>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6">{view.question}</p>
        </section>
      )}
      {view.alert && (
        <div
          className={`rounded-lg border px-3 py-2 text-[11px] leading-5 ${
            view.alert.tone === 'red'
              ? 'border-[#962820]/35 bg-[#962820]/10 text-[#6B1812]'
              : 'border-[#B46F12]/35 bg-[#B46F12]/10 text-[#6A420A]'
          }`}
        >
          {view.alert.text}
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {view.rows.map((row, index) => (
          <section
            key={`${row.label}-${index}`}
            className={`rounded-lg border border-[#8A6A2A]/25 bg-[#FFF8E0]/30 px-3 py-2 ${
              row.label === '圣裁' || row.label === '拟旨' ? 'md:col-span-2' : ''
            }`}
          >
            <div className="text-[10px] font-semibold tracking-[0.16em] text-[#7A4A08]">{row.label}</div>
            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#3F2C12]">{row.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

function PilotStartGuide({
  guide,
  onUseTemplate,
}: {
  guide: PilotLaunchGuide;
  onUseTemplate: () => void;
}) {
  const ready = guide.state === 'ready';
  const checking = guide.state === 'checking';
  const statusLabel = ready
    ? '内部试用 · 可开始'
    : checking
      ? '内部试用 · 核验中'
      : guide.state === 'blocked'
        ? '内部试用 · 有阻塞'
        : '内部试用 · 状态不可用';
  const blockerCodes = Array.from(new Set([
    ...guide.serviceBlockers,
    ...guide.formalPilotBlockers,
  ]));

  return (
    <div
      data-testid="pilot-start-guide"
      data-launch-state={guide.state}
      className="memorial-body-scroll flex min-h-0 flex-col gap-3 overflow-y-auto pr-2 text-[#2E2410]"
    >
      <section
        aria-live="polite"
        className={`rounded-lg border px-4 py-3 ${
          ready
            ? 'border-[#2F7D4A]/35 bg-[#DDF2E4]/45'
            : 'border-[#B46F12]/35 bg-[#F5DDAE]/35'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            data-testid="pilot-internal-readiness"
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${
              ready
                ? 'border-[#2F7D4A]/35 bg-[#2F7D4A]/10 text-[#235F39]'
                : 'border-[#9A5E0A]/35 bg-[#9A5E0A]/10 text-[#7A4A08]'
            }`}
          >
            {statusLabel}
          </span>
          <span
            data-testid="pilot-formal-readiness"
            className="text-[10px] font-semibold tracking-[0.08em] text-[#6B5730]"
          >
            {guide.formalPilotLabel}
          </span>
        </div>
        <h3 className="mt-3 text-[15px] font-semibold text-[#3F2C12]">{guide.headline}</h3>
        <p className="mt-1 text-[11px] leading-5 text-[#5E451D]">{guide.description}</p>
        {blockerCodes.length > 0 && (
          <div className="mt-3 rounded-md border border-[#B46F12]/25 bg-[#FFF8E0]/50 px-3 py-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#7A4A08]">
              尚缺外部条件
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] leading-5 text-[#6B4E16]">
              {blockerCodes.map((blocker) => (
                <li key={blocker}>{readinessBlockerLabel(blocker)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="grid gap-2 md:grid-cols-3" aria-label="第一道真实旨意操作步骤">
        {[
          ['一', '填真实问题', '写清经营目标、期限、预算上限和不能自动执行的动作。'],
          ['二', '核对拟旨', '点击拟旨，确认丞相没有改掉关键约束；证据包编号可选。'],
          ['三', '下旨会审', '蜂群回奏后再选择准奏、补证或驳回；高风险动作另行签章。'],
        ].map(([step, title, detail]) => (
          <article
            key={step}
            className="rounded-lg border border-[#8A6A2A]/25 bg-[#FFF8E0]/35 px-3 py-2"
          >
            <div className="text-[10px] font-semibold tracking-[0.14em] text-[#7A4A08]">
              第{step}步 · {title}
            </div>
            <p className="mt-1 text-[10px] leading-5 text-[#5E451D]">{detail}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#8A6A2A]/25 bg-[#FFF8E0]/30 px-3 py-2">
        <p className="max-w-[520px] text-[10px] leading-5 text-[#6B5730]">
          不知道怎么写时，先填入储能设计伙伴示例，再替换为本次真实报价信息。
        </p>
        <ImperialButton
          variant="primary"
          size="sm"
          onClick={onUseTemplate}
          aria-label="填入储能设计伙伴首旨示例"
        >
          填入首旨示例
        </ImperialButton>
      </div>
    </div>
  );
}

export function ShangshufangPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [imperialAuthority, setImperialAuthority] =
    useState<ImperialAuthority>('checking');
  const [notice, setNotice] = useState<string | null>(null);
  const [decreeText, setDecreeText] = useState('');
  const [evidencePackId, setEvidencePackId] = useState('');
  const [decreeMode, setDecreeMode] = useState<DecreeMode>('order');
  const [askTarget, setAskTarget] = useState<AskTarget>('chancellor');
  const [showChancellorPanel, setShowChancellorPanel] = useState(false);
  const [showMentorPanel, setShowMentorPanel] = useState(false);
  const [selectedMemorial, setSelectedMemorial] = useState<EdictView | null>(null);
  const [selectedMentorGuidance, setSelectedMentorGuidance] = useState<EdictView | null>(null);
  const [phase, setPhase] = useState<PilotPhase>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEdict | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmEdictResponse | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [signoffRequiredAction, setSignoffRequiredAction] =
    useState<'approve' | 'archive' | null>(null);
  const [signoffChallenge, setSignoffChallenge] = useState<HumanSignoffChallenge | null>(null);
  const [signoffChallengeLoading, setSignoffChallengeLoading] = useState(false);
  const [signoffChallengeError, setSignoffChallengeError] = useState<string | null>(null);
  const [signoffCredentialText, setSignoffCredentialText] = useState('');
  const [signoffCredentialError, setSignoffCredentialError] = useState<string | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<DecisionOutcome | null>(null);
  const [archiveRecord, setArchiveRecord] = useState<PilotArchiveResponse | null>(null);
  const [deviationCard, setDeviationCard] = useState<PilotDeviationCard | null>(null);
  const [telemetry, setTelemetry] = useState<PilotTelemetryResponse | null>(null);
  const [pilotReadiness, setPilotReadiness] = useState<PilotReadinessResponse | null>(null);
  const [pilotReadinessError, setPilotReadinessError] = useState<string | null>(null);
  const [outcomePredictionType, setOutcomePredictionType] = useState<PilotPredictionType>('gross_margin');
  const [outcomeActualValue, setOutcomeActualValue] = useState('');
  const [outcomeObservedAt, setOutcomeObservedAt] = useState('');
  const [outcomeSourceRef, setOutcomeSourceRef] = useState('');
  const [outcomeSourceArtifact, setOutcomeSourceArtifact] = useState<File | null>(null);
  const [outcomeHumanValidated, setOutcomeHumanValidated] = useState(false);
  const [outcomeSubmitting, setOutcomeSubmitting] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    const normalizedSession = normalizeSession(
      getSession()?.accessToken,
    );
    setImperialAuthority(
      normalizedSession
        ? normalizedSession.canFinalDecide
          ? 'allowed'
          : 'denied'
        : 'unknown',
    );
    void shangshufangLoop.readiness()
      .then((readiness) => {
        setPilotReadiness(readiness);
        setPilotReadinessError(null);
      })
      .catch((cause) => {
        setPilotReadinessError(cause instanceof Error ? cause.message : '准入状态读取失败');
      });
    const restoredCaseId = new URLSearchParams(window.location.search).get('caseId')?.trim();
    if (restoredCaseId) {
      setTaskId(restoredCaseId);
      setPhase('polling');
      void (async () => {
        try {
          const status = await shangshufangLoop.taskStatus(restoredCaseId);
          setTaskStatus(status);
          setDraft(status.task.draft_edict ?? null);
          setDecreeText(status.task.raw_question);
          if (status.task.status === 'archived') {
            const [sealedArchive, card, restoredTelemetry] = await Promise.all([
              shangshufangLoop.archive(restoredCaseId),
              shangshufangLoop.deviationCard(restoredCaseId),
              shangshufangLoop.telemetry(restoredCaseId).catch(() => null),
            ]);
            setArchiveRecord(sealedArchive);
            setDeviationCard(card);
            setTelemetry(restoredTelemetry);
            setDecisionOutcome({
              tone: 'success',
              text: '已从史馆恢复 · 预测快照保持签封',
            });
            setPhase('decided');
          } else {
            setPhase(status.review?.memorial ? 'ready' : 'decided');
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : '案件恢复失败');
          setPhase('error');
        }
      })();
    }
    return () => pollControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const firstAvailable = archiveRecord?.prediction_snapshot.predictions.find(
      (prediction) => prediction.status === 'available' && isPilotPredictionType(prediction.prediction_type),
    );
    if (firstAvailable && isPilotPredictionType(firstAvailable.prediction_type)) {
      setOutcomePredictionType(firstAvailable.prediction_type);
    }
  }, [archiveRecord]);

  const flashNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 2600);
  }, []);

  const memorial = taskStatus?.review?.memorial ?? confirmResult?.memorial ?? null;
  const routeReason = taskStatus?.review?.routing_plan?.route_reason ?? confirmResult?.routing_plan?.route_reason;
  const currentTask = taskStatus?.task ?? null;
  const pilotLaunchGuide = useMemo(
    () => resolvePilotLaunchGuide(pilotReadiness, pilotReadinessError),
    [pilotReadiness, pilotReadinessError],
  );
  const readinessBlockers = pilotLaunchGuide.serviceBlockers;
  const readinessSummary = pilotLaunchGuide.state === 'ready'
    ? '内部试用 · 可开始'
    : pilotLaunchGuide.state === 'checking'
      ? '内部试用 · 核验中'
      : pilotLaunchGuide.state === 'blocked'
        ? `内部试用 · 阻塞 ${readinessBlockers.length} 项`
        : '内部试用 · 状态不可用';
  const readinessClear = pilotLaunchGuide.state === 'ready';
  const isBusy = ['drafting', 'dispatching', 'polling', 'deciding'].includes(phase);
  // 中栏「回奏中」执行态：蜂群接旨、正在调度轮询（供设计元素 overlay 使用）
  const swarmWorking = phase === 'dispatching' || phase === 'polling';
  const canImperialAct =
    imperialAuthority === 'allowed'
    || (
      imperialAuthority === 'unknown'
      && process.env.NODE_ENV !== 'production'
    );

  const edictView = useMemo(() => {
    if (selectedMemorial) return selectedMemorial;
    if (selectedMentorGuidance) return selectedMentorGuidance;
    if (memorial && currentTask && archiveRecord) {
      return archivedMemorialView(
        currentTask,
        memorial,
        archiveRecord,
        deviationCard,
        telemetry,
        routeReason,
      );
    }
    if (memorial && currentTask) return memorialView(currentTask, memorial, routeReason, telemetry);
    if (draft && taskId) return draftView(taskId, draft);
    return idleView();
  }, [archiveRecord, currentTask, deviationCard, draft, memorial, routeReason, taskId, telemetry, selectedMemorial, selectedMentorGuidance]);

  const chancellorSuggestions = useMemo<ChancellorSuggestion[]>(() => {
    if (memorial && currentTask) {
      return [{
        id: currentTask.task_id,
        title: memorial.title,
        tag: memorial.quality_gate.status,
        priority: memorial.quality_gate.status.toLowerCase().includes('block') ? 'urgent' : 'high',
        whyNow: memorial.verdict,
        sourceLabel: memorial.source_label,
        evidence: memorial.evidence_chain?.map((item) => item.title) ?? [],
        recommendedMinisters: memorial.ministry_outputs.map((item) => item.department),
      }];
    }
    if (draft && taskId) {
      return [{
        id: taskId,
        title: '待下旨 · 圣旨草案',
        tag: '待皇帝确认',
        priority: draft.risk_flags.length ? 'high' : 'medium',
        whyNow: draft.refined_edict,
        sourceLabel: draft.source_label,
        evidence: draft.known_facts,
        recommendedMinisters: draft.recommended_departments,
      }];
    }
    return [];
  }, [currentTask, draft, memorial, taskId]);

  const qintianItems = useMemo<WangTutorial[]>(() => {
    if (!memorial) return [];
    return (memorial.horizontal_reviews ?? [])
      .map((review) => ({
        id: `${review.institution}-${review.rule_id}`,
        title: `${review.institution} · ${review.triggered ? '已触发' : '未触发'} · ${review.status}`,
        subtitle: joinLines([...review.reasons, ...review.findings], '未返回说明。'),
      }));
  }, [memorial]);

  const availablePredictions = useMemo(
    () => archiveRecord?.prediction_snapshot.predictions.filter(
      (prediction) => prediction.status === 'available' && isPilotPredictionType(prediction.prediction_type),
    ) ?? [],
    [archiveRecord],
  );

  async function draftStudy() {
    const clean = decreeText.trim();
    if (!clean) {
      setError('请先写明要办的事。');
      return;
    }
    setPhase('drafting');
    setError(null);
    setTaskId(null);
    setDraft(null);
    setConfirmResult(null);
    setTaskStatus(null);
    setDecisionOutcome(null);
    setSignoffRequiredAction(null);
    setSignoffChallenge(null);
    setSignoffChallengeLoading(false);
    setSignoffChallengeError(null);
    setSignoffCredentialText('');
    setSignoffCredentialError(null);
    setArchiveRecord(null);
    setDeviationCard(null);
    setTelemetry(null);
    setOutcomeError(null);
    try {
      const response = await shangshufangLoop.submitIntent({
        request_text: clean,
        idempotency_key: `court-intake:${window.crypto.randomUUID()}`,
        evidence_pack_id: evidencePackId.trim() || undefined,
      });
      setTaskId(response.run_id);
      router.push(`/task/${encodeURIComponent(response.run_id)}/report`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LangGraph 受旨失败');
      setPhase('error');
    }
  }

  async function confirmDispatch() {
    if (!taskId) return;
    pollControllerRef.current?.abort();
    const controller = new AbortController();
    pollControllerRef.current = controller;
    setPhase('dispatching');
    setError(null);
    try {
      const requestBytes = new TextEncoder().encode(
        JSON.stringify({ task_id: taskId, edited_edict: draft ?? null }),
      );
      const requestDigest = Array.from(
        new Uint8Array(await window.crypto.subtle.digest('SHA-256', requestBytes)),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('');
      const idempotencyKey = `confirm:${taskId}:${requestDigest}`;
      const response = await shangshufangLoop.confirmEdict({
        task_id: taskId,
        confirmed: true,
        edited_edict: draft ?? undefined,
        idempotency_key: idempotencyKey,
      });
      setConfirmResult(response);
      setPhase('polling');
      const status = await pollUntilTerminal({
        load: () => shangshufangLoop.taskStatus(taskId),
        isTerminal: isReviewReady,
        onUpdate: setTaskStatus,
        signal: controller.signal,
        maxAttempts: 120,
        initialDelayMs: 500,
        maxDelayMs: 2_500,
      });
      setTaskStatus(status);
      setTelemetry(await shangshufangLoop.telemetry(taskId).catch(() => null));
      setPhase('ready');
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : '军机处会审失败');
      setPhase('error');
    }
  }

  async function finalizeArchive(credential?: HumanSignoffCredential) {
    if (!taskId) return;
    const archiveResult = await shangshufangLoop.decide(
      taskId,
      buildDecisionRequest(
        'archive',
        '皇帝准奏后进入史馆并冻结当时预测快照',
        credential,
      ),
    );
    if (archiveResult.status !== 'archived') {
      throw new Error(`归档接口返回状态 ${archiveResult.status}，尚未确认入史馆`);
    }
    const sealedArchive = await shangshufangLoop.archive(taskId);
    setArchiveRecord(sealedArchive);
    const card = await shangshufangLoop.deviationCard(taskId).catch(() => null);
    setDeviationCard(card);
    writeCaseIdToUrl(taskId);
    const status = await shangshufangLoop.taskStatus(taskId).catch(() => null);
    if (status) setTaskStatus(status);
    setSignoffRequiredAction(null);
    setSignoffChallenge(null);
    setSignoffChallengeLoading(false);
    setSignoffChallengeError(null);
    setSignoffCredentialText('');
    setSignoffCredentialError(null);
    setDecisionOutcome({
      tone: 'success',
      text: '已准奏并入史馆 · 预测快照已签封',
    });
    setPhase('decided');
    flashNotice('已准奏并入史馆 · 预测快照已签封');
  }

  async function requireSignoff(action: 'approve' | 'archive', message: string) {
    setSignoffRequiredAction(action);
    setSignoffChallenge(null);
    setSignoffChallengeLoading(true);
    setSignoffChallengeError(null);
    setSignoffCredentialText('');
    setSignoffCredentialError(null);
    setError(null);
    setDecisionOutcome({
      tone: 'warning',
      text: `${action === 'approve' ? '准奏' : '归档'}待人工签字 · ${message}`,
    });
    setPhase('ready');
    if (!taskId) {
      setSignoffChallengeLoading(false);
      setSignoffChallengeError('当前案件编号缺失，不能读取签字挑战。');
      return;
    }
    try {
      const response = await shangshufangLoop.signoffChallenge(taskId, action);
      if (response.challenge.task_id !== taskId || response.challenge.action !== action) {
        throw new Error('后端签字挑战与当前案件或动作不匹配。');
      }
      setSignoffChallenge(response.challenge);
    } catch (cause) {
      setSignoffChallengeError(cause instanceof Error ? cause.message : '签字挑战读取失败。');
    } finally {
      setSignoffChallengeLoading(false);
    }
  }

  async function submitDecision(
    action: Exclude<DecisionAction, 'archive'>,
    credential?: HumanSignoffCredential,
  ) {
    if (!taskId) return;
    if (!canImperialAct) {
      setError('当前账号仅可阅览回奏，无皇帝终审权限。');
      return;
    }
    setPhase('deciding');
    setError(null);
    setDecisionOutcome(null);
    try {
      await shangshufangLoop.decide(
        taskId,
        buildDecisionRequest(action, decisionReason, credential),
      );

      if (action === 'approve') {
        try {
          await finalizeArchive();
          return;
        } catch (archiveCause) {
          const archiveError = archiveCause instanceof Error ? archiveCause.message : '归档失败';
          const status = await shangshufangLoop.taskStatus(taskId).catch(() => null);
          if (status) setTaskStatus(status);
          if (isShangshufangSignoffRequiredError(archiveCause)) {
            await requireSignoff('archive', archiveError);
            return;
          }
          setDecisionOutcome({
            tone: 'warning',
            text: `已准奏但未归档 · ${archiveError}`,
          });
          setPhase('decided');
          flashNotice(`已准奏但未归档 · ${archiveError}`);
          return;
        }
      }

      const status = await shangshufangLoop.taskStatus(taskId);
      setTaskStatus(status);
      setPhase('decided');
      flashNotice(`${ACTION_LABEL[action]}已提交 · 当前状态 ${status.task.status}`);
    } catch (cause) {
      if (action === 'approve' && isShangshufangSignoffRequiredError(cause)) {
        await requireSignoff('approve', cause.message);
        return;
      }
      const message = cause instanceof Error ? cause.message : `${ACTION_LABEL[action]}失败`;
      if (credential) {
        setSignoffCredentialError(message);
        setError(null);
      } else {
        setError(message);
      }
      setPhase('ready');
    }
  }

  async function submitSignoffCredential() {
    if (!taskId || !signoffRequiredAction || !signoffChallenge) return;
    setSignoffCredentialError(null);
    let credential: HumanSignoffCredential;
    try {
      credential = parseHumanSignoffCredentialJson(
        signoffCredentialText,
        signoffChallenge,
      );
    } catch (cause) {
      setSignoffCredentialError(cause instanceof Error ? cause.message : '签字凭据结构无效。');
      return;
    }

    // 凭据只在本次调用栈中短暂存在；一旦开始提交就先从组件状态清除。
    setSignoffCredentialText('');
    if (signoffRequiredAction === 'approve') {
      await submitDecision('approve', credential);
      return;
    }

    setPhase('deciding');
    try {
      await finalizeArchive(credential);
    } catch (cause) {
      if (isShangshufangSignoffRequiredError(cause)) {
        await requireSignoff('archive', cause.message);
        return;
      }
      setSignoffCredentialError(cause instanceof Error ? cause.message : '签字归档失败。');
      setPhase('ready');
    }
  }

  async function importSignoffCredential(file: File | null) {
    if (!file) return;
    if (file.size > MAX_SIGNOFF_CREDENTIAL_BYTES) {
      setSignoffCredentialError('签字凭据文件不能超过 64 KiB。');
      return;
    }
    setSignoffCredentialError(null);
    setSignoffCredentialText(await file.text());
  }

  function closeSignoffPanel() {
    setSignoffRequiredAction(null);
    setSignoffChallenge(null);
    setSignoffChallengeLoading(false);
    setSignoffChallengeError(null);
    setSignoffCredentialText('');
    setSignoffCredentialError(null);
  }

  function downloadSignoffChallenge() {
    if (!signoffChallenge) return;
    const blob = new Blob([JSON.stringify(signoffChallenge, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `signoff-challenge-${signoffChallenge.task_id}-${signoffChallenge.action}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function decisionEnabled(action: Exclude<DecisionAction, 'archive'>): boolean {
    if (!memorial?.decision_options?.length) return true;
    return memorial.decision_options.some((option) => option.action === action && option.enabled);
  }

  async function submitOutcome() {
    if (!taskId || !archiveRecord) return;
    if (!canImperialAct) {
      setOutcomeError('当前账号仅可阅览归档，无权回填实际结果。');
      return;
    }
    const prediction = archiveRecord.prediction_snapshot.predictions.find(
      (item) => item.prediction_type === outcomePredictionType && item.status === 'available',
    );
    const actualValue = Number(outcomeActualValue);
    const observedAt = new Date(outcomeObservedAt);
    if (!prediction?.unit) {
      setOutcomeError('所选指标没有可比较的签封预测。');
      return;
    }
    if (!Number.isFinite(actualValue)) {
      setOutcomeError('请填写有效的实际值。');
      return;
    }
    if (!outcomeObservedAt || Number.isNaN(observedAt.getTime())) {
      setOutcomeError('请填写有效的观测时间。');
      return;
    }
    if (!outcomeSourceRef.trim()) {
      setOutcomeError('请填写可追溯的结果来源。');
      return;
    }
    if (!outcomeSourceArtifact) {
      setOutcomeError('请附上经过人工核验的实际结果来源文件。');
      return;
    }
    if (outcomeSourceArtifact.size > MAX_OUTCOME_ARTIFACT_BYTES) {
      setOutcomeError('实际结果来源文件不能超过 2 MiB。');
      return;
    }
    if (!outcomeHumanValidated) {
      setOutcomeError('实际结果必须经过人工核验。');
      return;
    }

    setOutcomeSubmitting(true);
    setOutcomeError(null);
    try {
      const sourceArtifactBase64 = await outcomeArtifactBase64(outcomeSourceArtifact);
      const nonce = window.crypto.randomUUID();
      const outcomeId = `outcome-${outcomePredictionType}-${nonce}`;
      await shangshufangLoop.recordOutcome(taskId, {
        outcome_id: outcomeId,
        prediction_type: outcomePredictionType,
        actual_value: actualValue,
        unit: prediction.unit,
        observed_at: observedAt.toISOString(),
        source_ref: outcomeSourceRef.trim(),
        source_artifact_base64: sourceArtifactBase64,
        human_validated: true,
        idempotency_key: outcomeId,
      });
      const card = await shangshufangLoop.deviationCard(taskId);
      setDeviationCard(card);
      setOutcomeActualValue('');
      setOutcomeObservedAt('');
      setOutcomeSourceRef('');
      setOutcomeSourceArtifact(null);
      setOutcomeHumanValidated(false);
      flashNotice('实际结果已追加 · 偏差卡已更新');
    } catch (cause) {
      setOutcomeError(cause instanceof Error ? cause.message : '实际结果回填失败');
    } finally {
      setOutcomeSubmitting(false);
    }
  }

  const decreeState: DecreeState = isBusy ? 'consulting' : error ? 'error' : phase === 'idle' ? 'idle' : 'submitted';
  const activeSourceLabel = currentTask?.source_label ?? draft?.source_label;
  const statusText = decisionOutcome
    ? decisionOutcome.text
    : error
    ? `失败 · ${error}`
    : phase === 'drafting'
      ? '正在拟旨'
      : phase === 'drafted'
        ? '草案待下旨'
        : phase === 'dispatching'
          ? '军机处接旨并会审'
          : phase === 'polling'
            ? '蜂群执行中 · 正在轮询回奏'
            : phase === 'ready'
              ? '回奏已成 · 待皇帝裁决'
              : phase === 'deciding'
                ? '正在提交裁决'
                : phase === 'decided'
                  ? `裁决已提交 · ${currentTask?.status ?? '状态待回读'}`
                  : '待拟旨';

  return (
    <div
      data-testid="shangshufang-pilot"
      data-pilot-ready={mounted ? 'true' : 'false'}
      className="relative isolate flex h-full min-h-0 flex-col overflow-hidden text-[#EAEEFB]"
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${assetUrl(SHANGSHUFANG_ASSETS.bgScene)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, rgba(240,198,106,0.05) 0%, transparent 42%), linear-gradient(90deg, rgba(2,3,10,0.56) 0%, rgba(2,3,10,0.22) 23%, rgba(2,3,10,0.18) 77%, rgba(2,3,10,0.58) 100%), radial-gradient(ellipse at 50% 48%, transparent 56%, rgba(2,3,10,0.46) 100%)',
          }}
        />
      </div>

      <div className="relative z-20 mx-auto mt-2 flex max-w-[96vw] flex-wrap items-center justify-center gap-2">
        <details
          data-testid="pilot-readiness-panel"
          className="group relative"
        >
          <summary
            data-testid="pilot-readiness-status"
            className={`cursor-pointer list-none rounded-full border px-3 py-1 text-[10px] tracking-[0.08em] ${
              readinessClear
                ? 'border-[#65C18C]/35 bg-[#65C18C]/10 text-[#9BE6B6]'
                : 'border-[#F5A524]/35 bg-[#F5A524]/10 text-[#F5C56B]'
            }`}
          >
            {readinessSummary}
          </summary>
          <div className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-[min(88vw,430px)] -translate-x-1/2 rounded-lg border border-[#8A6A2A]/40 bg-[#070B18]/95 p-3 text-[10px] leading-5 text-[#D8CFB4] shadow-2xl backdrop-blur">
            <p className="font-semibold tracking-[0.12em] text-[#F0C66A]">实时运行准入</p>
            <p className="mt-1 text-[#D8CFB4]">
              {pilotLaunchGuide.headline}
            </p>
            {pilotReadinessError ? (
              <p className="mt-1 text-[#F5C56B]">{pilotReadinessError}</p>
            ) : readinessBlockers.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {readinessBlockers.map((blocker) => (
                  <li key={blocker}>{readinessBlockerLabel(blocker)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[#9BE6B6]">内部试用所需运行时守门已通过。</p>
            )}
            <p className="mt-2 text-[#D8CFB4]">{pilotLaunchGuide.formalPilotLabel}</p>
            {pilotLaunchGuide.formalPilotBlockers.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#F5C56B]">
                {pilotLaunchGuide.formalPilotBlockers.map((blocker) => (
                  <li key={blocker}>{readinessBlockerLabel(blocker)}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[#8FA3B8]">
              此状态来自后端实时准入检查；不会因页面可打开而误判为可正式试点。
            </p>
          </div>
        </details>
        <span
          data-testid="pilot-loop-status"
          className="rounded-full border border-[#F0C66A]/40 bg-[#0C1022]/90 px-3 py-1 text-[10px] tracking-[0.12em] text-[#F0C66A]"
        >
          {statusText}{taskId ? ` · ${taskId}` : ''}
        </span>
        {decisionOutcome && (
          <span
            data-testid="pilot-decision-outcome"
            role="status"
            className={`rounded-full border px-3 py-1 text-[10px] ${
              decisionOutcome.tone === 'success'
                ? 'border-[#65C18C]/35 bg-[#65C18C]/10 text-[#9BE6B6]'
                : 'border-[#F5A524]/35 bg-[#F5A524]/10 text-[#F5C56B]'
            }`}
          >
            {decisionOutcome.text}
          </span>
        )}
        <label className="inline-flex items-center gap-2 rounded-full border border-[#7EC8E3]/30 bg-[#0C1022]/90 px-3 py-1 text-[10px] text-[#A7DDF0]">
          <span>试点证据包编号</span>
          <input
            aria-label="试点证据包编号"
            value={evidencePackId}
            onChange={(event) => setEvidencePackId(event.target.value)}
            disabled={phase !== 'idle' && phase !== 'error'}
            placeholder="可选，如 case-001-evidence-v1"
            className="w-[210px] bg-transparent text-[#EAF7FB] outline-none placeholder:text-[#557080] disabled:opacity-60"
          />
        </label>
        <span
          data-testid="pilot-provenance-mode"
          className={`rounded-full border px-3 py-1 text-[10px] ${
            activeSourceLabel?.includes('LIVE')
              ? 'border-[#65C18C]/35 bg-[#65C18C]/10 text-[#9BE6B6]'
              : 'border-[#F5A524]/30 bg-[#F5A524]/10 text-[#F5C56B]'
          }`}
        >
          {activeSourceLabel?.includes('LIVE')
            ? 'LIVE · 责任人签名材料 · 禁止未授权外部动作'
            : 'TEST_ONLY · 内部受控试行 · 禁止外部动作'}
        </span>
        {imperialAuthority === 'denied' && (
          <span
            data-testid="pilot-imperial-readonly"
            className="rounded-full border border-[#7EC8E3]/30 bg-[#07141C]/90 px-3 py-1 text-[10px] text-[#A7DDF0]"
          >
            阅览身份 · 仅皇帝或获授权最终裁决人可裁决与回填结果
          </span>
        )}
        {routeReason && (
          <span
            data-testid="pilot-route-reason"
            className="max-w-[680px] rounded-full border border-[#A7DDF0]/25 bg-[#07141C]/90 px-3 py-1 text-[10px] text-[#C8EAF5]"
          >
            路由：{routeReason}
          </span>
        )}
      </div>

      <main className="relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 py-3 pb-[132px]">
        <div className={`mx-auto grid w-full max-w-[1440px] flex-1 gap-3 lg:h-full lg:min-h-0 ${
          showChancellorPanel && showMentorPanel
            ? 'lg:grid-cols-[300px_minmax(0,1fr)_300px] grid-cols-1'
            : showChancellorPanel || showMentorPanel
              ? 'lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] grid-cols-1'
              : 'grid-cols-1'
        }`}>
          {showChancellorPanel && (
          <div className="order-2 min-h-0 lg:order-1 lg:h-full">
            <ChancellorColumn
              suggestions={chancellorSuggestions}
              onSelect={(item) => {
                setSelectedMentorGuidance(null);
                if (item.memorial) {
                  const view: EdictView = {
                    id: item.memorial.id,
                    title: item.memorial.title,
                    subtitle: item.memorial.subtitle,
                    documentKind: '奏折',
                    question: item.memorial.reason,
                    seal: 'imperial',
                    meta: {
                      petitioner: item.memorial.petitioner,
                      reporter: item.memorial.reporter,
                      badges: [{ label: item.memorial.sourceLabel ?? '来源待核', tone: 'amber' }],
                    },
                    rows: [
                      { label: '所议', body: item.memorial.reason || item.memorial.subtitle || item.memorial.title },
                      { label: '主判', body: item.memorial.suggestion },
                      { label: '红线', body: item.memorial.risk || '暂无明确红线。' },
                      { label: '后令', body: item.memorial.verdict },
                    ],
                    sealDate: item.memorial.sealDate,
                  };
                  setSelectedMemorial(view);
                } else {
                  const view: EdictView = {
                    id: item.id,
                    title: item.title,
                    subtitle: item.tag,
                    documentKind: '奏折',
                    question: item.whyNow,
                    seal: 'imperial',
                    meta: {
                      badges: [{ label: item.sourceLabel ?? '丞相建议', tone: 'amber' }],
                    },
                    rows: [
                      { label: '所议', body: item.title },
                      { label: '主判', body: item.whyNow || '待丞相详陈。' },
                      ...(item.evidence?.length ? [{ label: '证据', body: item.evidence.join('\n') }] : []),
                      ...(item.recommendedMinisters?.length ? [{ label: '参审', body: item.recommendedMinisters.join('、') }] : []),
                    ],
                  };
                  setSelectedMemorial(view);
                }
              }}
              onQuickAsk={() => flashNotice('御前试行版仅开放真实拟旨与裁决主链。')}
              showQuickAsk={false}
              emptyHint="尚无本案判断。拟旨后，丞相的真实建议会回到这里。"
            />
          </div>
          )}

          <div className="order-1 flex min-h-[min(70vh,640px)] flex-col lg:order-2 lg:h-full lg:min-h-0">
            {swarmWorking && (
              <div
                data-testid="swarm-working-overlay"
                role="status"
                className="z-30 mb-2 flex flex-col items-center gap-2 rounded-xl border border-[#F0C66A]/25 bg-[#070B18]/85 px-4 py-3 backdrop-blur-md"
              >
                <div className="relative flex h-12 w-12 items-center justify-center">
                  {/* 外层金色圆环 */}
                  <span aria-hidden className="absolute inset-0 rounded-full border-2 border-[#F0C66A]/45" style={{ boxShadow: '0 0 20px rgba(240,198,106,0.28), inset 0 0 12px rgba(240,198,106,0.18)' }} />
                  {/* 旋转外圈 */}
                  <span aria-hidden className="absolute inset-[4px] animate-spin rounded-full border border-[#F0C66A]/35 border-t-transparent" style={{ animationDuration: '1.6s' }} />
                  <span aria-hidden className="absolute inset-[4px] animate-spin rounded-full border border-[#F0C66A]/20 border-b-transparent" style={{ animationDirection: 'reverse', animationDuration: '2.2s' }} />
                  {/* 中心「旨」字 */}
                  <span className="text-[24px] font-bold text-[#F0C66A]" style={{ fontFamily: 'var(--font-serif)', textShadow: '0 0 14px rgba(240,198,106,0.5)' }}>旨</span>
                </div>
                <span className="rounded-full border border-[#F0C66A]/30 bg-[#F0C66A]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#F0C66A]">蜂群调度</span>
                <p className="text-center text-[20px] font-bold tracking-[0.1em] text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)', textShadow: '0 0 18px rgba(240,198,106,0.22)' }}>
                  后端蜂群已接旨，正在调度…
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] tracking-[0.06em]">
                  <span className="rounded-full border border-[#F0C66A]/25 bg-[#0C1022]/80 px-2.5 py-1 text-[#F0C66A]">案号：task_{taskId ?? 'pending'}</span>
                  <span className="rounded-full border border-[#F0C66A]/18 bg-[#0C1022]/60 px-2.5 py-1 text-[#B6AB8C]">Trace: loop_{taskId ?? 'pending'}</span>
                </div>
              </div>
            )}
            <EdictStage
              view={edictView}
              footer={
                <div className="flex w-full flex-col gap-2">
                  {canImperialAct && archiveRecord && availablePredictions.length > 0 && (
                    <div
                      data-testid="pilot-outcome-form"
                      className="grid w-full gap-2 rounded-lg border border-[#8A6A2A]/35 bg-[#FFF8E0]/35 p-2 text-[#3F2C12] md:grid-cols-2 xl:grid-cols-6"
                    >
                      <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-[#7A4A08]">
                        <span>实际结果指标</span>
                        <select
                          aria-label="实际结果指标"
                          value={outcomePredictionType}
                          onChange={(event) => setOutcomePredictionType(event.target.value as PilotPredictionType)}
                          disabled={outcomeSubmitting}
                          className="h-8 rounded-md border border-[#8A6A2A]/35 bg-[#FFF8E0]/80 px-2 text-[11px] outline-none"
                        >
                          {availablePredictions.map((prediction) => (
                            <option key={prediction.prediction_type} value={prediction.prediction_type}>
                              {PREDICTION_LABEL[prediction.prediction_type as PilotPredictionType]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-[#7A4A08]">
                        <span>实际值</span>
                        <input
                          aria-label="实际值"
                          type="number"
                          step="any"
                          value={outcomeActualValue}
                          onChange={(event) => setOutcomeActualValue(event.target.value)}
                          disabled={outcomeSubmitting}
                          className="h-8 rounded-md border border-[#8A6A2A]/35 bg-[#FFF8E0]/80 px-2 text-[11px] outline-none"
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-[#7A4A08]">
                        <span>观测时间</span>
                        <input
                          aria-label="观测时间"
                          type="datetime-local"
                          value={outcomeObservedAt}
                          onChange={(event) => setOutcomeObservedAt(event.target.value)}
                          disabled={outcomeSubmitting}
                          className="h-8 rounded-md border border-[#8A6A2A]/35 bg-[#FFF8E0]/80 px-2 text-[11px] outline-none"
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-[#7A4A08] xl:col-span-2">
                        <span>结果来源</span>
                        <input
                          aria-label="结果来源"
                          value={outcomeSourceRef}
                          onChange={(event) => setOutcomeSourceRef(event.target.value)}
                          disabled={outcomeSubmitting}
                          placeholder="如 reveal-pack://case-001"
                          className="h-8 rounded-md border border-[#8A6A2A]/35 bg-[#FFF8E0]/80 px-2 text-[11px] outline-none placeholder:text-[#8A7450]"
                        />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-[#7A4A08] xl:col-span-2">
                        <span>结果来源文件（最大 2 MiB）</span>
                        <input
                          aria-label="实际结果来源文件"
                          type="file"
                          onChange={(event) => {
                            setOutcomeSourceArtifact(event.target.files?.[0] ?? null);
                          }}
                          disabled={outcomeSubmitting}
                          className="h-8 rounded-md border border-[#8A6A2A]/35 bg-[#FFF8E0]/80 px-2 py-1 text-[10px] outline-none file:mr-2 file:border-0 file:bg-transparent file:text-[#7A4A08]"
                        />
                      </label>
                      <div className="flex min-w-0 flex-col justify-end gap-1">
                        <label className="flex min-h-8 items-center gap-2 text-[10px] text-[#5E451D]">
                          <input
                            aria-label="我已人工核验实际结果"
                            type="checkbox"
                            checked={outcomeHumanValidated}
                            onChange={(event) => setOutcomeHumanValidated(event.target.checked)}
                            disabled={outcomeSubmitting}
                            className="accent-[#8A6A2A]"
                          />
                          <span>我已人工核验实际结果</span>
                        </label>
                        <ImperialButton
                          variant="primary"
                          size="sm"
                          disabled={outcomeSubmitting}
                          onClick={() => void submitOutcome()}
                        >
                          {outcomeSubmitting ? '正在回填' : '回填实际结果'}
                        </ImperialButton>
                      </div>
                      {outcomeError && (
                        <p
                          role="alert"
                          className="text-[10px] text-[#962820] md:col-span-2 xl:col-span-6"
                        >
                          {outcomeError}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                  {phase === 'drafted' && (
                    <ImperialButton
                      variant="primary"
                      size="sm"
                      onClick={confirmDispatch}
                      aria-label="下旨"
                    >
                      下旨
                    </ImperialButton>
                  )}
                  {(phase === 'ready' || phase === 'decided')
                    && memorial
                    && canImperialAct
                    && !signoffRequiredAction && (
                    <>
                      <input
                        aria-label="裁决理由"
                        value={decisionReason}
                        onChange={(event) => setDecisionReason(event.target.value)}
                        disabled={phase === 'decided'}
                        placeholder="裁决理由（建议填写）"
                        className="min-w-[220px] flex-1 rounded-full border border-[#8A6A2A]/35 bg-[#FFF8E0]/45 px-3 py-1.5 text-[11px] text-[#2E2410] outline-none placeholder:text-[#6B5730]"
                      />
                      {/* 四键圣裁：准奏 / 驳回 / 会审 / 批示（对齐效果图顺序） */}
                      <ImperialButton
                        variant="gold"
                        size="sm"
                        serif
                        disabled={phase === 'decided' || !decisionEnabled('approve')}
                        onClick={() => submitDecision('approve')}
                      >
                        准奏
                      </ImperialButton>
                      <ImperialButton
                        variant="gold"
                        size="sm"
                        serif
                        disabled={phase === 'decided' || !decisionEnabled('reject')}
                        onClick={() => submitDecision('reject')}
                      >
                        驳回
                      </ImperialButton>
                      <ImperialButton
                        variant="gold"
                        size="sm"
                        serif
                        disabled={phase === 'decided' || !decisionEnabled('request_evidence')}
                        onClick={() => submitDecision('request_evidence')}
                      >
                        会审
                      </ImperialButton>
                      <ImperialButton
                        variant="gold"
                        size="sm"
                        serif
                        disabled={phase === 'decided'}
                        onClick={() => flashNotice('御批：请在裁决理由中补充指示，或交由丞相继续追问后再呈回奏。')}
                      >
                        批示
                      </ImperialButton>
                    </>
                  )}
                  </div>
                </div>
              }
            >
              <PilotScrollBody view={edictView} />
            </EdictStage>
          </div>

          {showMentorPanel && (
          <div className={`order-3 min-h-0 lg:h-full ${showChancellorPanel ? '' : 'lg:order-1'}`}>
            <WangColumn
              tutorials={qintianItems}
              onSelect={(item) => {
                setSelectedMemorial(null);
                const view: EdictView = {
                  id: item.id,
                  title: item.title,
                  subtitle: item.subtitle,
                  documentKind: '钦天监',
                  seal: 'tutorial',
                  rows: [
                    { label: '事由', body: item.subtitle || item.title },
                    { label: '谨奏', body: item.subtitle || '钦天监指导。' },
                  ],
                };
                setSelectedMentorGuidance(view);
              }}
              onQuickAsk={() => flashNotice('钦天监仅在后端规则触发时参审，前端不能强造结论。')}
              showQuickAsk={false}
            />
          </div>
          )}
        </div>
      </main>

      {canImperialAct && signoffRequiredAction && taskId && (
        <section
          data-testid="pilot-signoff-credential-form"
          aria-label="高风险人工签字门"
          className="fixed bottom-[118px] left-1/2 z-[95] max-h-[min(58vh,520px)] w-[min(92vw,760px)] -translate-x-1/2 overflow-y-auto rounded-xl border border-[#B7791F]/55 bg-[#F7E8BD]/95 p-4 text-[#3F2C12] shadow-[0_24px_80px_rgba(0,0,0,0.68)] backdrop-blur-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7A4A08]">
                高风险{signoffRequiredAction === 'approve' ? '准奏' : '归档'} · 人工签字门
              </p>
              <p className="mt-1 text-[10px] leading-5 text-[#6B5730]">
                请从受信签字端导出当前案件与动作的一次性 JSON
                凭据。浏览器只检查字段结构；签名、权限、有效期和防重放由后端核验。
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="rounded-full border border-[#B7791F]/35 px-2 py-1 font-mono text-[9px] text-[#7A4A08]">
                {signoffRequiredAction} · {taskId}
              </span>
              <button
                type="button"
                onClick={downloadSignoffChallenge}
                disabled={!signoffChallenge}
                className="rounded border border-[#8A6A2A]/30 px-2 py-1 text-[9px] text-[#6B4E16] disabled:opacity-40"
              >
                下载 challenge
              </button>
              <button
                type="button"
                disabled={signoffChallengeLoading}
                onClick={() => void requireSignoff(signoffRequiredAction, '签字挑战已刷新，请使用最新摘要签发凭据。')}
                className="rounded border border-[#8A6A2A]/30 px-2 py-1 text-[9px] text-[#6B4E16] disabled:opacity-40"
              >
                刷新
              </button>
              <button
                type="button"
                onClick={closeSignoffPanel}
                className="rounded border border-[#8A6A2A]/30 px-2 py-1 text-[9px] text-[#6B4E16]"
              >
                关闭
              </button>
            </div>
          </div>
          {signoffChallengeLoading ? (
            <p role="status" className="mt-2 text-[10px] text-[#7A4A08]">
              正在读取后端只读签字挑战…
            </p>
          ) : signoffChallengeError ? (
            <p role="alert" className="mt-2 text-[10px] text-[#962820]">
              challenge 读取失败 · {signoffChallengeError}
            </p>
          ) : signoffChallenge ? (
            <dl className="mt-2 grid gap-1 rounded-md border border-[#8A6A2A]/25 bg-[#FFF8E0]/55 p-2 text-[9px] sm:grid-cols-[70px_minmax(0,1fr)]">
              <dt className="font-semibold text-[#7A4A08]">案件</dt>
              <dd className="font-mono text-[#3F2C12]">{signoffChallenge.task_id}</dd>
              <dt className="font-semibold text-[#7A4A08]">动作</dt>
              <dd className="font-mono text-[#3F2C12]">{signoffChallenge.action}</dd>
              <dt className="font-semibold text-[#7A4A08]">上下文摘要</dt>
              <dd className="break-all font-mono text-[#3F2C12]">{signoffChallenge.context_digest}</dd>
            </dl>
          ) : null}
          <textarea
            aria-label="人工签字凭据 JSON"
            value={signoffCredentialText}
            onChange={(event) => {
              setSignoffCredentialText(event.target.value);
              setSignoffCredentialError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            disabled={!signoffChallenge || signoffChallengeLoading}
            placeholder='粘贴 {"claims": {...}, "signature": "..."}'
            className="mt-3 min-h-28 w-full resize-y rounded-md border border-[#8A6A2A]/35 bg-[#FFFDF2]/90 p-2 font-mono text-[10px] leading-5 text-[#2E2410] outline-none placeholder:text-[#8A7450] disabled:cursor-not-allowed disabled:opacity-55"
          />
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <label className="cursor-pointer rounded border border-[#8A6A2A]/35 bg-[#FFF8E0]/60 px-3 py-1.5 text-[10px] text-[#6B4E16] transition hover:bg-[#FFF8E0]">
              导入 JSON 文件
              <input
                aria-label="导入人工签字凭据文件"
                type="file"
                accept="application/json,.json"
                disabled={!signoffChallenge || signoffChallengeLoading}
                className="sr-only"
                onChange={(event) => {
                  void importSignoffCredential(event.target.files?.[0] ?? null);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <ImperialButton
              variant="primary"
              size="sm"
              disabled={!signoffChallenge || !signoffCredentialText.trim() || phase === 'deciding'}
              onClick={() => void submitSignoffCredential()}
            >
              {phase === 'deciding'
                ? '正在核验'
                : signoffRequiredAction === 'approve'
                  ? '提交签字并准奏'
                  : '提交签字并归档'}
            </ImperialButton>
          </div>
          {signoffCredentialError && (
            <p role="alert" className="mt-2 text-[10px] text-[#962820]">
              {signoffCredentialError}
            </p>
          )}
          <p className="mt-2 text-[9px] leading-4 text-[#8A7450]">
            凭据仅保留在本页内存；不会写入浏览器存储，也不会由前端生成或输出到日志。
          </p>
        </section>
      )}

      {notice && (
        <div
          className="fixed bottom-[104px] left-1/2 z-[70] max-w-[90vw] -translate-x-1/2 rounded-full border border-[#F0C66A]/40 bg-[#0C1022]/95 px-4 py-2 text-[12px] text-[#F5E9C9]"
          role="status"
        >
          {notice}
        </div>
      )}

      <DecreeInput
        value={decreeText}
        onChange={setDecreeText}
        mode={decreeMode}
        askTarget={askTarget}
        onModeChange={setDecreeMode}
        onAskTargetChange={setAskTarget}
        onSend={() => {
          if (phase === 'idle' || phase === 'error') void draftStudy();
          else flashNotice('当前案已进入流程，请先完成本轮下旨或裁决。');
        }}
        onPolish={() => flashNotice('御前试行版暂不调用额外模型润色，请直接修改原文。')}
        onFileUpload={(file) => flashNotice(`附件已选择：${file.name}（暂不上传）`)}
        state={decreeState}
        message={error}
        showContext={false}
        availableModes={['order', 'secret', 'ask']}
        submitLabel="下旨并启动 LangGraph"
        showChancellorPanel={showChancellorPanel}
        showMentorPanel={showMentorPanel}
        onToggleChancellorPanel={() => {
          setShowChancellorPanel((prev) => !prev);
          if (!showChancellorPanel) {
            setSelectedMemorial(null);
          }
        }}
        onToggleMentorPanel={() => {
          setShowMentorPanel((prev) => !prev);
          if (!showMentorPanel) {
            setSelectedMentorGuidance(null);
          }
        }}
      />
    </div>
  );
}
