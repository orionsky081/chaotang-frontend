'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, Bot, FilePlus2, Landmark, ScrollText, Users } from 'lucide-react';
import {
  BattleStream,
  CasesView,
  CouncilView,
  type GroupCard,
  type MemorialSnapshot,
  type MinisterRow,
  type RiskBanner,
} from '@/features/command-center';
import { SCROLL_ACTION_CLASS, SCROLL_PAPER } from '@/features/shangshufang/edict-content';
import { ShangshufangLayoutShell } from '@/features/shared/components/shangshufang-layout-shell';
import { chaotang } from '@/lib/api/clients/chaotang';
import { apiGateway, API_PATHS } from '@/lib/api/gateway';

/**
 * 2026-07-23 视觉恢复(批1):09ee238 把军机处「待接案」主视觉从卷轴(EdictStage)
 * 换成了纯 textarea 表单。本轮重构将待接案/执行事件统一放进 scroll-paper 卷轴区
 * （标题「奏折」+「機密」章 + 来源 + 建议），**不改任何真实数据/状态/API 调用**——
 * BattleStream/后端立案逻辑原样保留。详见 .trellis/tasks/08-08-frontend-ui-redesign/
 */
interface TaskSummary {
  id: string;
  title: string;
  command: string;
  status: string;
  sourceLabel: string;
  updatedAt?: string;
}

interface StartResponse {
  taskId: string;
  status: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function taskSummaryFromBackend(taskId: string, detail: unknown): TaskSummary {
  const root = isRecord(detail) ? detail : {};
  const task = isRecord(root.task) ? root.task : root;
  const result = isRecord(task.result) ? task.result : isRecord(root.result) ? root.result : {};
  const command =
    text(task.rawCommand)
    ?? text(task.raw_command)
    ?? text(task.description)
    ?? text(task.command)
    ?? '';
  return {
    id: taskId,
    title: (text(task.title) ?? text(task.intent) ?? command.slice(0, 48)) || '军机处案卷',
    command,
    status: text(task.status) ?? 'unknown',
    sourceLabel:
      text(task.sourceLabel)
      ?? text(task.source_label)
      ?? text(task.source)
      ?? text(result.sourceLabel)
      ?? 'UNKNOWN',
    updatedAt: text(task.updatedAt) ?? text(task.updated_at),
  };
}

async function startBackendCase(command: string): Promise<StartResponse> {
  const payload = await apiGateway.post<Partial<StartResponse> & { detail?: string }>(
    API_PATHS.frontend.commandCenterOrchestrationRun,
    { command },
  );
  if (!payload.taskId) {
    throw new Error(payload.detail ?? '军机处立案失败');
  }
  return { taskId: payload.taskId, status: payload.status ?? 'running' };
}

function CommandCenterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const taskId = searchParams.get('taskId');
  const initialIntent = searchParams.get('intent')?.trim() ?? '';
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [command, setCommand] = useState(initialIntent);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [ministers, setMinisters] = useState<MinisterRow[]>([]);
  const [risks, setRisks] = useState<RiskBanner[]>([]);
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [councilSummary, setCouncilSummary] = useState<string>();
  const [memorial, setMemorial] = useState<MemorialSnapshot | null>(null);

