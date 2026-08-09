'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileSearch, Gavel, XCircle } from 'lucide-react';

import { GlassPanel } from '@/components/ui/glass-panel';
import { api } from '@/lib/api';
import {
  availableDecisionActions,
  decisionPollingDisposition,
  type BusinessExceptionInput,
  type CourtDecisionAction,
  type QueuedDecisionData,
} from '@/lib/contracts/court-decision-command';

const ACTION_META = {
  APPROVE: { label: '准奏', Icon: CheckCircle2, danger: false },
  REQUEST_EVIDENCE: { label: '补证', Icon: FileSearch, danger: false },
  REJECT: { label: '驳回', Icon: XCircle, danger: true },
} as const;

interface Props {
  runId: string;
  status: string;
  permittedActions: readonly string[];
  onPoll: () => void | Promise<unknown>;
}

export function CourtDecisionCommandPanel({
  runId,
  status,
  permittedActions,
  onPoll,
}: Props) {
  const actions = useMemo(
    () => availableDecisionActions(status, permittedActions),
    [permittedActions, status],
  );
  const [reason, setReason] = useState('');
  const [hasBusinessException, setHasBusinessException] = useState(false);
  const [businessException, setBusinessException] = useState<BusinessExceptionInput>({
    reason: '',
    risk_exposure: '',
    owner: '',
    remediation: '',
    review_date: '',
  });
  const [submitting, setSubmitting] = useState<CourtDecisionAction | null>(null);
  const [queued, setQueued] = useState<QueuedDecisionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollStopped, setPollStopped] = useState(false);
  const attemptKeys = useRef(new Map<string, string>());
  const pollAttempts = useRef(0);

  useEffect(() => {
    if (
      !queued
      || pollStopped
      || decisionPollingDisposition(status, pollAttempts.current) !== 'POLL'
    ) return;
    let active = true;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      pollAttempts.current += 1;
      try {
        await onPoll();
        if (
          active
          && decisionPollingDisposition(status, pollAttempts.current)
            === 'STOP_ATTEMPT_LIMIT'
        ) {
          setPollStopped(true);
        }
      } catch {
        if (active) {
          setError('自动刷新失败，已停止轮询；请稍后手动刷新页面核查。');
          setPollStopped(true);
        }
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [onPoll, pollStopped, queued, status]);

  if (actions.length === 0 && !queued) return null;

  async function submit(action: CourtDecisionAction) {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError('请先填写裁决理由。');
      return;
    }
    const exception = action === 'APPROVE' && hasBusinessException
      ? Object.fromEntries(
          Object.entries(businessException).map(([key, value]) => [key, value.trim()]),
        ) as BusinessExceptionInput
      : undefined;
    if (exception && Object.values(exception).some((value) => !value)) {
      setError('商业例外的原因、风险敞口、责任人、补救措施与复核日期必须完整。');
      return;
    }

    const attempt = `${action}\u0000${normalizedReason}\u0000${JSON.stringify(exception ?? null)}`;
    const idempotencyKey = attemptKeys.current.get(attempt) ?? crypto.randomUUID();
    attemptKeys.current.set(attempt, idempotencyKey);
    setSubmitting(action);
    setError(null);
    try {
      const result = await api.post<QueuedDecisionData>(
        `/api/court/shangshufang/kernel/runs/${encodeURIComponent(runId)}/decision-command`,
        {
          action,
          reason: normalizedReason,
          idempotency_key: idempotencyKey,
          ...(exception ? { business_exception: exception } : {}),
        },
      );
      pollAttempts.current = 0;
      setPollStopped(false);
      setQueued(result);
    } catch {
      setError('裁决未入队。案件可能已更新，请刷新回奏后重试。');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <GlassPanel padding="md" variant="gold" hudCorners glow>
      <div className="flex items-start gap-3">
        <Gavel aria-hidden className="mt-0.5 h-5 w-5 text-[#F0C66A]" />
        <div className="min-w-0 flex-1">
          <div className="page-eyebrow">御前裁决</div>
          <p className="body-copy mt-1">
            回奏仍处于待裁状态。提交后只表示裁决已进入执行队列，须待后端状态推进后才算生效。
          </p>
        </div>
      </div>

      {queued ? (
        <div
          className="mt-4 rounded border border-[#F0C66A]/30 bg-[#F0C66A]/[0.06] px-4 py-3"
          data-testid="court-decision-queued"
          role="status"
        >
          {decisionPollingDisposition(status, pollAttempts.current) === 'DONE' ? (
            <div className="text-sm text-[#9ED6B8]">
              后端状态已推进为 {status}，自动刷新已停止；请以最新回奏为准。
            </div>
          ) : pollStopped ? (
            <div className="text-sm text-[#E8D39B]">
              {error ?? '裁决仍在等待内核确认，自动刷新已到安全上限；请稍后手动刷新页面核查。'}
            </div>
          ) : (
            <>
              <div className="text-sm text-[#E8D39B]">裁决已入队，正在等待朝堂内核确认。</div>
              <div className="page-meta mt-1">队列凭据：{queued.outbox_id}</div>
            </>
          )}
        </div>
      ) : (
        <>
          <label className="mt-4 block">
            <span className="section-eyebrow">裁决理由</span>
            <textarea
              data-testid="court-decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-2 w-full resize-y rounded border border-[#8A6A2A]/40 bg-[#080B14]/80 px-3 py-2 text-sm leading-6 text-[#EAEEFB] outline-none transition focus:border-[#F0C66A]/70"
              placeholder="说明准奏、补证或驳回的依据"
            />
          </label>

          {actions.includes('APPROVE') && (
            <div className="mt-3 rounded border border-[#8A6A2A]/35 bg-[#080B14]/55 p-3">
              <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-[#D7C8A0]">
                <input
                  data-testid="court-decision-exception-confirm"
                  type="checkbox"
                  checked={hasBusinessException}
                  onChange={(event) => setHasBusinessException(event.target.checked)}
                  className="mt-1 accent-[#D4A84B]"
                />
                本次准奏需要突破报价利润底线，登记商业例外并接受受保护的二阶段复核。
              </label>
              {hasBusinessException && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="court-business-exception-fields">
                  {([
                    ['reason', '例外原因', '说明为何仍需进入正式报价'],
                    ['risk_exposure', '金额或风险敞口', '例如：预计毛利损失 20 万元'],
                    ['owner', '责任人', '填写负责补救与跟踪的人员'],
                    ['remediation', '补救措施', '填写可验证的止损与补救动作'],
                  ] as const).map(([field, label, placeholder]) => (
                    <label key={field} className={field === 'remediation' ? 'sm:col-span-2' : ''}>
                      <span className="section-eyebrow">{label}</span>
                      <input
                        data-testid={`court-business-exception-${field}`}
                        value={businessException[field]}
                        onChange={(event) => setBusinessException((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))}
                        maxLength={field === 'owner' ? 200 : field === 'remediation' ? 2000 : 1000}
                        className="mt-1.5 w-full rounded border border-[#8A6A2A]/40 bg-[#080B14]/80 px-3 py-2 text-xs text-[#EAEEFB] outline-none focus:border-[#F0C66A]/70"
                        placeholder={placeholder}
                      />
                    </label>
                  ))}
                  <label>
                    <span className="section-eyebrow">复核日期</span>
                    <input
                      data-testid="court-business-exception-review_date"
                      type="date"
                      value={businessException.review_date}
                      onChange={(event) => setBusinessException((current) => ({
                        ...current,
                        review_date: event.target.value,
                      }))}
                      className="mt-1.5 w-full rounded border border-[#8A6A2A]/40 bg-[#080B14]/80 px-3 py-2 text-xs text-[#EAEEFB] outline-none focus:border-[#F0C66A]/70"
                    />
                  </label>
                  <p className="page-meta self-end pb-2">
                    最终批准人由服务端从当前已认证决策人写入，页面不能代填。
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-[#F58A9A]" role="alert">{error}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((action) => {
              const { label, Icon, danger } = ACTION_META[action];
              const busy = submitting === action;
              return (
                <button
                  key={action}
                  type="button"
                  data-testid={`court-decision-${action.toLowerCase()}`}
                  disabled={submitting !== null}
                  onClick={() => void submit(action)}
                  className="inline-flex items-center gap-1.5 rounded border px-3 py-2 text-xs transition disabled:cursor-wait disabled:opacity-50"
                  style={{
                    borderColor: danger ? 'rgba(244,63,94,.42)' : 'rgba(240,198,106,.35)',
                    color: danger ? '#F58A9A' : '#E8D39B',
                    background: danger ? 'rgba(244,63,94,.06)' : 'rgba(240,198,106,.06)',
                  }}
                >
                  <Icon aria-hidden className="h-3.5 w-3.5" />
                  {busy ? '入队中…' : label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </GlassPanel>
  );
}
