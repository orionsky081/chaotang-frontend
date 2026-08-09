'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Archive, BookOpenCheck, FileText, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { API_PATHS, swrFetcher } from '@/lib/api';
import type { Report } from '@/types/report';
import { BUILD_LEDGER_STATUS_LABEL, type BuildLedgerEntry } from '@/features/operating-loop';

interface ShiguanStats {
  totalTasks: number;
  totalCases: number;
  successRate: number;
}

/** 史馆只展示后端归档、报告与建设台账，不再装载本地史册样例。 */
export default function ShiguanPage() {
  const { data: stats, error: statsError } = useSWR<ShiguanStats, Error>(
    API_PATHS.frontend.shiguanStats,
    swrFetcher<ShiguanStats>,
  );
  const { data: reports, error: reportsError } = useSWR<Report[], Error>(
    API_PATHS.frontend.reports,
    swrFetcher<Report[]>,
  );
  const { data: buildLedger, error: ledgerError } = useSWR<BuildLedgerEntry[], Error>(
    API_PATHS.frontend.buildLedger,
    swrFetcher<BuildLedgerEntry[]>,
  );

  const errors = [statsError, reportsError, ledgerError].filter((item): item is Error => Boolean(item));

  return (
    <main className="mx-auto min-h-full max-w-[1540px] px-5 py-6">
      <header className="rounded-xl border border-[#F0C66A]/22 bg-[#050912]/78 px-5 py-5 backdrop-blur-md">
        <div className="page-eyebrow">SHIGUAN · BACKEND ARCHIVE</div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">史馆</h1>
            <p className="body-copy mt-2 max-w-[780px]">
              这里只呈现后端已持久化的任务、报告与建设案。没有后端记录时保持空白，不以本地史册、虚构数字或静态复盘补位。
            </p>
          </div>
          <span className="rounded-full border border-[#3DD68C]/25 bg-[#3DD68C]/8 px-3 py-1.5 text-[11px] text-[#B9F6D2]">
            JSON REST · 后端唯一事实源
          </span>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-4 py-3 text-[12px] text-[#F6A5B2]">
          后端史馆数据读取失败：{errors.map((item) => item.message).join('；')}
        </div>
      )}

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={<Archive size={15} />} label="后端任务" value={stats ? String(stats.totalTasks) : '—'} />
        <Metric icon={<BookOpenCheck size={15} />} label="已成案" value={stats ? String(stats.totalCases) : '—'} />
        <Metric icon={<ShieldCheck size={15} />} label="成案率" value={stats ? `${stats.successRate}%` : '—'} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassPanel variant="gold" tone="elevated" padding="lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-eyebrow">REPORT ARCHIVE</div>
              <h2 className="section-title mt-1">真实报告</h2>
            </div>
            <span className="text-[11px] text-[#8F98B8]">{reports?.length ?? 0} 件</span>
          </div>
          <div className="mt-4 space-y-3">
            {reports?.length ? reports.slice(0, 12).map((report) => (
              <Link
                key={report.id}
                href={`/reports/${encodeURIComponent(report.id)}`}
                className="block rounded-xl border border-white/8 bg-black/25 px-3 py-3 transition hover:border-[#F0C66A]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#F5E9C9]">{report.title}</div>
                    <div className="mt-1 text-[10px] text-[#8F98B8]">{report.metadata.author} · {report.template}</div>
                  </div>
                  <FileText size={14} className="shrink-0 text-[#F0C66A]" />
                </div>
                <div className="mt-2 font-mono text-[10px] text-[#7D88A4]">{report.createdAt}</div>
              </Link>
            )) : (
              <Empty text="后端尚无报告归档。" />
            )}
          </div>
        </GlassPanel>

        <GlassPanel tone="deep" padding="lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-eyebrow">BUILD LEDGER</div>
              <h2 className="section-title mt-1">建设案复盘</h2>
            </div>
            <span className="text-[11px] text-[#8F98B8]">{buildLedger?.length ?? 0} 件</span>
          </div>
          <div className="mt-4 space-y-3">
            {buildLedger?.length ? buildLedger.slice(0, 12).map((entry) => (
              <article key={entry.id} className="rounded-xl border border-white/8 bg-black/25 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#F5E9C9]">{entry.title}</div>
                    <div className="mt-1 font-mono text-[10px] text-[#7D88A4]">{entry.taskId}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#F0C66A]/22 bg-[#F0C66A]/7 px-2 py-0.5 text-[10px] text-[#F0C66A]">
                    {BUILD_LEDGER_STATUS_LABEL[entry.status]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-[#9AA3C4]">
                  <span className="rounded border border-white/8 px-2 py-1.5">质量 {entry.assessment.grade}</span>
                  <span className="rounded border border-white/8 px-2 py-1.5">证据 {entry.evidence.length}</span>
                  <span className="rounded border border-white/8 px-2 py-1.5">审计 {entry.auditTrail.length}</span>
                </div>
                <p className="mt-3 text-[11px] leading-6 text-[#B8C0DA]">{entry.assessment.nextSuggestion}</p>
                <div className="mt-2 text-[10px] text-[#7D88A4]">下一责任：{entry.nextOwner}</div>
              </article>
            )) : (
              <Empty text="后端尚无建设案记录。" />
            )}
          </div>
        </GlassPanel>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#F0C66A]/16 bg-[#050912]/72 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]">{icon}{label}</div>
      <div className="mt-2 text-[24px] font-semibold text-[#F5E9C9]">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center text-[11px] text-[#8F98B8]">{text}</div>;
}
