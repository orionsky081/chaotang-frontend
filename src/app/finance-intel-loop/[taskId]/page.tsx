'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { withBasePath } from '@/lib/base-path';
import { apiGateway } from '@/lib/api/gateway';

type BudgetLineItem = {
  id?: string;
  category?: string;
  title?: string;
  amount?: number;
  currency?: string;
  evidenceRefs?: string[];
  confidence?: string;
};

type LoopCase = {
  taskId: string;
  stage: string;
  issue?: { id?: string; title?: string; question?: string; ticker?: string; market?: string; intent?: string } | null;
  evidencePacks?: Array<{ id: string; pack: Record<string, unknown> }>;
  memorials?: Array<{ id: string; memorial: Record<string, unknown> }>;
  decisionBrief?: { id: string; status: string; brief: Record<string, unknown> } | null;
  instruction?: { id: string; status: string; instruction: Record<string, unknown> } | null;
  executionRuns?: Array<{ id: string; status: string; result: Record<string, unknown> }>;
  returnReports?: Array<{ executionRunId: string; result: Record<string, unknown> }>;
  archives?: Array<{ id: string; archive: Record<string, unknown> }>;
  sourceUrls?: string[];
};

const FLOW = [
  { key: 'issue_created', label: '立案', icon: FileText },
  { key: 'evidence_ready', label: '采证', icon: ShieldCheck },
  { key: 'memorial_ready', label: '户部奏折', icon: WalletCards },
  { key: 'awaiting_authorized_decision', label: '授权裁决', icon: CheckCircle2 },
  { key: 'needs_evidence', label: '补证', icon: AlertTriangle },
  { key: 'return_report_ready', label: '复命', icon: CircleDashed },
  { key: 'archived', label: '归档', icon: CheckCircle2 },
] as const;

const STAGE_ORDER: readonly string[] = FLOW.map((item) => item.key);

