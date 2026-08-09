'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, CheckCircle2, ShieldCheck } from 'lucide-react';

import { GlassPanel } from '@/components/GlassPanel';
import { api } from '@/lib/api';
import {
  archiveCommandAvailable,
  archivePollingDisposition,
  type QueuedArchiveData,
} from '@/lib/contracts/court-command';

interface Props {
  runId: string;
  status: string;
  permittedActions: readonly string[];
  onPoll: () => void | Promise<unknown>;
}

export function CourtArchiveCommandPanel({
  runId,
  status,
  permittedActions,
  onPoll,
}: Props) {
  const available = archiveCommandAvailable(status, permittedActions);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState<QueuedArchiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollStopped, setPollStopped] = useState(false);
  const attemptKey = useRef<string | null>(null);
  const pollAttempts = useRef(0);

  useEffect(() => {
    if (
      !queued
      || pollStopped
      || archivePollingDisposition(status, pollAttempts.current) !== 'POLL'
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
          && archivePollingDisposition(status, pollAttempts.current)
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

  if (!available && !queued) return null;

  async function submit() {
    const idempotencyKey = attemptKey.current ?? crypto.randomUUID();
    attemptKey.current = idempotencyKey;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<QueuedArchiveData>(
        `/api/court/shangshufang/kernel/runs/${encodeURIComponent(runId)}/archive-command`,
        { idempotency_key: idempotencyKey },
      );
      pollAttempts.current = 0;
      setPollStopped(false);
      setQueued(result);
      setConfirmationOpen(false);
    } catch {
      setError('签封归档未入队。案件可能已更新，请刷新回奏后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassPanel padding="md" variant="gold" hudCorners glow>
      <div className="flex items-start gap-3">
        <Archive aria-hidden className="mt-0.5 h-5 w-5 text-[#F0C66A]" />
        <div className="min-w-0 flex-1">
          <div className="page-eyebrow">史馆签封</div>
          <p className="body-copy mt-1">
            裁决已经生效，现可将本案的回奏、证据与裁决链签封归档。入队不等于归档完成，页面将持续等候后端状态推进。
          </p>
        </div>
      </div>

      {queued ? (
        <div
          className="mt-4 rounded border border-[#F0C66A]/30 bg-[#F0C66A]/[0.06] px-4 py-3"
          data-testid="court-archive-status"
          role="status"
        >
          {status === 'ARCHIVED' ? (
            <div className="flex items-center gap-2 text-sm text-[#9ED6B8]">
              <CheckCircle2 aria-hidden className="h-4 w-4" />
              已完成签封归档，史馆已接收不可变归档记录。
            </div>
          ) : archivePollingDisposition(status, pollAttempts.current)
              === 'STOP_STATUS_DRIFT' ? (
            <div className="text-sm text-[#F58A9A]">
              归档尚未完成，后端状态已变为 {status}；自动刷新已停止，请返回任务核查。
            </div>
          ) : pollStopped ? (
            <div className="text-sm text-[#E8D39B]">
              {error ?? '归档仍在等待后端确认，自动刷新已到安全上限；请稍后手动刷新页面核查。'}
            </div>
          ) : (
            <>
              <div className="text-sm text-[#E8D39B]">签封归档已入队，正在等待史馆确认。</div>
              <div className="page-meta mt-1">队列凭据：{queued.outbox_id}</div>
            </>
          )}
        </div>
      ) : confirmationOpen ? (
        <div
          className="mt-4 rounded border border-[#F0C66A]/35 bg-[#080B14]/70 px-4 py-3"
          data-testid="court-archive-confirmation"
        >
          <div className="flex items-start gap-2">
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 text-[#F0C66A]" />
            <p className="text-xs leading-6 text-[#D7C8A0]">
              请再次确认：当前批准版本、证据身份与人工裁决将作为一个整体签封；后续更正须另立新记录，不能覆盖本次归档。
            </p>
          </div>
          {error && <p className="mt-2 text-xs text-[#F58A9A]" role="alert">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="court-archive-confirm"
              disabled={submitting}
              onClick={() => void submit()}
              className="rounded border border-[#F0C66A]/40 bg-[#F0C66A]/[0.08] px-3 py-2 text-xs text-[#E8D39B] transition hover:bg-[#F0C66A]/[0.13] disabled:cursor-wait disabled:opacity-50"
            >
              {submitting ? '入队中…' : '确认签封归档'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirmationOpen(false)}
              className="rounded border border-[#6F6650]/40 px-3 py-2 text-xs text-[#B6AB8C]"
            >
              返回复核
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-testid="court-archive-open-confirmation"
          onClick={() => {
            setError(null);
            setConfirmationOpen(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded border border-[#F0C66A]/35 bg-[#F0C66A]/[0.06] px-4 py-2 text-xs text-[#E8D39B] transition hover:bg-[#F0C66A]/[0.11]"
        >
          <Archive aria-hidden className="h-3.5 w-3.5" />
          签封归档
        </button>
      )}
    </GlassPanel>
  );
}
