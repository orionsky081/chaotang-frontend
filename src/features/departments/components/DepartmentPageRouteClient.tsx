'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Archive, CircleDot, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PageHeaderShell } from '@/components/PageHeaderShell';
import { swrFetcher } from '@/lib/api';
import type { DepartmentBoard, DepartmentBoardCode } from '@/lib/contracts/department-board';

const STATUS_LABEL: Record<string, string> = {
  draft: '草拟',
  submitted: '已提交',
  interpreting: '解旨中',
  planning: '规划中',
  assigned: '已派发',
  running: '执行中',
  aggregating: '汇总中',
  report_ready: '待裁决',
  reviewed: '已复核',
  archived: '已归档',
  failed: '失败',
};

export function DepartmentPageRouteClient({ code }: { code: DepartmentBoardCode }) {
  const { data, error, isLoading, mutate } = useSWR<DepartmentBoard>(
    `/api/frontend/departments/${code}?limit=100`,
    swrFetcher<DepartmentBoard>,
  );

  if (isLoading && !data) {
    return <div className="p-6 text-sm text-white/45">正在读取后端部门台账…</div>;
  }
  if (error || !data) {
    return (
      <main className="mx-auto max-w-[1200px] p-6">
        <GlassPanel variant="danger" className="flex min-h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-[#F5E9C9]">后端部门台账暂不可用</p>
            <p className="mt-2 text-xs text-white/40">{error?.message ?? code}</p>
            <button type="button" onClick={() => void mutate()} className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs text-white/60">
              重试
            </button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-6 md:px-7">
      <PageHeaderShell
        title={`${data.department.name} · ${data.department.title}`}
        subtitle="部门归属、当前主事项和任务状态均由后端按持久化台账投影；本页不维护本地业务规则或静态办公数据。"
        breadcrumbs={[{ label: '六部', href: '/departments' }, { label: data.department.name }]}
        actions={(
          <button type="button" onClick={() => void mutate()} className="inline-flex items-center gap-2 rounded-md border border-[#F0C66A]/35 bg-[#F0C66A]/10 px-3 py-2 text-xs text-[#F0C66A]">
            <RefreshCw className="h-3.5 w-3.5" /> 刷新台账
          </button>
        )}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <GlassPanel variant="gold" className="md:col-span-2 xl:col-span-2" hudCorners>
          <div className="section-eyebrow">后端主事项</div>
          <div className="mt-3 text-lg font-semibold text-[#F5E9C9]">{data.headline?.title ?? '当前无归属事项'}</div>
          {data.headline && (
            <div className="mt-2 text-xs text-white/45">状态：{STATUS_LABEL[data.headline.status] ?? data.headline.status}</div>
          )}
        </GlassPanel>
        {[
          ['全部', data.stats.total],
          ['执行中', data.stats.active],
          ['待裁决', data.stats.reviewReady],
        ].map(([label, value]) => (
          <GlassPanel key={String(label)}>
            <div className="text-xs text-white/40">{label}</div>
            <div className="mt-2 font-mono text-2xl text-[#F0C66A]">{value}</div>
          </GlassPanel>
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <GlassPanel>
          <div className="mb-4 flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-[#6BA0FF]" />
            <h2 className="section-title">部门任务台账</h2>
          </div>
          {data.tasks.length > 0 ? (
            <div className="space-y-3">
              {data.tasks.map((task) => (
                <Link key={task.id} href={`/task/${encodeURIComponent(task.id)}`} className="block rounded-lg border border-white/10 bg-black/20 p-4 transition hover:border-[#F0C66A]/35">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[#F5E9C9]">{task.title}</div>
                      {task.command && <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/45">{task.command}</p>}
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/50">
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </div>
                  <div className="mt-3 font-mono text-[10px] text-white/30">{task.updatedAt}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-white/40">后端当前没有归属于该部门的任务。</p>
          )}
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel>
            <div className="flex items-center gap-2 text-xs text-white/45"><Server className="h-4 w-4 text-[#6BA0FF]" />数据边界</div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[#D8CDAF]"><ShieldCheck className="h-4 w-4 text-[#3DD68C]" />{data.sourceLabel}</div>
          </GlassPanel>
          <GlassPanel>
            <div className="flex items-center gap-2 text-xs text-white/45"><Archive className="h-4 w-4 text-[#F0C66A]" />已归档</div>
            <div className="mt-2 font-mono text-2xl text-[#F0C66A]">{data.stats.archived}</div>
          </GlassPanel>
        </div>
      </section>
    </main>
  );
}
