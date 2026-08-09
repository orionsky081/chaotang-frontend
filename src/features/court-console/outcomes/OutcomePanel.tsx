'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Scale, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';

import { GlassPanel } from '@/components/GlassPanel';
import { api } from '@/lib/api';
import { pollUntilTerminal } from '@/lib/api/rest-polling';
import {
  COURT_OUTCOME_METRICS,
  MAX_OUTCOME_POLL_ATTEMPTS,
  outcomeRequestIsTerminal,
  type CourtOutcomeMetric,
  type OutcomeRequestStatus,
  type QueuedOutcomeData,
  type RunOutcomeMetricProjection,
  ZOutcomeRequestStatus,
  ZQueuedOutcomeData,
  ZRunOutcomeProjection,
} from '@/lib/contracts/court-outcome';

const METRIC_LABELS: Readonly<Record<CourtOutcomeMetric, string>> = Object.freeze({
  gross_margin: '毛利',
  delivery_days: '交付',
  payment_days: '回款',
});

interface Props {
  runId: string;
}

function outcomePath(runId: string): string {
  return `/api/court/shangshufang/kernel/runs/${encodeURIComponent(runId)}/outcomes`;
}

async function loadProjection(path: string) {
  return ZRunOutcomeProjection.parse(await api.get<unknown>(path));
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value);
}

