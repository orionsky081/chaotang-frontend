'use client';

/**
 * 史馆 · /archive
 *
 * 三栏布局匹配效果图：
 * 左栏 · 档案与规律（统计数据 + 快捷操作）
 * 中间 · 主视觉（藏书阁场景）
 * 右栏 · 知识飞轮（组织记忆 + NEXT ACTION）
 */

import Link from 'next/link';
import useSWR from 'swr';
import { Archive, BookOpenCheck, FileText, ShieldCheck, Search, ChevronRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { API_PATHS, swrFetcher } from '@/lib/api';
import { assetUrl } from '@/lib/asset';
import type { Report } from '@/types/report';
import { BUILD_LEDGER_STATUS_LABEL, type BuildLedgerEntry } from '@/features/operating-loop';

interface ShiguanStats {
  totalTasks: number;
  totalCases: number;
  successRate: number;
}

/** 史馆只展示后端归档、报告与建设台账 */
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
    <main className="mx-auto min-h-full max-w-[1600px] px-4 py-4">
      {/* 顶部标题 */}
      <header className="mb-3 rounded-xl border border-[#F0C66A]/22 bg-[#050912]/78 px-5 py-4 backdrop-blur-md">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="page-eyebrow">SHIGUAN · BACKEND ARCHIVE</div>
            <h1 className="page-title mt-1">史馆</h1>
            <p className="body-copy mt-1 max-w-[780px]">
              档案、规律与主统计收来则左侧工作区，中间不再展示任何中台内容。
            </p>
          </div>
          <span className="rounded-full border border-[#3DD68C]/25 bg-[#3DD68C]/8 px-3 py-1.5 text-[11px] text-[#B9F6D2]">
            JSON REST · 后端唯一事实源
          </span>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="mb-3 rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-4 py-3 text-[12px] text-[#F6A5B2]">
          后端史馆数据读取失败：{errors.map((item) => item.message).join('；')}
        </div>
      )}

      {/* 三栏布局 */}
      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* 左栏：档案与规律 */}
        <aside className="space-y-3">
          <GlassPanel variant="gold" tone="elevated" padding="lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="section-eyebrow">档案与规律 Archive+Pattern</div>
                <h2 className="section-title mt-1">史馆总览</h2>
              </div>
              <span className="text-[10px] text-[#8F98B8]">太史馆</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#9AA3C4]">
              档案、规律与主统计收来则左侧工作区，中间不再展示任何中台内容。
            </p>

            {/* 统计数据网格 */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <StatCard label="档案" value={stats ? String(stats.totalTasks) : '—'} unit="件" />
              <StatCard label="治理" value={stats ? String(stats.totalCases) : '—'} unit="条" />
              <StatCard label="本月" value="2" unit="件" />
              <StatCard label="成功率" value={stats ? String(stats.successRate) : '—'} unit="%" />
            </div>

            {/* 分类统计 */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat label="奏折库" value={reports?.length ?? 0} total={reports?.length ?? 0} />
              <MiniStat label="决策档案" value={0} total={0} />
              <MiniStat label="任务履历" value={buildLedger?.length ?? 0} total={buildLedger?.length ?? 0} />
              <MiniStat label="知识库" value={0} total={0} />
            </div>

            {/* 快捷操作 */}
            <div className="mt-4 flex gap-2">
              <QuickAction label="纪" sublabel="今日纪要" />
              <QuickAction label="策" sublabel="决策档案" />
              <QuickAction label="会" sublabel="会议记录" />
            </div>

            {/* 标签切换 */}
            <div className="mt-4 flex gap-2">
              <TabButton active label="档案总览" count={reports?.length ?? 0} />
              <TabButton label="规律分析" count={2} />
            </div>

            {/* 搜索框 */}
            <div className="mt-4">
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]">搜索与追问</div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <Search size={14} className="text-[#6A7299]" />
                <input
                  type="text"
                  placeholder="搜索奏折、决策、任务、知识..."
                  className="flex-1 bg-transparent text-[11px] text-[#EAEEFB] outline-none placeholder:text-[#6A7299]"
                />
              </div>
            </div>
          </GlassPanel>
        </aside>

        {/* 中间：主视觉 */}
        <section className="relative overflow-hidden rounded-xl border border-white/10">
          {/* 藏书阁场景 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl('/assets/shiguan/shiguan.webp')}
            alt=""
            className="h-full min-h-[500px] w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* 渐变叠加 */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#04060E]/90 via-transparent to-[#04060E]/40" />
          {/* 底部状态栏 */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#F0C66A]/30 bg-[#F0C66A]/10 px-2.5 py-1 text-[10px] text-[#F0C66A]">太史馆</span>
              <span className="rounded-full border border-[#F5A524]/30 bg-[#F5A524]/10 px-2.5 py-1 text-[10px] text-[#F5A524]">MIXED 混合</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#9AA3C4]">档案</span>
              <span className="font-mono text-[14px] font-bold text-[#F5E9C9]">{stats?.totalTasks ?? 0}</span>
              <span className="ml-2 text-[10px] text-[#9AA3C4]">成功率</span>
              <span className="font-mono text-[14px] font-bold text-[#3DD68C]">{stats?.successRate ?? 0}%</span>
            </div>
          </div>
        </section>

        {/* 右栏：知识飞轮 */}
        <aside className="space-y-3">
          <GlassPanel tone="deep" padding="lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="section-eyebrow">ARCHIVE FLYWHEEL · 史馆组织记忆</div>
                <h2 className="section-title mt-1">知识与专项 Memory+Special</h2>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#9AA3C4]">
              每条归档都要改变下一次上书房简报或军机处推荐，组织记忆与反馈动作统一开到右侧工作区。
            </p>

            {/* 四个功能卡片 */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <FlywheelCard label="决策" desc="背景、分歧、证据、拍板人" />
              <FlywheelCard label="战报" desc="目标、偏差、结果、教训" />
              <FlywheelCard label="蜂群" desc="适用边界与历史表现" />
              <FlywheelCard label="反哺" desc="复盘改变下一次路径" />
            </div>

            {/* NEXT ACTION */}
            <div className="mt-4 rounded-lg border border-[#F0C66A]/25 bg-[#F0C66A]/8 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F0C66A]">NEXT ACTION</div>
              <p className="mt-1 text-[12px] font-semibold text-[#F5E9C9]">把本次教训写回上书房</p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-[#9AA3C4]">
                <span>当前焦点：档案先例</span>
                <span>·</span>
                <span>责任人：史馆 / 上书房</span>
              </div>
              <Link
                href="/court-briefing"
                className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#F0C66A]/35 bg-[#F0C66A]/10 px-3 py-1.5 text-[11px] text-[#F0C66A] transition hover:bg-[#F0C66A]/20"
              >
                回上书房应用教训 <ChevronRight size={12} />
              </Link>
            </div>

            {/* 知识记忆统计 */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="知识记忆" value={0} total={0} />
              <MiniStat label="专项档案" value={0} total={0} />
              <MiniStat label="复盘版本" value={reports?.length ?? 0} total={reports?.length ?? 0} />
            </div>

            {/* 统一记忆入口 */}
            <div className="mt-4 rounded-lg border border-white/8 bg-black/20 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8F835F]">Shiguan Memory Router</div>
              <p className="mt-1 text-[10px] leading-5 text-[#9AA3C4]">
                先把史馆拆散的记忆线收成一个入口：建设台账管发生了什么，独立审计管在何时做了什么，经营案卷管为什么值得复用，旧案教训管下次如何少走弯路。
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <MiniStat label="建设台账" value={buildLedger?.length ?? 0} total={buildLedger?.length ?? 0} />
                <MiniStat label="独立审计" value={0} total={0} />
              </div>
            </div>
          </GlassPanel>
        </aside>
      </div>

      {/* 底部报告列表 */}
      <section className="mt-3">
        <GlassPanel variant="gold" tone="elevated" padding="lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-eyebrow">REPORT ARCHIVE</div>
              <h2 className="section-title mt-1">真实报告</h2>
            </div>
            <span className="text-[11px] text-[#8F98B8]">{reports?.length ?? 0} 件</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {reports?.length ? reports.slice(0, 6).map((report) => (
              <Link
                key={report.id}
                href={`/reports/${encodeURIComponent(report.id)}`}
                className="block rounded-xl border border-white/8 bg-black/25 px-3 py-3 transition hover:border-[#F0C66A]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-[#F5E9C9]">{report.title}</div>
                    <div className="mt-1 text-[10px] text-[#8F98B8]">{report.metadata.author} · {report.template}</div>
                  </div>
                  <FileText size={14} className="shrink-0 text-[#F0C66A]" />
                </div>
                <div className="mt-2 font-mono text-[10px] text-[#7D88A4]">{report.createdAt}</div>
              </Link>
            )) : (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[11px] text-[#8F98B8]">后端尚无报告归档。</div>
            )}
          </div>
        </GlassPanel>
      </section>
    </main>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#6A7299]">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-[#F5E9C9]">{value}<span className="ml-0.5 text-[10px] text-[#6A7299]">{unit}</span></div>
    </div>
  );
}

function MiniStat({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-center">
      <div className="text-[9px] text-[#6A7299]">{label}</div>
      <div className="mt-0.5 font-mono text-[14px] font-bold text-[#F5E9C9]">{value}<span className="ml-0.5 text-[9px] text-[#6A7299]">(共{total}件)</span></div>
    </div>
  );
}

function QuickAction({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <button type="button" className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left transition hover:border-[#F0C66A]/30">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#F0C66A]/40 bg-[#F0C66A]/10 font-serif text-[12px] font-bold text-[#F0C66A]">{label}</span>
      <span className="text-[10px] text-[#9AA3C4]">{sublabel}</span>
    </button>
  );
}

function TabButton({ active, label, count }: { active?: boolean; label: string; count: number }) {
  return (
    <button type="button" className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px]" style={{ borderColor: active ? 'rgba(240,198,106,0.4)' : 'rgba(255,255,255,.08)', background: active ? 'rgba(240,198,106,0.1)' : 'transparent', color: active ? '#F0C66A' : '#9AA3C4' }}>
      {label}
      <span className="font-mono text-[10px]" style={{ color: active ? '#F0C66A' : '#6A7299' }}>({count})</span>
    </button>
  );
}

function FlywheelCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
      <div className="text-[11px] font-semibold text-[#F5E9C9]">{label}</div>
      <div className="mt-0.5 text-[9px] text-[#9AA3C4]">{desc}</div>
    </div>
  );
}
