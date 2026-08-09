'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useCourtPulse } from '@/features/shared/hooks/use-court-pulse';

export default function ThronePulsePage() {
  const pulse = useCourtPulse(true);
  const hotSignals = pulse.criticalSignals + pulse.warningSignals;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060E]">
      <div className="relative z-10 mx-auto max-w-[1320px] px-6 pb-16 pt-8 md:px-10 md:pt-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="page-eyebrow">Court Pulse · 后端聚合</div>
            <h1 className="display-serif mt-2 text-[28px] font-bold text-[#F5E9C9]">朝堂今日四个事实</h1>
            <p className="body-copy mt-2">所有计数与紧急态均来自后端，前端不再扫描任务或情报数组自行判定。</p>
          </div>
          <Link href="/throne" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-[#C8CDD8]">
            <ArrowLeft size={12} /> 返朝堂
          </Link>
        </header>

        <section className="mt-10 rounded-[28px] border border-white/8 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="待御批" value={pulse.pendingReviews} note="后端标记为 report_ready" tone="gold" />
            <MetricCard label="执行中" value={pulse.runningTasks} note="后端正在办理的任务" tone="info" />
            <MetricCard label="急报与警讯" value={hotSignals} note="后端情报等级聚合" tone="danger" />
            <MetricCard label="已录史馆" value={pulse.archivedTasks} note="已复核或归档任务" tone="calm" />
          </div>
          <div className="mt-5 flex items-center gap-2 text-[11px] text-[#8A92AC]">
            <RefreshCw size={12} className={pulse.loading ? 'animate-spin' : ''} />
            {pulse.loading
              ? '正在读取后端脉搏…'
              : pulse.source === 'backend'
                ? `后端已连接 · 任务 ${pulse.totalTasks} · 情报 ${pulse.totalSignals}`
                : '后端脉搏不可用；页面不提供本地兜底判断。'}
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <Destination href="/overview" title="进入大殿" body="看完整总局" />
          <Destination href="/command-center" title="进入军机处" body="查看真实执行" />
          <Destination href="/intel" title="巡视锦衣卫" body="查看后端情报" />
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, tone }: { label: string; value: number; note: string; tone: 'gold' | 'info' | 'danger' | 'calm' }) {
  const colors = { gold: '#F0C66A', info: '#6BA0FF', danger: '#F97316', calm: '#A78BFA' } as const;
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
      <div className="section-eyebrow">{label}</div>
      <div className="mt-2 text-[30px] font-semibold" style={{ color: colors[tone] }}>{value}</div>
      <div className="mt-1 text-[12px] leading-6 text-[#9AA3C4]">{note}</div>
    </div>
  );
}

function Destination({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 hover:border-[#F0C66A]/20">
      <div className="section-eyebrow">Next</div>
      <div className="mt-1 text-[13px] font-semibold text-[#F5E9C9]">{title}</div>
      <div className="mt-1 text-[11px] text-[#9AA3C4]">{body}</div>
    </Link>
  );
}
