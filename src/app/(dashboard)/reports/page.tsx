/**
 * 朝堂 OS V2 · 奏折库 · 首页
 *
 * 数据来源：chaotang.memorials() (real API)
 * 点击奏折卡片 → MemorialDetailPanel (八段式 + 裁决)
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { chaotang } from '@/lib/api/clients/chaotang';
import type { MemorialBrief } from '@/lib/contracts/memorial';
import type { AsyncState } from '@/types/async-state';
import { asyncLoading, asyncReady, asyncError, asyncEmpty } from '@/types/async-state';
import { StateSwitch } from '@/components/ui/state-switch';
import { AGENT_META } from '@/types/agent';
import type { AgentCode } from '@/types/agent';
import { MemorialDetailPanel } from '@/features/reports';

type FilterKey = 'all' | 'urgent' | 'high' | 'pending' | 'reviewed';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部奏折' },
  { key: 'urgent', label: '紧急' },
  { key: 'high', label: '高优先' },
  { key: 'pending', label: '待裁决' },
  { key: 'reviewed', label: '已裁决' },
];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#F43F5E',
  high: '#FB923C',
  medium: '#F0C66A',
  low: '#9AA3C4',
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export default function ReportsListPage() {
  const [memorials, setMemorials] = useState<MemorialBrief[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [state, setState] = useState<AsyncState<MemorialBrief[]>>(asyncLoading());
  const [selectedBrief, setSelectedBrief] = useState<MemorialBrief | null>(null);

  const load = useCallback(async () => {
    setState(asyncLoading());
    try {
      const data = await chaotang.memorials();
      if (!data || data.length === 0) {
        setState(asyncEmpty('当前暂无奏折', '待各部门提呈奏折后，陛下可在此批阅裁决。'));
        setMemorials([]);
      } else {
        setMemorials(data);
        setState(asyncReady(data));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载失败，请稍后重试';
      setState(asyncError(msg, { retryable: true }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return memorials;
    if (filter === 'urgent') return memorials.filter((m) => m.priority === 'urgent');
    if (filter === 'high') return memorials.filter((m) => m.priority === 'high');
    if (filter === 'pending') return memorials.filter((m) => m.status === 'pending');
    if (filter === 'reviewed') return memorials.filter((m) => m.status === 'reviewed' || m.status === 'approved' || m.status === 'rejected');
    return memorials;
  }, [memorials, filter]);

  const urgentCount = memorials.filter((m) => m.priority === 'urgent').length;
  const pendingCount = memorials.filter((m) => m.status === 'pending').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1600px] p-6">
        <div className="space-y-5">

            {/* 页头 */}
            <GlassPanel variant="gold" tone="elevated" padding="lg" className="overflow-hidden">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-md"
                  style={{
                    background: 'linear-gradient(135deg, rgba(240,198,106,0.25), rgba(138,106,42,0.08))',
                    border: '1px solid rgba(240,198,106,0.4)',
                  }}
                >
                  <ScrollText size={16} className="text-[#F0C66A]" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B6AB8C]">Memorial Chamber</div>
                  <h1 className="mt-1 text-[24px] font-semibold leading-tight text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>奏折库</h1>
                </div>
              </div>
              <div className="max-w-[780px] space-y-3">
                <h2 className="section-title text-[22px] tracking-[0.04em]">
                  各部会审完毕的奏折汇呈御览，陛下批阅裁决后方可执行。
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#9AA3C4]">
                  <span>共 {memorials.length} 份奏折</span>
                  {urgentCount > 0 && <span className="text-[#F43F5E]">紧急 {urgentCount} 份</span>}
                  {pendingCount > 0 && <span className="text-[#F0C66A]">待裁决 {pendingCount} 份</span>}
                </div>
              </div>
            </GlassPanel>

            {/* 过滤器 */}
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_OPTIONS.map((opt) => {
                const active = filter === opt.key;
                const count =
                  opt.key === 'all' ? memorials.length
                  : opt.key === 'urgent' ? memorials.filter((m) => m.priority === 'urgent').length
                  : opt.key === 'high' ? memorials.filter((m) => m.priority === 'high').length
                  : opt.key === 'pending' ? memorials.filter((m) => m.status === 'pending').length
                  : memorials.filter((m) => m.status === 'reviewed' || m.status === 'approved' || m.status === 'rejected').length;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className="rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all"
                    style={{
                      borderColor: active ? '#F0C66A' : 'rgba(26,33,66,0.8)',
                      backgroundColor: active ? 'rgba(240,198,106,0.1)' : 'transparent',
                      color: active ? '#F0C66A' : '#9AA3C4',
                    }}
                  >
                    {opt.label}
                    <span className="ml-1.5 font-mono text-[11px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* 列表 */}
            <StateSwitch state={state} onRetry={load}>
              {() => (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B6AB8C]">奏折总库</div>
                      <h2 className="mt-1 text-[20px] font-semibold text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>待御览批阅的全部奏折</h2>
                    </div>
                    <div className="page-meta">点击奏折可展开批阅裁决</div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filtered.length === 0 ? (
                      <div className="col-span-2 flex items-center justify-center py-12 text-[12px] text-[#6A7299]">
                        当前筛选条件下暂无奏折
                      </div>
                    ) : (
                      filtered.map((m) => (
                        <MemorialCard
                          key={m.id}
                          memorial={m}
                          onClick={() => setSelectedBrief(m)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </StateSwitch>

        </div>
      </div>

      {/* 详情面板 / 裁决 */}
      {selectedBrief && (
        <MemorialDetailPanel
          brief={selectedBrief}
          onClose={() => setSelectedBrief(null)}
          onReviewed={load}
        />
      )}
    </div>
  );
}

function MemorialCard({ memorial, onClick }: { memorial: MemorialBrief; onClick: () => void }) {
  const agentMeta = AGENT_META[memorial.agentCode as AgentCode];
  const priorityColor = PRIORITY_COLOR[memorial.priority] ?? '#9AA3C4';
  const priorityLabel = PRIORITY_LABEL[memorial.priority] ?? memorial.priority;
  const isReviewed =
    memorial.status === 'reviewed' || memorial.status === 'approved' || memorial.status === 'rejected';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left"
    >
      <GlassPanel
        tone="elevated"
        padding="lg"
        className="h-full transition-all group-hover:scale-[1.004]"
        style={{
          borderColor: memorial.priority === 'urgent'
            ? 'rgba(244,63,94,0.4)'
            : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {agentMeta && (
              <span
                className="rounded px-2 py-0.5 text-[11px] font-medium"
                style={{ background: `${agentMeta.color}18`, color: agentMeta.color }}
              >
                {agentMeta.emoji} {agentMeta.nameCn}
              </span>
            )}
            <span
              className="rounded px-2 py-0.5 text-[11px] font-medium"
              style={{ background: `${priorityColor}18`, color: priorityColor, border: `1px solid ${priorityColor}33` }}
            >
              {priorityLabel}
            </span>
          </div>
          {isReviewed ? (
            <span className="shrink-0 rounded px-2 py-0.5 text-[10px]" style={{ background: 'rgba(61,214,140,0.12)', color: '#3DD68C', border: '1px solid rgba(61,214,140,0.3)' }}>
              已裁决
            </span>
          ) : (
            <span className="shrink-0 rounded px-2 py-0.5 text-[10px]" style={{ background: 'rgba(240,198,106,0.1)', color: '#F0C66A', border: '1px solid rgba(240,198,106,0.3)' }}>
              待裁决
            </span>
          )}
        </div>

        <h3 className="mt-3 section-title text-[17px] leading-snug">{memorial.title}</h3>
        <p className="mt-1.5 text-[12px] leading-6 text-[#A7B0CC] line-clamp-2">{memorial.summary}</p>

        <div className="mt-4 flex items-center justify-between border-t pt-3 text-[11px]" style={{ borderColor: 'rgba(26,33,66,0.6)' }}>
          <span className="text-[#6A7299]">{memorial.sourceDepartment}</span>
          <span className="text-[#6A7299]">{new Date(memorial.createdAt).toLocaleString('zh-CN')}</span>
        </div>
      </GlassPanel>
    </button>
  );
}