function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function MetricCard({ metric }: { metric: RunOutcomeMetricProjection }) {
  const recorded = metric.status === 'RECORDED';
  return (
    <article
      className="rounded border border-[#8A6A2A]/30 bg-[#070A12]/65 p-4"
      data-testid={`outcome-metric-${metric.metric}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="section-eyebrow">{METRIC_LABELS[metric.metric]}</div>
          <div className="mt-1 text-xl font-semibold text-[#EEE2BD]">
            {formatNumber(metric.expected_value)}
            <span className="ml-1 text-xs font-normal text-[#9E957E]">{metric.metric_unit}</span>
          </div>
          <div className="page-meta mt-1">封印预期</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
            recorded
              ? 'border-[#5FA37B]/35 bg-[#5FA37B]/[0.08] text-[#9ED6B8]'
              : 'border-[#D4A84B]/35 bg-[#D4A84B]/[0.08] text-[#E8D39B]'
          }`}
        >
          {recorded
            ? <CheckCircle2 aria-hidden className="h-3 w-3" />
            : <Clock3 aria-hidden className="h-3 w-3" />}
          {recorded ? '已记录' : '待观察'}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        <div>
          <dt className="text-[#807A69]">观察窗</dt>
          <dd className="mt-0.5 break-all text-[#BDB39A]">{metric.observation_window}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[#807A69]">实际值</dt>
            <dd className="mt-0.5 text-[#D7C8A0]">
              {formatNumber(metric.actual_value)} {recorded ? metric.metric_unit : ''}
            </dd>
          </div>
          <div>
            <dt className="text-[#807A69]">有符号偏差</dt>
            <dd
              className={`mt-0.5 ${recorded ? 'text-[#EAEEFB]' : 'text-[#8F8773]'}`}
              data-testid={`outcome-delta-${metric.metric}`}
            >
              {formatDelta(metric.signed_delta)} {recorded ? metric.metric_unit : ''}
            </dd>
          </div>
        </div>
        {metric.observation_ref && (
          <div>
            <dt className="text-[#807A69]">证据引用</dt>
            <dd className="mt-0.5 break-all font-mono text-[#8FB7D8]">
              {metric.observation_ref}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function OutcomePanel({ runId }: Props) {
  const path = outcomePath(runId);
  const { data, error: projectionError, isLoading, mutate } = useSWR(
    path,
    loadProjection,
    { revalidateOnFocus: false },
  );
  const pendingMetrics = useMemo(
    () => data?.metrics.filter((metric) => metric.status === 'PENDING') ?? [],
    [data],
  );
  const [metric, setMetric] = useState<CourtOutcomeMetric>('gross_margin');
  const [sourceArtifactId, setSourceArtifactId] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState<QueuedOutcomeData | null>(null);
  const [requestStatus, setRequestStatus] = useState<OutcomeRequestStatus | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const attemptKey = useRef<string | null>(null);
  const pollController = useRef<AbortController | null>(null);

  useEffect(() => () => pollController.current?.abort(), []);

  useEffect(() => {
    if (pendingMetrics.length === 0) return;
    if (!pendingMetrics.some((entry) => entry.metric === metric)) {
      setMetric(pendingMetrics[0].metric);
      attemptKey.current = null;
    }
  }, [metric, pendingMetrics]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedValue = Number(actualValue);
    const parsedObservedAt = new Date(observedAt);
    if (!Number.isFinite(parsedValue) || Number.isNaN(parsedObservedAt.valueOf())) {
      setSubmitError('请填写有效的实测值与观察时间。');
      return;
    }

    pollController.current?.abort();
    const controller = new AbortController();
    pollController.current = controller;
    const idempotencyKey = attemptKey.current ?? `outcome:${crypto.randomUUID()}`;
    attemptKey.current = idempotencyKey;
    setSubmitting(true);
    setSubmitError(null);
    setRequestStatus(null);

    try {
      const result = ZQueuedOutcomeData.parse(await api.post<unknown>(path, {
        source_artifact_id: sourceArtifactId.trim(),
        metric,
        actual_value: parsedValue,
        observed_at: parsedObservedAt.toISOString(),
        idempotency_key: idempotencyKey,
      }));
      setQueued(result);

      const terminal = await pollUntilTerminal({
        load: async () => ZOutcomeRequestStatus.parse(await api.get<unknown>(
          `${path}/requests/${encodeURIComponent(result.outbox_id)}`,
        )),
        isTerminal: outcomeRequestIsTerminal,
        onUpdate: setRequestStatus,
        signal: controller.signal,
        maxAttempts: MAX_OUTCOME_POLL_ATTEMPTS,
        initialDelayMs: 500,
        maxDelayMs: 2_000,
      });

      if (terminal.status === 'COMPLETED') {
        await mutate();
        attemptKey.current = null;
        setSourceArtifactId('');
        setActualValue('');
        setObservedAt('');
      } else if (terminal.status === 'RECONCILIATION_REQUIRED') {
        setSubmitError('结果需要人工对账，系统没有把它冒充为已记录。');
      } else {
        setSubmitError('结果验证失败，封印基线没有被改写。');
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setSubmitError(
        cause instanceof Error && cause.message.startsWith('polling_exhausted')
          ? '等待验证已到安全上限，请稍后刷新核查请求状态。'
          : '结果未完成验证；请核对来源凭据、观察窗与实测值。',
      );
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return (
    <GlassPanel padding="md" variant="gold" hudCorners>
      <section data-testid="outcome-panel">
        <div className="flex items-start gap-3">
          <Scale aria-hidden className="mt-0.5 h-5 w-5 text-[#F0C66A]" />
          <div className="min-w-0 flex-1">
            <div className="page-eyebrow">结果偏差 · 封印基线</div>
            <p className="body-copy mt-1">
              只比较归档时已签封的预测与独立来源实测；待观察不是成功，入队也不是已验证。
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-xs text-[#B6AB8C]" role="status">
            <Activity aria-hidden className="h-4 w-4 animate-pulse" />
            正在读取封印基线…
          </div>
        )}

        {projectionError && !data && (
          <div
            className="mt-4 rounded border border-[#8A6A2A]/25 bg-[#8A6A2A]/[0.05] px-4 py-3 text-xs leading-6 text-[#B6AB8C]"
            role="status"
          >
            尚未取得可核验的封印基线。案件完成签封前，页面不会临时生成预测或偏差。
          </div>
        )}

        {data && (
          <>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-y border-[#8A6A2A]/20 py-2 text-[10px] text-[#817965]">
              <span>归档：<span className="font-mono text-[#A69B7C]">{data.sealed_archive_id.slice(0, 12)}…</span></span>
              <span>链：<span className="font-mono text-[#A69B7C]">{data.sealed_chain_hash.slice(0, 12)}…</span></span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {data.metrics.map((entry) => (
                <MetricCard key={entry.prediction_id} metric={entry} />
              ))}
            </div>

            {pendingMetrics.length > 0 ? (
              <form
                className="mt-4 rounded border border-[#8A6A2A]/30 bg-[#0A0D16]/70 p-4"
                data-testid="outcome-form"
                onSubmit={(event) => void submit(event)}
              >
                <div className="flex items-start gap-2">
                  <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 text-[#D4A84B]" />
                  <div>
                    <div className="section-title">回填独立实测</div>
                    <p className="page-meta mt-1">
                      来源凭据将由后端重新核验；浏览器不能声明租户、验证人、运行或签名。
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-xs text-[#B6AB8C]">
                    指标
                    <select
                      className="mt-1 w-full rounded border border-[#6F6650]/45 bg-[#070A12] px-3 py-2 text-[#E5D7AD] outline-none focus:border-[#D4A84B]/70"
                      data-testid="outcome-metric-select"
                      disabled={submitting}
                      value={metric}
                      onChange={(event) => {
                        setMetric(event.target.value as CourtOutcomeMetric);
                        attemptKey.current = null;
                      }}
                    >
                      {COURT_OUTCOME_METRICS.filter((name) => (
                        pendingMetrics.some((entry) => entry.metric === name)
                      )).map((name) => (
                        <option key={name} value={name}>{METRIC_LABELS[name]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-[#B6AB8C] md:col-span-1 xl:col-span-1">
                    来源凭据 ID
                    <input
                      required
                      className="mt-1 w-full rounded border border-[#6F6650]/45 bg-[#070A12] px-3 py-2 text-[#EAEEFB] outline-none focus:border-[#D4A84B]/70"
                      data-testid="outcome-source-artifact"
                      disabled={submitting}
                      maxLength={240}
                      placeholder="artifact://erp/..."
                      value={sourceArtifactId}
                      onChange={(event) => setSourceArtifactId(event.target.value)}
                    />
                  </label>
                  <label className="text-xs text-[#B6AB8C]">
                    实测值
                    <input
                      required
                      type="number"
                      step="any"
                      className="mt-1 w-full rounded border border-[#6F6650]/45 bg-[#070A12] px-3 py-2 text-[#EAEEFB] outline-none focus:border-[#D4A84B]/70"
                      data-testid="outcome-actual-value"
                      disabled={submitting}
                      value={actualValue}
                      onChange={(event) => setActualValue(event.target.value)}
                    />
                  </label>
                  <label className="text-xs text-[#B6AB8C]">
                    观察时间
                    <input
                      required
                      type="datetime-local"
                      className="mt-1 w-full rounded border border-[#6F6650]/45 bg-[#070A12] px-3 py-2 text-[#EAEEFB] outline-none focus:border-[#D4A84B]/70"
                      data-testid="outcome-observed-at"
                      disabled={submitting}
                      value={observedAt}
                      onChange={(event) => setObservedAt(event.target.value)}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    data-testid="outcome-submit"
                    disabled={submitting}
                    className="rounded border border-[#F0C66A]/40 bg-[#F0C66A]/[0.08] px-4 py-2 text-xs text-[#E8D39B] transition hover:bg-[#F0C66A]/[0.13] disabled:cursor-wait disabled:opacity-50"
                  >
                    {submitting ? '验证中…' : '提交实测并核验'}
                  </button>
                  {queued && (
                    <span className="page-meta" data-testid="outcome-request-status" role="status">
                      请求 {queued.outbox_id} · {requestStatus?.status ?? queued.status}
                    </span>
                  )}
                  {submitError && <span className="text-xs text-[#F58A9A]" role="alert">{submitError}</span>}
                </div>
              </form>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-[#9ED6B8]">
                <CheckCircle2 aria-hidden className="h-4 w-4" />
                三项封印基线均已取得独立实测记录。
              </div>
            )}
          </>
        )}
      </section>
    </GlassPanel>
  );
}
