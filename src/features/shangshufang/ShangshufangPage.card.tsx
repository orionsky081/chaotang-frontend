'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowRight, FileText, Loader2, ScrollText, ShieldAlert } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { API_PATHS, swrFetcher } from '@/lib/api';
import { shangshufangLoop } from '@/lib/api/clients/shangshufang-loop';
import {
  isTerminalTaskStatus,
  type ConfirmEdictResponse,
  type DecisionAction,
  type DecisionResponse,
  type DraftEdict,
  type Memorial,
  type ShangshufangTask,
  type TaskStatusResponse,
} from '@/lib/contracts/shangshufang-loop';

interface StudyBriefing {
  dailyReport: {
    taskTotal: number;
    pendingDecisions: number;
    runningCount: number;
    completedToday: number;
  };
  importantEvents: {
    dept: string;
    title: string;
    tag: string;
    priority: string;
    at?: string;
  }[];
  pendingDecisions: {
    memorialId: string;
    dept: string;
    title: string;
    summary: string;
    priority: string;
    urgent: boolean;
  }[];
  recommendations: {
    icon: string;
    title: string;
    detail: string;
    actionHref: string;
  }[];
  recentMemorials: {
    id: string;
    title: string;
    status: string;
    priority?: string;
  }[];
  recentTasks: {
    taskId: string;
    title: string;
    status: string;
    progressPct: number;
  }[];
}

const FALLBACK_BRIEFING: StudyBriefing = {
  dailyReport: {
    taskTotal: 0,
    pendingDecisions: 0,
    runningCount: 0,
    completedToday: 0,
  },
  importantEvents: [],
  pendingDecisions: [],
  recommendations: [],
  recentMemorials: [],
  recentTasks: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseStudyBriefing(value: unknown): StudyBriefing {
  if (!isRecord(value)) return FALLBACK_BRIEFING;
  const dailyReport = isRecord(value.dailyReport) ? value.dailyReport : {};
  const safeItems = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    dailyReport: {
      taskTotal: toNumber(dailyReport.taskTotal, 0),
      pendingDecisions: toNumber(dailyReport.pendingDecisions, 0),
      runningCount: toNumber(dailyReport.runningCount, 0),
      completedToday: toNumber(dailyReport.completedToday, 0),
    },
    importantEvents: safeItems<{
      dept: string;
      title: string;
      tag: string;
      priority: string;
      at?: string;
    }>(value.importantEvents).map((entry) => ({
      dept: toString((entry as Record<string, unknown>).dept, '未标注部门'),
      title: toString((entry as Record<string, unknown>).title, '待补充标题'),
      tag: toString((entry as Record<string, unknown>).tag, '待关注'),
      priority: toString((entry as Record<string, unknown>).priority, 'medium'),
      at: toString((entry as Record<string, unknown>).at, ''),
    })),
    pendingDecisions: safeItems<{
      memorialId: string;
      dept: string;
      title: string;
      summary: string;
      priority: string;
      urgent: boolean;
    }>(value.pendingDecisions).map((item) => ({
      memorialId: toString((item as Record<string, unknown>).memorialId, ''),
      dept: toString((item as Record<string, unknown>).dept, '未标注部门'),
      title: toString((item as Record<string, unknown>).title, '待说明'),
      summary: toString((item as Record<string, unknown>).summary, '未返回摘要'),
      priority: toString((item as Record<string, unknown>).priority, 'medium'),
      urgent: toBoolean((item as Record<string, unknown>).urgent, false),
    })),
    recommendations: safeItems<{
      icon: string;
      title: string;
      detail: string;
      actionHref: string;
    }>(value.recommendations).map((item) => ({
      icon: toString((item as Record<string, unknown>).icon, 'lightbulb'),
      title: toString((item as Record<string, unknown>).title, ''),
      detail: toString((item as Record<string, unknown>).detail, ''),
      actionHref: toString((item as Record<string, unknown>).actionHref, '/court-briefing'),
    })),
    recentMemorials: safeItems<{
      id: string;
      title: string;
      status: string;
      priority?: string;
    }>(value.recentMemorials).map((item) => ({
      id: toString((item as Record<string, unknown>).id, ''),
      title: toString((item as Record<string, unknown>).title, ''),
      status: toString((item as Record<string, unknown>).status, ''),
      priority: toString((item as Record<string, unknown>).priority, 'medium'),
    })),
    recentTasks: safeItems<{
      taskId: string;
      title: string;
      status: string;
      progressPct: number;
    }>(value.recentTasks).map((item) => ({
      taskId: toString((item as Record<string, unknown>).taskId, ''),
      title: toString((item as Record<string, unknown>).title, ''),
      status: toString((item as Record<string, unknown>).status, ''),
      progressPct: toNumber((item as Record<string, unknown>).progressPct, 0),
    })),
  };
}

