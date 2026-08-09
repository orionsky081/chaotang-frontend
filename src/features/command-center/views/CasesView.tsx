'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Loader2, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ApiError, apiGateway, API_PATHS } from '@/lib/api/gateway';

interface OrchestrationReceipt {
  taskId: string;
  status: string;
  acceptedAt?: string;
  intent?: string;
  taskType?: string;
  ministers?: string[];
  groups?: string[];
  draft?: unknown;
  pollUrl?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseReceipt(value: unknown): OrchestrationReceipt | null {
  if (!isRecord(value) || typeof value.taskId !== 'string' || !value.taskId) return null;
  return {
    taskId: value.taskId,
    status: typeof value.status === 'string' ? value.status : 'running',
    acceptedAt: typeof value.acceptedAt === 'string' ? value.acceptedAt : undefined,
    intent: typeof value.intent === 'string' ? value.intent : undefined,
    taskType: typeof value.taskType === 'string' ? value.taskType : undefined,
    ministers: Array.isArray(value.ministers) ? value.ministers.filter((item): item is string => typeof item === 'string') : undefined,
    groups: Array.isArray(value.groups) ? value.groups.filter((item): item is string => typeof item === 'string') : undefined,
    draft: value.draft,
    pollUrl: typeof value.pollUrl === 'string' ? value.pollUrl : undefined,
  };
}

function parsePayload(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function readableError(payload: unknown, status: number): string {
  if (isRecord(payload)) {
    if (typeof payload.detail === 'string') return payload.detail;
    if (typeof payload.error === 'string') return payload.error;
    if (typeof payload.message === 'string') return payload.message;
  }
  return `后端立案失败（HTTP ${status}）`;
}

function draftText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

/** 军机处立案：浏览器只提交原始旨意并展示后端回执。 */
export function CasesView() {
  const [command, setCommand] = useState('');
  const [receipt, setReceipt] = useState<OrchestrationReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCase() {
    const clean = command.trim();
    if (clean.length < 5) {
      setError('请把要办的事写得更具体一些。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = await apiGateway.post<unknown>(API_PATHS.frontend.commandCenterOrchestrationRun, {
        command: clean,
      });
      const parsed = parseReceipt(payload);
      if (!parsed) throw new Error('后端回执缺少 taskId');
      setReceipt(parsed);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(readableError(parsePayload(cause.body), cause.status));
        return;
      }
      setError(cause instanceof Error ? cause.message : '后端立案失败');
    } finally {
      setSubmitting(false);
    }
  }

  const draft = draftText(receipt?.draft);
  const commandCenterHref = receipt
    ? `/command-center?taskId=${encodeURIComponent(receipt.taskId)}`
    : '/command-center';

  return (
    <div className="h-full overflow-y-auto bg-[#04060E]">
      <div className="mx-auto grid min-h-full max-w-[1380px] gap-5 p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassPanel variant="gold" tone="elevated" padding="lg">
          <div className="page-eyebrow">JUNJICHU · BACKEND CASE INTAKE</div>
          <h1 className="page-title mt-3">军机处立案</h1>
          <p className="body-copy mt-3 max-w-[680px]">
            这里只提交原始旨意。领域识别、参审路由、案号、状态与持久化全部由后端生成；前端不预填示例，也不本地拟案。
          </p>
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            rows={10}
            placeholder="写明要解决的问题、事实边界和期望结果……"
            className="mt-6 w-full resize-y rounded-xl border border-[#F0C66A]/20 bg-black/35 px-4 py-3 text-[13px] leading-7 text-[#F5E9C9] outline-none placeholder:text-[#69718F] focus:border-[#F0C66A]/45"
          />
          {error && (
            <div className="mt-3 rounded-lg border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-3 py-2 text-[12px] text-[#F6A5B2]">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void submitCase()}
            disabled={submitting || command.trim().length < 5}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#F0C66A]/45 bg-[#F0C66A]/12 px-4 py-3 text-[13px] font-semibold text-[#F0C66A] disabled:opacity-40"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <ClipboardList size={15} />}
            {submitting ? '后端立案中…' : '交后端立案'}
          </button>
        </GlassPanel>

        <GlassPanel tone="deep" padding="lg">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#7EC8E3]" />
            <h2 className="section-title">后端回执</h2>
          </div>
          {!receipt ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/10 px-5 py-16 text-center text-[12px] leading-7 text-[#8F98B8]">
              尚无真实案卷。后端接受立案后，这里只显示它返回的案号、路由和拟旨。
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReceiptField label="案号" value={receipt.taskId} mono />
                <ReceiptField label="状态" value={receipt.status} />
                <ReceiptField label="意图" value={receipt.intent || '后端未返回'} />
                <ReceiptField label="任务类型" value={receipt.taskType || '后端未返回'} />
                <ReceiptField label="大臣" value={receipt.ministers?.join('、') || '后端未返回'} />
                <ReceiptField label="蜂群" value={receipt.groups?.join('、') || '后端未返回'} />
              </div>
              {receipt.acceptedAt && <ReceiptField label="受理时间" value={receipt.acceptedAt} mono />}
              {draft && <ReceiptField label="后端拟旨" value={draft} pre />}
              <Link
                href={commandCenterHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#3DD68C]/35 bg-[#3DD68C]/8 px-4 py-2 text-[12px] text-[#B9F6D2]"
              >
                查看真实执行事件 <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function ReceiptField({
  label,
  value,
  mono = false,
  pre = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  pre?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#8F835F]">{label}</div>
      <div className={`mt-2 break-words text-[12px] leading-6 text-[#D7DFF2] ${mono ? 'font-mono' : ''} ${pre ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </div>
    </div>
  );
}
