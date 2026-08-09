'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { API_PATHS } from '@/lib/api/gateway';
import { api } from '@/lib/api';

interface ContributionReceipt {
  id: string;
  title: string;
  status: string;
  authorName: string;
  createdAt: string;
}

function isReceipt(value: unknown): value is ContributionReceipt {
  return typeof value === 'object' && value !== null && typeof (value as ContributionReceipt).id === 'string';
}

export function HanlinContributePage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('template');
  const [summary, setSummary] = useState('');
  const [applicationHint, setApplicationHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContributionReceipt | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const value = await api.post(API_PATHS.frontend.hanlinContributions, {
        title: title.trim(),
        type: type.trim(),
        summary: summary.trim(),
        originalityClaim: 'original',
        applicationHint: applicationHint.trim(),
      });
      if (!isReceipt(value)) throw new Error('后端贡献回执不完整');
      setReceipt(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '贡献提交失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="h-full overflow-y-auto bg-[#050712] px-5 py-6">
      <div className="mx-auto max-w-[980px]">
        <Link href="/hanlin" className="inline-flex items-center gap-1.5 text-[11px] text-[#9FB0D6]"><ArrowLeft size={12} /> 返回翰林院</Link>
        <GlassPanel variant="gold" tone="elevated" padding="lg" className="mt-4">
          <div className="page-eyebrow">HANLIN · CONTRIBUTION</div>
          <h1 className="page-title mt-2">提交贡献</h1>
          <p className="body-copy mt-2">作者身份、贡献编号、提交时间与初始状态由后端认证上下文生成。</p>
          <div className="mt-5 grid gap-4">
            <Input label="标题" value={title} onChange={setTitle} />
            <Input label="类型" value={type} onChange={setType} />
            <label><span className="text-[10px] text-[#8F835F]">摘要</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={6} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] leading-6 text-[#F5E9C9] outline-none focus:border-[#F0C66A]/40" /></label>
            <Input label="应用场景" value={applicationHint} onChange={setApplicationHint} />
          </div>
          {error && <div className="mt-3 text-[11px] text-[#F6A5B2]">{error}</div>}
          <button type="button" onClick={() => void submit()} disabled={busy || title.trim().length < 2 || summary.trim().length < 5} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#F0C66A]/40 bg-[#F0C66A]/10 px-4 py-2.5 text-[12px] text-[#F0C66A] disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}{busy ? '后端提交中…' : '提交后端'}</button>
          {receipt && <div className="mt-5 rounded-xl border border-[#3DD68C]/24 bg-[#3DD68C]/7 px-4 py-3 text-[11px] leading-6 text-[#B9F6D2]">已由后端受理：{receipt.id}<br />状态 {receipt.status} · 作者 {receipt.authorName} · {receipt.createdAt}</div>}
        </GlassPanel>
      </div>
    </main>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-[10px] text-[#8F835F]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[12px] text-[#F5E9C9] outline-none focus:border-[#F0C66A]/40" /></label>;
}