type LoopPhase = 'idle' | 'drafting' | 'drafted' | 'confirming' | 'confirmed' | 'deciding' | 'restoring' | 'error';

const TASK_ID_QUERY_KEY = 'studyTaskId';

const DECISION_BUSY_TEXT: Record<string, string> = {
  approve: '正在准奏…',
  reject: '正在驳回…',
  request_evidence: '正在要求补证…',
  archive: '正在归档裁决…',
};

const DECISION_ACTION_LABEL: Record<string, string> = {
  approve: '准奏',
  reject: '驳回',
  request_evidence: '要求补证',
  archive: '归档',
};

/**
 * RD-4「皇帝看得懂」：后端裁决门（如 INV-5 缺证门）拒绝时，原始错误消息带术语
 * （`quality_gate`/`missing_evidence`/`INV-5`），非技术背景的人看不懂。
 * 这里只是**换个说法指路**，不解析/不判断错误内容本身——真正的原因已经在上面
 * 「质门」「缺证」两栏用人话写清楚了，这条只是把用户的视线带回去，原始提示原样保留在后面，不隐藏任何信息。
 */
function decisionErrorMessage(action: DecisionAction, rawMessage: string): string {
  const actionLabel = DECISION_ACTION_LABEL[action] ?? '这次裁决';
  return `「${actionLabel}」被系统拦下了——具体卡在哪，看上面「质门」「缺证」两栏。系统原始提示：${rawMessage}`;
}

/**
 * 上书房新旨意只走 LangGraph Court 权威入口 `/kernel/intake`。
 *
 * 旧九段回路只保留只读恢复，在 LangGraph 权威模式下不能再创建、确认或裁决。
 */