  useEffect(() => {
    setMinisters([]);
    setRisks([]);
    setGroups([]);
    setCouncilSummary(undefined);
    setMemorial(null);
    setTaskSummary(null);
    setTaskError(null);
    if (!taskId) return;
    let cancelled = false;
    void chaotang.taskDetail(taskId)
      .then((detail) => {
        if (!cancelled) setTaskSummary(taskSummaryFromBackend(taskId, detail));
      })
      .catch((error) => {
        if (!cancelled) setTaskError(error instanceof Error ? error.message : 'task_detail_failed');
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleStart = useCallback(async () => {
    const clean = command.trim();
    if (clean.length < 5) {
      setStartError('请把要办的事写得更具体一些。');
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      const started = await startBackendCase(clean);
      router.push(`/command-center?taskId=${encodeURIComponent(started.taskId)}`);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : '后端立案失败');
    } finally {
      setStarting(false);
    }
  }, [command, router]);

  if (view === 'council') return <CouncilViewWithTabs />;
  if (view === 'cases') return <CasesViewWithTabs />;

  const hasTask = Boolean(taskId);
  const title = taskSummary?.title ?? (hasTask ? '正在读取后端案卷' : '军机处待接案');

  return (
    <ShangshufangLayoutShell
      eyebrow="JUNJICHU · COMMAND CENTER"
      title="军机处"
      subtitle="前端只呈现后端案卷与执行事件；路由、评估、状态机和持久化均在后端。"
      accent="#8AA4FF"
      background="/assets/junjichu/junjichu.webp"
      actions={<JunjichuTabs current="command" />}
      left={
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          {/* ① 军机处为何开 */}
          <RailCard n="①" title="军机处为何开" demo={!hasTask}>
            {!hasTask ? (
              <p>当前没有真实案卷，此处为演示态——接入真实任务后替换为真实研判动因。</p>
            ) : (
              <p>正在对案「{title}」进行中枢研判。</p>
            )}
          </RailCard>

          {/* ② 接案 */}
          <RailCard n="②" title="接案">
            <KV k="taskId" v={taskId ?? '待接案'} mono />
            <KV k="阶段 phase" v={taskSummary?.status ?? 'empty'} mono />
            <KV k="状态" v={taskSummary?.status ?? '未立案'} />
          </RailCard>

          {/* ③ 丞相路由 */}
          <RailCard n="③" title="丞相路由">
            {hasTask ? (
              <p>后端已接案，丞相随执行流推进合议：{taskSummary?.sourceLabel ?? 'UNKNOWN'}。</p>
            ) : (
              <p>待上书房或圣旨立案后，军机处接案并交由丞相路由参审。</p>
            )}
            <Link href="/court-briefing" className="mt-1.5 block rounded-lg border border-[#F0C66A]/30 bg-[#F0C66A]/8 px-3 py-2 text-center text-[11px] text-[#F0C66A]">
              回上书房
            </Link>
          </RailCard>

          {/* ④ 召集名单 */}
          <RailCard n="④" title="召集名单" demo={!hasTask || ministers.length === 0}>
            {ministers.length > 0 ? (
              <ul className="space-y-1">
                {ministers.map((item) => (
                  <li key={item.agentCode} className="flex items-center justify-between gap-2">
                    <span className="text-[#F5E9C9]">{item.name}</span>
                    <span className="text-[10px] text-[#7C86A6]">{item.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>待接案后显示六部、锦衣卫、钦天监或史馆参与状态。</p>
            )}
          </RailCard>

          {/* ⑤ 缺证队列 */}
          <RailCard n="⑤" title="缺证队列">
            <KV k="待补证据" v="0 项" />
            <p className="text-[10px] text-[#7C86A6]">缺证清单由后端质量门回写，当前无真实缺证回报。</p>
          </RailCard>

          {/* ⑥ 人工门 */}
          <RailCard n="⑥" title="人工门">
            <p>当前没有治理门、approval 或 OpenClaw 等待态。</p>
          </RailCard>

          {taskError && (
            <div className="rounded-lg border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-3 py-3 text-[11px] leading-5 text-[#F6A5B2]">
              案卷读取失败：{taskError}
            </div>
          )}
        </div>
      }
      center={
        <div className="flex h-full min-h-0 flex-col gap-3">
          {/* 卷轴区：scroll-paper */}
          <div className="scroll-frame min-h-0 flex-1">
            <div className="scroll-paper flex h-full min-h-0 flex-col">
              <header className="border-b px-5 pb-3 pt-4" style={{ borderColor: SCROLL_PAPER.hairline }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: SCROLL_PAPER.inkMuted }}>
                      JUNJICHU COMMAND · {hasTask ? '军机处案卷' : '待接案'}
                    </div>
                    <h2 className="mt-1 text-[26px] font-semibold leading-tight" style={{ fontFamily: 'var(--font-serif)', color: SCROLL_PAPER.ink }}>
                      奏折
                    </h2>
                    <div className="mt-1 text-[11px]" style={{ color: SCROLL_PAPER.inkSoft }}>
                      军机处 · 上书房式会审主卷
                    </div>
                  </div>
                  <Seal />
                </div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: SCROLL_PAPER.inkMuted }}>
                    建议
                  </div>
                  <p className="mt-1 text-[12.5px] leading-6" style={{ color: SCROLL_PAPER.inkSoft }}>
                    {councilSummary ??
                      '尚未接入真案。请回上书房下旨，或携 taskId 进入军机处'}
                  </p>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
                {taskId ? (
                  <BattleStream
                    taskId={taskId}
                    onMinistersChange={setMinisters}
                    onRisksChange={setRisks}
                    onGroupsChange={setGroups}
                    onCouncilSummaryChange={setCouncilSummary}
                    onMemorialChange={setMemorial}
                  />
                ) : (
                  <CaseStartForm
                    command={command}
                    onCommand={setCommand}
                    onStart={() => void handleStart()}
                    starting={starting}
                    error={startError}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 质量门阻断 */}
          <QualityGate hasTask={hasTask} />
          {/* 五键裁决 */}
          <VerdictRow />
        </div>
      }
      right={
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          {/* ① 军机处审出了什么 */}
          <RailCard n="①" title="军机处审出了什么">
            <MetricGrid ministers={ministers.length} groups={groups.length} risks={risks.length} />
          </RailCard>

          {/* ② 六部表态 */}
          <RailCard n="②" title="六部表态" demo={ministers.length === 0}>
            {ministers.length > 0 ? (
              <ul className="space-y-1.5">
                {ministers.map((item) => (
                  <li key={item.agentCode} className="text-[11px] leading-5">
                    <span className="text-[#F5E9C9]">{item.name} · {item.status}</span>
                    {item.opinion && <span className="text-[#8F98B8]">：{item.opinion}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>待接案后显示六部意见。</p>
            )}
          </RailCard>

          {/* ③ 冲突与风险 */}
          <RailCard n="③" title="冲突与风险" demo={risks.length === 0}>
            {risks.length > 0 ? (
              <ul className="space-y-1.5">
                {risks.map((item, index) => (
                  <li key={`${item.label}-${index}`} className="text-[11px] leading-5">
                    <span className="text-[#F6A5B2]">{item.label}</span>
                    {item.detail && <span className="text-[#8F98B8]">：{item.detail}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>暂无真实风险回写。</p>
            )}
          </RailCard>

          {/* ④ 蜂群产线 */}
          <RailCard n="④" title="蜂群产线" demo={groups.length === 0}>
            <p>{groups.length > 0 ? `${groups.length} 条产线在审` : '未启动'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <MiniCapsule disabled title="暂无蜂群产线 handler，需后端接入后启用">启动深审</MiniCapsule>
              <MiniCapsule disabled title="暂无 LIVE 蜂群回写">LIVE 蜂群</MiniCapsule>
            </div>
          </RailCard>

          {/* ⑤ 史馆飞轮 */}
          <RailCard n="⑤" title="史馆飞轮" demo={!memorial?.memorialId}>
            <KV k="归档" v={memorial?.memorialId ? '已归档' : '未归档'} mono={Boolean(memorial?.memorialId)} />
            <KV k="复盘" v="未接入" />
            <KV k="知识回流" v="未接入" />
            <MiniCapsule disabled title="搜相似旧案需史馆索引接入">搜相似旧案</MiniCapsule>
          </RailCard>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-[#8A7A52]">军机处 · JSON REST + 后端事件轮询</span>
          <div className="flex flex-wrap gap-2">
            <FooterCapsule icon={<ScrollText size={13} />} onClick={() => router.push('/court-briefing')}>展开辐政</FooterCapsule>
            <FooterCapsule icon={<ScrollText size={13} />} onClick={() => router.push('/court-briefing')}>发圣旨</FooterCapsule>
            <FooterCapsule icon={<FilePlus2 size={13} />} onClick={() => router.push('/command-center?view=cases')}>案卷立案</FooterCapsule>
            <FooterCapsule icon={<Users size={13} />} onClick={() => router.push('/command-center?view=council')}>召六部会审</FooterCapsule>
            <FooterCapsule icon={<Landmark size={13} />} disabled={!hasTask} onClick={() => router.push('/manors')}>庄园</FooterCapsule>
            <FooterCapsule icon={<Bot size={13} />} disabled title="暂无蜂群产线 handler，需后端接入后启用">派蜂群</FooterCapsule>
            <FooterCapsule
              icon={<Archive size={13} />}
              disabled={!hasTask}
              onClick={() => router.push(taskId ? `/archive?taskId=${encodeURIComponent(taskId)}` : '/archive')}
            >
              转史馆
            </FooterCapsule>
          </div>
        </div>
      }
    />
  );
}

function CaseStartForm({
  command,
  onCommand,
  onStart,
  starting,
  error,
}: {
  command: string;
  onCommand: (value: string) => void;
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  // 2026-07-23: 本表单现渲染在 EdictStage 的浅色宣纸内(见 edict-content.ts 顶部
  // "投进卷轴的组件必须用深墨色" 的红线注释),不能再用暗驾驶舱那套帝金/米色浅字,
  // 否则就是文档明确点名过的"浅字压浅纸不可读"那个坑——这里改用 SCROLL_PAPER 墨色。
  return (
    <div className="mx-auto flex min-h-[440px] max-w-[760px] flex-col justify-center">
      <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: SCROLL_PAPER.inkMuted }}>
        Backend Case Intake · 后端立案
      </div>
      <h2 className="mt-3 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-serif)', color: SCROLL_PAPER.ink }}>
        写一道要办的事
      </h2>
      <p className="mt-3 text-[13px] leading-7" style={{ color: SCROLL_PAPER.inkSoft }}>
        前端只提交原始旨意；领域识别、参审路由、任务创建与持久化由后端一次完成。
      </p>
      <textarea
        value={command}
        onChange={(event) => onCommand(event.target.value)}
        rows={6}
        placeholder="例：复核本季度预算与现金流风险，并给出责任人与下一步。"
        className="mt-6 w-full rounded-xl border px-4 py-3 text-[13px] leading-7 outline-none"
        style={{
          borderColor: SCROLL_PAPER.hairline,
          background: 'rgba(255,248,224,0.55)',
          color: SCROLL_PAPER.ink,
        }}
      />
      {error && (
        <div className="mt-3 text-[12px]" style={{ color: SCROLL_PAPER.tone.red.color }}>
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={starting || command.trim().length < 5}
        className={`mt-4 ${SCROLL_ACTION_CLASS}`}
      >
        {starting ? '后端立案中…' : '交后端立案'}
      </button>
    </div>
  );
}

/** 深色侧栏卡（rail-panel）：标题行 + 可选 DEMO 徽章 + 内容 */
function RailCard({
  n,
  title,
  demo,
  children,
}: {
  n: string;
  title: string;
  demo?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rail-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#F0C66A]/70">{n}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B6AB8C]">{title}</span>
        </div>
        {demo && (
          <span className="rounded border border-[#F0C66A]/40 bg-[#F0C66A]/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-[#F0C66A]">
            DEMO
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1.5 text-[11px] leading-5 text-[#C6CEE6]">{children}</div>
    </div>
  );
}

/** 键值行 */
function KV({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[10px] text-[#7C86A6]">{k}</span>
      <span className={`break-words text-right text-[11px] text-[#F5E9C9] ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );
}

/** 红色「奏」章 */
function Seal() {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border-2 leading-none"
      style={{ borderColor: '#b23a2e', color: '#b23a2e', background: 'rgba(150,40,32,0.10)', transform: 'rotate(-4deg)' }}
    >
      <span className="text-[22px] font-bold" style={{ fontFamily: 'var(--font-serif)' }}>奏</span>
    </div>
  );
}

/** 质量门阻断：真实任务未接入时如实标注演示态 */
function QualityGate({ hasTask }: { hasTask: boolean }) {
  return (
    <div className="rounded-xl border border-[#F43F5E]/25 bg-[#1A0E14]/75 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F6A5B2]">质量门阻断</div>
        {!hasTask && (
          <span className="rounded-full border border-[#F0C66A]/40 px-2 py-0.5 text-[9px] text-[#F0C66A]">DEMO</span>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#C6CEE6]">
        {hasTask ? '质量门状态由后端裁决责任徽驱动，接入真实任务后展示。' : '尚未接入真实任务 · 不可采纳'}
      </p>
    </div>
  );
}

/** 五键裁决：仅 UI。军机处当前无对应事件动作 handler，按钮统一禁用并在 title 说明，不新增 API 调用。 */
function VerdictRow() {
  const items: Array<[string, string]> = [
    ['采纳', '拟旨签发需后端裁决链接入'],
    ['补证', '需后端缺证清单接入'],
    ['复核', '需后端复核流接入'],
    ['驳回', '需后端裁决链接入'],
    ['追问', '需后端追问链接入'],
  ];
  return (
    <div className="rounded-xl border border-[#F0C66A]/20 bg-[#0A0E1C]/85 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F0C66A]/70">五键裁决</div>
      <div className="flex flex-wrap gap-2">
        {items.map(([label, hint]) => (
          <button
            key={label}
            type="button"
            disabled
            title={hint}
            className="rounded-full border border-[#F0C66A]/35 bg-[#F0C66A]/8 px-4 py-2 text-[12.5px] font-semibold text-[#F0C66A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 小号金色胶囊（侧栏卡内动作，多为占位） */
function MiniCapsule({ children, disabled = false, title }: { children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className="rounded-full border border-[#F0C66A]/35 bg-[#F0C66A]/8 px-3 py-1.5 text-[11px] font-semibold text-[#F0C66A] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 底部金边胶囊按钮 */
function FooterCapsule({
  children,
  onClick,
  disabled = false,
  title,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C66A]/45 bg-[#0B1020]/75 px-3.5 py-2 text-[12px] font-semibold text-[#F0C66A] transition hover:bg-[#F0C66A]/12 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {icon}
      {children}
    </button>
  );
}

/** 三计数格：大臣 / 蜂群 / 风险 */
function MetricGrid({ ministers, groups, risks }: { ministers: number; groups: number; risks: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {([['大臣', ministers], ['蜂群', groups], ['风险', risks]] as const).map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-3 text-center">
          <div className="text-[9px] text-[#7C86A6]">{label}</div>
          <div className="mt-1 text-[18px] font-semibold text-[#F5E9C9]">{value}</div>
        </div>
      ))}
    </div>
  );
}

type JunjichuView = 'command' | 'council' | 'cases';

function JunjichuTabs({ current }: { current: JunjichuView }) {
  return (
    <div className="flex flex-wrap gap-2">
      {([
        ['command', '作战沙盘', '/command-center'],
        ['council', '会审室', '/command-center?view=council'],
        ['cases', '案卷立案', '/command-center?view=cases'],
      ] as const).map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          className={`rounded-full border px-3 py-1.5 text-[11px] ${current === key ? 'border-[#F0C66A]/40 bg-[#F0C66A]/10 text-[#F0C66A]' : 'border-white/10 text-[#9FB0D6]'}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

function CouncilViewWithTabs() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 bg-[#040A10] px-5 py-2"><JunjichuTabs current="council" /></div>
      <div className="min-h-0 flex-1"><CouncilView /></div>
    </div>
  );
}

function CasesViewWithTabs() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 bg-[#040A10] px-5 py-2"><JunjichuTabs current="cases" /></div>
      <div className="min-h-0 flex-1"><CasesView /></div>
    </div>
  );
}

export default function CommandCenterPage() {
  return (
    <Suspense fallback={<main className="h-full bg-[#040A10]" />}>
      <CommandCenterInner />
    </Suspense>
  );
}