async function fetchCase(path: string): Promise<LoopCase> {
  const payload = await apiGateway.get<{ success?: boolean; data?: LoopCase; error?: string }>(path, {
    headers: { 'Cache-Control': 'no-store' },
  });
  if (payload?.success !== true || !payload.data) {
    throw new Error(payload?.error ?? 'request_failed');
  }
  return payload.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function lineItemsFrom(value: unknown): BudgetLineItem[] {
  return Array.isArray(value) ? value.filter(isRecord).map((item) => item as BudgetLineItem) : [];
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stageDoneIndex(stage: string): number {
  if (stage === 'awaiting_authorized_decision') return STAGE_ORDER.indexOf('memorial_ready');
  if (stage === 'needs_evidence' || stage === 'review_requested' || stage === 'rejected') {
    return STAGE_ORDER.indexOf('needs_evidence');
  }
  return STAGE_ORDER.indexOf(stage);
}

function firstBudgetRecord(data: LoopCase): Record<string, unknown> {
  const brief = data.decisionBrief?.brief ?? {};
  if (brief.budgetKind === 'research_department_budget') return brief;
  const memorial = data.memorials?.find((item) => item.memorial.budgetKind === 'research_department_budget')?.memorial;
  if (memorial) return memorial;
  const pack = data.evidencePacks?.find((item) => item.pack.packType === 'internal_research_budget')?.pack;
  return pack ?? {};
}

export default function FinanceIntelLoopCasePage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const { data, error, isLoading, mutate } = useSWR(
    `/api/court/shangshufang/finance-intel-loop/cases/${encodeURIComponent(taskId)}`,
    fetchCase,
  );
  const [reason, setReason] = useState('I have reviewed the evidence boundary and accept the audit record.');
  const [manualConfirmation, setManualConfirmation] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const stageIndex = data ? Math.max(0, stageDoneIndex(data.stage)) : -1;
  const budget = useMemo(() => (data ? firstBudgetRecord(data) : {}), [data]);
  const lineItems = lineItemsFrom(budget.lineItems);
  const missingEvidence = stringArray(budget.missingEvidence)
    .concat(stringArray(isRecord(budget.evidenceSummary) ? budget.evidenceSummary.missingEvidence : undefined));
  const uniqueMissingEvidence = Array.from(new Set(missingEvidence));
  const completeness = numberValue(budget.evidenceCompleteness)
    ?? numberValue(isRecord(budget.evidenceSummary) ? budget.evidenceSummary.evidenceCompleteness : null);
  const riskGate = isRecord(budget.riskGate) ? budget.riskGate : {};
  const requiresManualConfirmation = riskGate.manualConfirmationRequired === true;
  const isAwaitingDecision = data?.stage === 'awaiting_authorized_decision' && data.decisionBrief?.id;

  async function submitDecision(decision: string) {
    if (!data?.decisionBrief?.id) return;
    setDecisionBusy(decision);
    setDecisionError(null);
    try {
      const payload = await apiGateway.post<{ success?: boolean; error?: string; data?: unknown }>(`/api/court/shangshufang/briefs/${encodeURIComponent(data.decisionBrief.id)}/decision/advance`, {
        decision,
        reason,
        executionType: 'no_action_archive',
        manualConfirmation,
      });
      if (payload?.success !== true) {
        throw new Error(payload?.error ?? '决策推进失败');
      }
      await mutate();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'decision_failed');
    } finally {
      setDecisionBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] px-4 py-6 text-[#EAEEFB] md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#F0C66A]/16 pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F0C66A]">Hu Bu Decision Case</div>
            <h1 className="mt-2 text-2xl font-semibold text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>
              上书房 / 锦衣卫 / 户部案件链
            </h1>
            <p className="mt-1 text-sm text-[#9A9278]">task={taskId}</p>
          </div>
          <div className="flex gap-2">
            <Link href={withBasePath('/court-briefing')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#D8D0B8] hover:bg-white/[0.04]">
              回上书房
            </Link>
            <Link href={withBasePath('/departments/finance?newBudget=1')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#D8D0B8] hover:bg-white/[0.04]">
              新建研发预算
            </Link>
            <button
              type="button"
              onClick={() => void mutate()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#F0C66A]/28 bg-[#F0C66A]/10 px-3 py-2 text-xs font-semibold text-[#F5E9C9]"
            >
              <RefreshCw size={13} />
              刷新
            </button>
          </div>
        </header>

        {isLoading && <StateBox text="案件链加载中" />}
        {error && <StateBox text={`加载失败：${error.message}`} danger />}

        {data && (
          <>
            <section className="grid gap-2 md:grid-cols-6" data-testid="finance-loop-case-timeline">
              {FLOW.map((step, index) => {
                const Icon = step.icon;
                const done = index <= stageIndex;
                return (
                  <div
                    key={step.key}
                    className="min-h-[86px] rounded-lg border px-3 py-3"
                    style={{
                      borderColor: done ? 'rgba(61,214,140,0.28)' : 'rgba(255,255,255,0.08)',
                      background: done ? 'rgba(61,214,140,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Icon size={16} color={done ? '#3DD68C' : '#6C728A'} />
                    <div className="mt-3 text-[12px] font-semibold text-[#F5E9C9]">{step.label}</div>
                    <div className="mt-1 text-[10px] text-[#8F8871]">{done ? '已完成' : '待推进'}</div>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Panel title="案件摘要">
                <Info label="阶段" value={data.stage} />
                <Info label="议题" value={data.issue?.title ?? data.issue?.question ?? '未登记'} />
                <Info label="标的" value={[data.issue?.ticker, data.issue?.market].filter(Boolean).join(' / ') || '内部预算'} />
                <Info label="证据包" value={`${data.evidencePacks?.length ?? 0} 个`} />
                <Info label="户部奏折" value={`${data.memorials?.length ?? 0} 份`} />
                <Info label="裁决 brief" value={data.decisionBrief?.id ?? '未生成'} />
              </Panel>

              <Panel title="证据边界">
                <Info label="证据完整度" value={completeness == null ? '未登记' : `${completeness}%`} />
                <Info label="人工确认" value={requiresManualConfirmation ? '必须' : '未触发'} />
                <Info label="来源模式" value={String(budget.evidenceMode ?? budget.sourceLabel ?? '未登记')} />
                {uniqueMissingEvidence.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-[#FFB86B]/25 bg-[#FFB86B]/10 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#FFD39B]">
                      <AlertTriangle size={14} />
                      缺证清单
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-[#E8D8B8]">
                      {uniqueMissingEvidence.map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#9A9278]">未发现阻塞性缺证。</p>
                )}
              </Panel>
            </section>

            {lineItems.length > 0 && (
              <Panel title="研发预算明细">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="text-[#8F8871]">
                      <tr className="border-b border-white/[0.08]">
                        <th className="py-2 pr-3">项目</th>
                        <th className="py-2 pr-3">类别</th>
                        <th className="py-2 pr-3">金额</th>
                        <th className="py-2 pr-3">置信度</th>
                        <th className="py-2">证据</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={item.id ?? index} className="border-b border-white/[0.05] last:border-b-0">
                          <td className="py-2 pr-3 text-[#F5E9C9]">{item.title ?? item.id ?? `line ${index + 1}`}</td>
                          <td className="py-2 pr-3 text-[#C8CDD8]">{item.category ?? 'other'}</td>
                          <td className="py-2 pr-3 text-[#EAEEFB]">{item.currency ?? 'CNY'} {Number(item.amount ?? 0).toLocaleString('en-US')}</td>
                          <td className="py-2 pr-3 text-[#C8CDD8]">{item.confidence ?? 'low'}</td>
                          <td className="py-2 text-[#C8CDD8]">{(item.evidenceRefs ?? []).join(', ') || '缺证'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {isAwaitingDecision && (
              <Panel title="户部真实裁决">
                <p className="text-sm leading-6 text-[#C8CDD8]">
                  所有按钮都会写入后端裁决记录。缺证时“准奏”会被服务端拒绝；超阈值预算需要勾选人工确认，并且仍要求服务端授权身份。
                </p>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-3 min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#EAEEFB] outline-none focus:border-[#F0C66A]/40"
                />
                {requiresManualConfirmation && (
                  <label className="mt-3 flex items-start gap-2 text-xs text-[#D8D0B8]">
                    <input
                      type="checkbox"
                      checked={manualConfirmation}
                      onChange={(event) => setManualConfirmation(event.target.checked)}
                      className="mt-0.5"
                    />
                    我确认该预算超过阈值，已完成线下人工复核；本次只写裁决记录，不执行付款或对外承诺。
                  </label>
                )}
                {decisionError && <StateBox text={`裁决失败：${decisionError}`} danger />}
                <div className="mt-4 flex flex-wrap gap-2">
                  <DecisionButton label="准奏" busy={decisionBusy === 'issue_decree'} onClick={() => void submitDecision('issue_decree')} tone="gold" />
                  <DecisionButton label="补证" busy={decisionBusy === 'request_more_evidence'} onClick={() => void submitDecision('request_more_evidence')} />
                  <DecisionButton label="复核" busy={decisionBusy === 'request_review'} onClick={() => void submitDecision('request_review')} />
                  <DecisionButton label="驳回" busy={decisionBusy === 'reject'} onClick={() => void submitDecision('reject')} tone="red" />
                </div>
              </Panel>
            )}

            <section className="grid gap-4 lg:grid-cols-3">
              <JsonPanel title="锦衣卫证据" value={data.evidencePacks?.[0]?.pack ?? {}} />
              <JsonPanel title="户部奏折" value={data.memorials?.[0]?.memorial ?? {}} />
              <JsonPanel title="裁决与复命" value={{ brief: data.decisionBrief, instruction: data.instruction, returnReports: data.returnReports }} />
            </section>

            <Panel title="来源链接">
              {(data.sourceUrls ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(data.sourceUrls ?? []).map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-xs text-[#BFD7FF] hover:text-[#EAF2FF]">
                      <ExternalLink size={12} />
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#9A9278]">内部预算证据可能来自台账或上传文件，没有公共 URL；这不会被标为 LIVE。</p>
              )}
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#F0C66A]/16 bg-white/[0.035] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="mb-3 text-[12px] font-semibold text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>{title}</div>
      {children}
    </section>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <Panel title={title}>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[#C8CDD8]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </Panel>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0">
      <span className="text-xs text-[#8F8871]">{label}</span>
      <span className="text-right text-sm text-[#EAEEFB]">{value}</span>
    </div>
  );
}

function DecisionButton({
  label,
  busy,
  onClick,
  tone = 'default',
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  tone?: 'default' | 'gold' | 'red';
}) {
  const className = tone === 'gold'
    ? 'border-[#F0C66A]/35 bg-[#F0C66A]/14 text-[#F5E9C9]'
    : tone === 'red'
      ? 'border-[#FF7A7A]/30 bg-[#FF7A7A]/10 text-[#FFD0D0]'
      : 'border-white/10 bg-white/[0.04] text-[#D8D0B8]';
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? '提交中...' : label}
    </button>
  );
}

function StateBox({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: danger ? 'rgba(255,122,122,0.28)' : 'rgba(240,198,106,0.18)' }}>
      {text}
    </div>
  );
}