export function ShangshufangPage() {
  const {
    data: rawBriefing,
    error: briefingError,
  } = useSWR<StudyBriefing, Error>(API_PATHS.chaotang.studyBriefing, swrFetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<LoopPhase>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [draftEdict, setDraftEdict] = useState<DraftEdict | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmEdictResponse | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);
  const [busyText, setBusyText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const briefing = rawBriefing ? parseStudyBriefing(rawBriefing) : FALLBACK_BRIEFING;

  // INV-12「刷新不丢」：URL 带 taskId 时挂载即用后端权威状态恢复，不吃本地 state 的记忆。
  useEffect(() => {
    const restoreId = searchParams.get(TASK_ID_QUERY_KEY);
    if (!restoreId || taskId) return;
    setTaskId(restoreId);
    setPhase('restoring');
    setBusyText('恢复上次任务状态…');
    shangshufangLoop
      .taskStatus(restoreId)
      .then((status) => {
        setTaskStatus(status);
        setPhase('confirmed');
        setBusyText('');
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : '恢复任务状态失败');
        setPhase('error');
        setBusyText('');
      });
    // 只在挂载时读一次 URL 种子，不随后续交互重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushTaskIdToUrl(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(TASK_ID_QUERY_KEY, id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function draftStudy() {
    const clean = question.trim();
    if (!clean) {
      setError('请先写明要办的事。');
      return;
    }
    setPhase('drafting');
    setBusyText('丞相正在领旨并启动 LangGraph 编排…');
    setError(null);
    setDraftEdict(null);
    setConfirmResult(null);
    setTaskStatus(null);
    setDecisionResult(null);
    try {
      const res = await shangshufangLoop.submitIntent({
        request_text: clean,
        idempotency_key: `court-intake:${crypto.randomUUID()}`,
      });
      setTaskId(res.run_id);
      router.push(`/task/${encodeURIComponent(res.run_id)}/report`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '拟旨失败');
      setPhase('error');
      setBusyText('');
    }
  }

  async function confirmDispatch() {
    if (!taskId) return;
    setPhase('confirming');
    setBusyText('军机处会审并派发六部蜂群…（可能耗时数十秒，请勿刷新）');
    setError(null);
    try {
      const res = await shangshufangLoop.confirmEdict({ task_id: taskId, confirmed: true });
      setConfirmResult(res);
      const status = await shangshufangLoop.taskStatus(taskId);
      setTaskStatus(status);
      setPhase('confirmed');
      setBusyText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '确认下旨失败');
      setPhase('error');
      setBusyText('');
    }
  }

  async function submitDecision(action: DecisionAction) {
    if (!taskId) return;
    setPhase('deciding');
    setBusyText(DECISION_BUSY_TEXT[action] ?? '正在提交裁决…');
    setError(null);
    try {
      const res = await shangshufangLoop.decide(taskId, { action, human_confirmed: true });
      setDecisionResult(res);
      // 已知坑：success:true 不代表 status 落终态，用刷新回来的 task.status 判定，不用 success。
      const refreshed = await shangshufangLoop.taskStatus(taskId);
      setTaskStatus(refreshed);
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : '裁决提交失败';
      setError(decisionErrorMessage(action, rawMessage));
    } finally {
      setPhase('confirmed');
      setBusyText('');
    }
  }

  function resetLoop() {
    setQuestion('');
    setPhase('idle');
    setTaskId(null);
    setDraftEdict(null);
    setConfirmResult(null);
    setTaskStatus(null);
    setDecisionResult(null);
    setBusyText('');
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(TASK_ID_QUERY_KEY);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const memorial: Memorial | null = taskStatus?.review?.memorial ?? confirmResult?.memorial ?? null;
  const currentTask: ShangshufangTask | null = taskStatus?.task ?? null;
  // 刷新恢复（INV-12）时本地 draftEdict state 是空的（只在 draftStudy() 现走一遍时才有）；
  // 权威快照 task.draft_edict 里带着同一份草稿，用它兜底，恢复态也能看到完整段1→段8。
  const effectiveDraft: DraftEdict | null = draftEdict ?? currentTask?.draft_edict ?? null;
  const isBusy = phase === 'drafting' || phase === 'confirming' || phase === 'deciding' || phase === 'restoring';
  const canDraft = phase === 'idle' || phase === 'error';
  const showDraftButton = canDraft || phase === 'drafting';

  return (
    <main className="min-h-full bg-[#04060E] px-5 py-6">
      <div className="mx-auto max-w-[1580px]">
        <header className="rounded-xl border border-[#F0C66A]/22 bg-[#080B15]/86 px-5 py-5">
          <div className="page-eyebrow">SHANGSHUFANG · TRUE LOOP / STUDY CONTRACT</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="page-title">上书房</h1>
              <p className="body-copy mt-2 max-w-[820px]">
                新旨意由 LangGraph 唯一权威接收：丞相自动拆解成功标准、调度六部与锦衣卫，并合成一次性回奏。
              </p>
            </div>
            <Link
              href="/command-center"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7EC8E3]/28 bg-[#7EC8E3]/8 px-3 py-1.5 text-[11px] text-[#A7DDF0]"
            >
              去军机处
              <ArrowRight size={12} />
            </Link>
          </div>
        </header>

        {(briefingError || error) && (
          <div className="mt-4 rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-4 py-3 text-[12px] text-[#F6A5B2]">
            {error ?? `后端上书房读取失败：${briefingError?.message}`}
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.86fr_1.24fr_0.9fr]">
          <GlassPanel tone="elevated" padding="lg">
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-[#F0C66A]" />
              <h2 className="section-title">后端今日要务</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat title="今日总量" value={String(briefing.dailyReport.taskTotal)} tone="gold" />
              <Stat title="待裁决" value={String(briefing.dailyReport.pendingDecisions)} tone="blue" />
              <Stat title="进行中" value={String(briefing.dailyReport.runningCount)} tone="red" />
              <Stat title="当日已结" value={String(briefing.dailyReport.completedToday)} tone="green" />
            </div>

            <Section title="重点提醒" className="mt-4">
              {briefing.importantEvents.length > 0 ? (
                <ul className="space-y-2">
                  {briefing.importantEvents.map((event) => (
                    <li
                      key={`${event.dept}-${event.title}-${event.priority}`}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <div className="text-[11px] text-[#D7DFF2]">{event.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] text-[#8F98B8]">
                        <span className="rounded border border-[#F0C66A]/20 px-2 py-0.5 text-[#F0C66A]">{event.tag}</span>
                        <span className="rounded border border-white/10 px-2 py-0.5 text-[#8F98B8]">{event.dept}</span>
                        <span className="rounded border border-white/10 px-2 py-0.5 text-[#8F98B8]">{event.priority}</span>
                        {event.at ? <span className="rounded border border-white/10 px-2 py-0.5 text-[#8F98B8]">{event.at}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text={briefingError ? '后端不可用，暂无法加载当日要务。' : '后端当前没有待关注要务。'} />
              )}
            </Section>
          </GlassPanel>

          <GlassPanel variant="gold" tone="deep" padding="lg">
            <div className="flex items-center gap-2">
              <ScrollText size={15} className="text-[#F0C66A]" />
              <h2 className="section-title">上书与圣旨</h2>
            </div>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={7}
              placeholder="写明要解决的问题和事实边界……"
              disabled={!canDraft}
              className="mt-4 w-full resize-y rounded-xl border border-[#F0C66A]/20 bg-black/35 px-4 py-3 text-[13px] leading-7 text-[#F5E9C9] outline-none placeholder:text-[#69718F] focus:border-[#F0C66A]/45 disabled:opacity-60"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {showDraftButton && (
                <ModeButton
                  active
                  busy={phase === 'drafting'}
                  onClick={draftStudy}
                  disabled={isBusy || !question.trim()}
                  label="下旨并启动 LangGraph"
                  secondary={false}
                />
              )}
              {phase === 'drafted' && (
                <ModeButton
                  active
                  busy={false}
                  onClick={confirmDispatch}
                  disabled={false}
                  label="确认下旨，派发军机处会审"
                  secondary={false}
                />
              )}
              {(phase === 'confirmed' || phase === 'error') && (draftEdict || taskId) && (
                <ModeButton
                  active={false}
                  busy={false}
                  onClick={resetLoop}
                  disabled={false}
                  label="另拟一份"
                  secondary
                />
              )}
            </div>

            {isBusy && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#7EC8E3]/22 bg-[#7EC8E3]/8 px-3 py-2 text-[11px] text-[#A7DDF0]">
                <Loader2 size={13} className="animate-spin" />
                <span>{busyText}</span>
              </div>
            )}

            {effectiveDraft && phase !== 'idle' && <DraftPreviewCard draft={effectiveDraft} />}

            {memorial && currentTask && (phase === 'confirmed' || phase === 'deciding') && (
              <MemorialCard
                task={currentTask}
                memorial={memorial}
                decisionResult={decisionResult}
                busy={phase === 'deciding'}
                onDecide={submitDecision}
              />
            )}
          </GlassPanel>

          <GlassPanel tone="elevated" padding="lg">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">待裁决与待办</h2>
              <span className="text-[10px] text-[#8F98B8]">
                {briefing.pendingDecisions.length + briefing.recentTasks.length} 件
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <Section title="待裁决队列">
                {briefing.pendingDecisions.length ? (
                  <div className="space-y-2">
                    {briefing.pendingDecisions.map((decision) => (
                      <DecisionCard key={decision.memorialId} decision={decision} />
                    ))}
                  </div>
                ) : (
                  <Empty text="当前无 pending/pending 之外的待裁决事项。" />
                )}
              </Section>

              <Section title="近期任务">
                {briefing.recentTasks.length ? (
                  <div className="space-y-2">
                    {briefing.recentTasks.map((task) => (
                      <TaskCard key={task.taskId} task={task} />
                    ))}
                  </div>
                ) : (
                  <Empty text="后端当前无近期任务记录。" />
                )}
              </Section>

              <Section title="推荐动作">
                {briefing.recommendations.length ? (
                  <div className="space-y-2">
                    {briefing.recommendations.map((item) => (
                      <div key={`${item.title}-${item.actionHref}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <div className="text-[11px] text-[#F0C66A]">{item.title}</div>
                        <div className="mt-1 text-[11px] text-[#D7DFF2]">{item.detail}</div>
                        <Link href={item.actionHref} className="mt-2 inline-block text-[10px] text-[#8F98B8] underline decoration-[#8F98B8] underline-offset-4">
                          打开 / {item.actionHref}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="未返回推荐动作。" />
                )}
              </Section>
            </div>
          </GlassPanel>
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  busy,
  disabled,
  onClick,
  label,
  secondary,
}: {
  active: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  secondary: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-semibold disabled:opacity-40 ${
        secondary ? 'border-[#7EC8E3]/30 bg-[#7EC8E3]/6 text-[#A7DDF0]' : 'border-[#F0C66A]/42 bg-[#F0C66A]/10 text-[#F0C66A]'
      }`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
      {label}
      {active ? ' · 当前模式' : null}
    </button>
  );
}

/** 段1 拟旨草案预览——确认下旨前先看清楚系统读懂了什么、还缺什么。 */
function DraftPreviewCard({ draft }: { draft: DraftEdict }) {
  return (
    <article className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[#8F835F]">圣旨草案</span>
        <SourceLabelBadge label={draft.source_label} />
      </div>
      <p className="mt-2 text-[12px] leading-6 text-[#C6CEE6]">{draft.refined_edict}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
        {draft.recommended_departments.length ? (
          draft.recommended_departments.map((dept) => (
            <span key={dept} className="rounded border border-[#F0C66A]/20 px-2 py-0.5 text-[#F0C66A]">
              {dept}
            </span>
          ))
        ) : (
          <span className="text-[#8F98B8]">未返回推荐部门</span>
        )}
      </div>
      {draft.known_facts.length > 0 && (
        <div className="mt-2 text-[10px] text-[#8F98B8]">已知：{draft.known_facts.join('；')}</div>
      )}
      {draft.unknown_gaps.length > 0 && (
        <div className="mt-1 text-[10px] text-[#F59FA9]">待补证：{draft.unknown_gaps.join('；')}</div>
      )}
      <div className="mt-2 text-[10px] text-[#8F98B8]">{draft.emperor_confirmation_question}</div>
    </article>
  );
}

/**
 * 段4-8 回奏卡片：奏折八要素（圣裁/分奏/证据/缺证/风险/后令/质门/来源）+ 裁决按钮。
 * 裁决按钮优先按后端 `memorial.decision_options` 动态渲染（label/reason/enabled 都来自后端，
 * 后端在质门 blocked 时会主动不提供「准奏」——这是 INV-14 人工确认门的一部分，不是遗漏，
 * 前端不应绕过它硬塞一个通用「准奏」按钮）；后端未返回 decision_options 时才退化为
 * 固定的「准奏/驳回」两键。
 */
function MemorialCard({
  task,
  memorial,
  decisionResult,
  busy,
  onDecide,
}: {
  task: ShangshufangTask;
  memorial: Memorial;
  decisionResult: DecisionResponse | null;
  busy: boolean;
  onDecide: (action: DecisionAction) => void;
}) {
  const terminal = isTerminalTaskStatus(task.status);
  const decisionOptions = memorial.decision_options ?? [];
  const riskItems = memorial.risk_register ?? [];
  const riskFlags = memorial.risk_flags ?? [];
  const memorialTone = SOURCE_TONE_BY_LABEL[memorial.source_label] ?? 'unknown';
  const isHonestyWarning = memorialTone === 'demo' || memorialTone === 'mixed' || memorialTone === 'unknown';

  return (
    <article className="mt-4 rounded-xl border border-[#7EC8E3]/20 bg-[#7EC8E3]/[0.05] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[#8F835F]">{memorial.title}</span>
        <SourceLabelBadge label={memorial.source_label} size="md" />
      </div>
      {isHonestyWarning && (
        <div className="mt-2 rounded-lg border border-[#F43F5E]/40 bg-[#F43F5E]/10 px-3 py-2 text-[11px] leading-5 text-[#F6A5B2]">
          ⚠ 本奏折整体来源标注 <strong>{memorial.source_label}</strong>
          ，含演示/推断/未核实内容，不能当真实结论直接执行——下方每个部门分奏各自标了自己的真实来源，
          一律以逐条为准，不要只看这一句概括。
        </div>
      )}
      <h3 className="mt-1.5 text-[17px] leading-6 text-[#F5E9C9]">圣裁：{memorial.verdict}</h3>
      {memorial.summary ? <p className="mt-2 text-[12px] leading-6 text-[#C6CEE6]">{memorial.summary}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        <Badge label="task_status" value={task.status} />
        {task.latest_decision ? (
          <Badge
            label="latest_decision"
            value={`${task.latest_decision.action}${task.latest_decision.decided_at ? ` · ${task.latest_decision.decided_at}` : ''}`}
          />
        ) : null}
      </div>

      {decisionResult && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${
            terminal
              ? 'border-[#3DD68C]/30 bg-[#3DD68C]/8 text-[#3DD68C]'
              : 'border-[#F5A524]/30 bg-[#F5A524]/8 text-[#F5A524]'
          }`}
        >
          {terminal
            ? `裁决已生效 · 当前状态「${task.status}」`
            : `已提交裁决，当前状态「${task.status}」尚未落终态（success 不代表已生效，稍后刷新查看）`}
        </div>
      )}

      <Section title="质门" className="mt-3">
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <div className="text-[12px] leading-6 text-[#B8C0DA]">
            {memorial.quality_gate.status} · {memorial.quality_gate.human_signoff_required ? '需人工圣裁' : '暂不需要人工圣裁'}
          </div>
          {memorial.quality_gate.reasons.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {memorial.quality_gate.reasons.map((reason, index) => (
                <li key={`${reason}-${index}`} className="text-[10px] text-[#8F98B8]">
                  · {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="分奏" className="mt-3">
        {memorial.ministry_outputs.length ? (
          <ul className="space-y-2">
            {memorial.ministry_outputs.map((dept) => (
              <li key={dept.department} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#F0C66A]">
                    {dept.department}
                    {dept.position ? ` · ${dept.position}` : ''}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[#8F98B8]">{dept.status}</span>
                </div>
                <div className="mt-1 text-[11px] text-[#D7DFF2]">{dept.opinion}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] text-[#8F98B8]">
                  <SourceLabelBadge label={dept.source_label} />
                  {dept.confidence ? <span>confidence {dept.confidence}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="后端未返回分奏。" />
        )}
      </Section>

      <Section title="证据" className="mt-3">
        {memorial.evidence_chain?.length ? (
          <div className="space-y-2 text-[11px] leading-5 text-[#B8C0DA]">
            {memorial.evidence_chain.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-[#C6CEE6]">{item.title}</div>
                <div className="text-[9px] text-[#8F98B8]">
                  {item.source_type ?? '未标注来源类型'}
                  {item.confidence ? ` · confidence ${item.confidence}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="后端未返回证据链（本轮参审蜂群尚未产出可核验证据）。" />
        )}
      </Section>

      <Section title="缺证" className="mt-3">
        {task.missing_evidence.length || memorial.evidence_gaps.length ? (
          <div className="space-y-1.5">
            {task.missing_evidence.length > 0 && (
              <div className="text-[11px] leading-6 text-[#D7DFF2]">拟旨阶段：{task.missing_evidence.join('、')}</div>
            )}
            {memorial.evidence_gaps.length > 0 && (
              <div className="text-[11px] leading-6 text-[#D7DFF2]">会审阶段：{memorial.evidence_gaps.join('、')}</div>
            )}
          </div>
        ) : (
          <Empty text="无缺证。" />
        )}
      </Section>

      <Section title="风险" className="mt-3">
        {riskItems.length || riskFlags.length ? (
          <ul className="space-y-1">
            {riskItems.length > 0
              ? riskItems.map((item, index) => (
                  <li key={`${item.risk}-${index}`} className="text-[11px] leading-6 text-[#D7DFF2]">
                    · {item.risk}
                    {item.severity ? `（${item.severity}）` : ''}
                    {item.reason ? ` — ${item.reason}` : ''}
                  </li>
                ))
              : riskFlags.map((flag, index) => (
                  <li key={`${flag}-${index}`} className="text-[11px] leading-6 text-[#D7DFF2]">
                    · {flag}
                  </li>
                ))}
          </ul>
        ) : (
          <Empty text="无新增风险披露。" />
        )}
      </Section>

      <Section title="后令" className="mt-3">
        {memorial.recommended_next_action ? (
          <div className="text-[11px] leading-6 text-[#D7DFF2]">{memorial.recommended_next_action}</div>
        ) : (
          <Empty text="未返回下一步安排。" />
        )}
      </Section>

      <Section title="来源" className="mt-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] leading-6 text-[#D7DFF2]">
          <span className="inline-flex items-center gap-1.5">
            奏折整体
            <SourceLabelBadge label={memorial.source_label} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            任务快照
            <SourceLabelBadge label={task.source_label} />
          </span>
        </div>
      </Section>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        {decisionOptions.length ? (
          decisionOptions.map((option) => (
            <DecisionButton
              key={option.action}
              label={option.label}
              reason={option.reason}
              disabled={busy || terminal || !option.enabled}
              busy={busy}
              onClick={() => onDecide(option.action as DecisionAction)}
            />
          ))
        ) : (
          <>
            <DecisionButton label="准奏" disabled={busy || terminal} busy={busy} onClick={() => onDecide('approve')} />
            <DecisionButton label="驳回" disabled={busy || terminal} busy={busy} onClick={() => onDecide('reject')} />
          </>
        )}
      </div>
      {terminal && (
        <div className="mt-2 text-[10px] text-[#8F98B8]">本案已裁决完毕（状态：{task.status}），不可重复裁决。</div>
      )}
    </article>
  );
}

function DecisionButton({
  label,
  reason,
  disabled,
  busy,
  onClick,
}: {
  label: string;
  reason?: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={reason}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C66A]/40 bg-[#F0C66A]/10 px-3.5 py-1.5 text-[11px] font-semibold text-[#F0C66A] disabled:opacity-40"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : null}
      {label}
    </button>
  );
}

function DecisionCard({ decision }: { decision: StudyBriefing['pendingDecisions'][number] }) {
  return (
    <article className="rounded-xl border border-white/8 bg-black/25 px-3 py-3">
      <div className="text-[11px] leading-6 text-[#F5E9C9]">{decision.title}</div>
      <div className="mt-1.5 text-[10px] text-[#8F98B8]">{decision.summary}</div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
        <span className="rounded border border-[#F0C66A]/20 px-2 py-0.5 text-[#F0C66A]">{decision.priority}</span>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[#8F98B8]">{decision.dept}</span>
        {decision.urgent ? <span className="rounded border border-red-500/40 px-2 py-0.5 text-[#F59FA9]">urgent</span> : null}
      </div>
      <div className="mt-2 font-mono text-[9px] text-[#69718F]">{decision.memorialId}</div>
    </article>
  );
}

function TaskCard({ task }: { task: StudyBriefing['recentTasks'][number] }) {
  return (
    <article className="rounded-xl border border-white/8 bg-black/25 px-3 py-3">
      <div className="text-[11px] leading-6 text-[#F5E9C9]">{task.title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
        <span className="rounded border border-[#F0C66A]/20 px-2 py-0.5 text-[#F0C66A]">{task.status}</span>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[#8F98B8]">进度 {task.progressPct}%</span>
      </div>
      <div className="mt-2 font-mono text-[9px] text-[#69718F]">{task.taskId}</div>
    </article>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone: 'gold' | 'blue' | 'red' | 'green' }) {
  const toneClass = {
    gold: 'text-[#F0C66A] border-[#F0C66A]/22 bg-[#F0C66A]/8',
    blue: 'text-[#A7DDF0] border-[#7EC8E3]/22 bg-[#7EC8E3]/8',
    red: 'text-[#F59FA9] border-[#F59FA9]/22 bg-[#F59FA9]/8',
    green: 'text-[#3DD68C] border-[#3DD68C]/22 bg-[#3DD68C]/8',
  }[tone];
  return (
    <div className={`rounded-xl border ${toneClass} px-3 py-3`}>
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#8F835F]">{title}</div>
      <div className="mt-1 text-[18px] font-semibold">{value}</div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[9px] text-[#8F98B8]">
      <span className="text-[#8F835F]">{label}</span>
      <span className="text-[#D7DFF2]">{value}</span>
    </span>
  );
}

/**
 * INV-1「诚实标注」的落点：DEMO/FALLBACK 禁伪装成 LIVE。
 * 这不是从字面值猜的——直接对照后端 SOURCE_LABELS 枚举语义分组
 * （`backend/src/swarm_execution_loop.py:56`，10 值，见 docs/api-contracts.md）：
 * DEMO/FALLBACK 是"没有真实来源撑腰"，LIVE_ENGINE/ENGINE_BACKED 是"确定性引擎真跑过"，
 * LIVE_SWARM 是"蜂群产出但非确定性引擎"，MIXED/LLM_ONLY 是"部分或仅推断"，
 * NOT_FOUND/NOT_APPLICABLE 是"资源层面的有无"，不参与可信度分级但同样不能被静默吞成 FALLBACK。
 * 前端只做展示分组，不做业务判定（禁止在这里"推断"某个新值该算哪类，未登记的值一律落 unknown 分组，
 * 亮出原始字符串——不是让它安静地长得像别的东西）。
 */
type SourceTone = 'demo' | 'engine' | 'swarm' | 'live' | 'mixed' | 'not-found' | 'unknown';

const SOURCE_TONE_BY_LABEL: Record<string, SourceTone> = {
  DEMO: 'demo',
  FALLBACK: 'demo',
  LIVE_ENGINE: 'engine',
  ENGINE_BACKED: 'engine',
  LIVE_SWARM: 'swarm',
  LIVE: 'live',
  MIXED: 'mixed',
  LLM_ONLY: 'mixed',
  NOT_FOUND: 'not-found',
  NOT_APPLICABLE: 'not-found',
};

const SOURCE_TONE_STYLE: Record<SourceTone, { className: string; prefix: string }> = {
  demo: { className: 'border-[#F43F5E]/60 bg-[#F43F5E]/18 text-[#F43F5E] font-semibold', prefix: '【演示】' },
  engine: { className: 'border-[#3DD68C]/55 bg-[#3DD68C]/14 text-[#3DD68C] font-semibold', prefix: '【真·引擎验证】' },
  swarm: { className: 'border-[#7EC8E3]/50 bg-[#7EC8E3]/12 text-[#A7DDF0]', prefix: '【蜂群产出】' },
  live: { className: 'border-[#3DD68C]/50 bg-[#3DD68C]/12 text-[#3DD68C]', prefix: '【真实】' },
  mixed: { className: 'border-[#F5A524]/55 bg-[#F5A524]/14 text-[#F5A524] font-semibold', prefix: '【混合/推断】' },
  'not-found': { className: 'border-[#8F98B8]/45 bg-[#8F98B8]/10 text-[#8F98B8]', prefix: '【未查到】' },
  unknown: { className: 'border-[#F5A524]/55 bg-[#F5A524]/14 text-[#F5A524] font-semibold', prefix: '【未登记枚举】' },
};

function SourceLabelBadge({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  const tone = SOURCE_TONE_BY_LABEL[label] ?? 'unknown';
  const style = SOURCE_TONE_STYLE[tone];
  const sizeClass = size === 'md' ? 'text-[11px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${style.className} ${sizeClass}`}>
      {style.prefix}
      {label}
    </span>
  );
}

function Section({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-[#8F835F]">{title}</div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[11px] leading-6 text-[#8F98B8]">{text}</div>;
}
