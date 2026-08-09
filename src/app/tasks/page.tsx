/**
 * /tasks — 任务总览（IA 新建 L1 黄金路径）
 *
 * 一页显示全部任务 + 状态过滤 + 搜索 + 时间倒序。
 * 用户主路径："下旨 → 看奏报 → 御览批准" 中需要的任务列表入口。
 */
'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Search, Inbox, AlertTriangle, ArrowRight } from 'lucide-react';
import { swrFetcher } from '@/lib/api';
import type { TaskGroup } from '@/lib/contracts/swarm';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PageHeaderShell } from '@/components/PageHeaderShell';

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority?: string;
  owner?: string;
  ownerLabel?: string;
  createdAt?: string;
  updatedAt?: string;
  stuck?: boolean;
  needsTakeover?: boolean;
  filters?: string[];
}

const STATUS_FILTERS: {
  id: string;
  label: string;
}[] = [
  { id: 'all', label: '全部' },
  { id: 'takeover', label: '⚠ 需接管' },
  { id: 'urgent', label: '待御览' },
  { id: 'running', label: '在跑' },
  { id: 'planning', label: '编排中' },
  { id: 'archived', label: '已归档' },
  { id: 'failed', label: '失败' },
];

const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#9AA3C4', bg: 'rgba(154,163,196,0.12)' },
  submitted: { label: '已提交', color: '#9AA3C4', bg: 'rgba(154,163,196,0.12)' },
  interpreting: { label: '解读中', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  planning: { label: '编排中', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  assigned: { label: '已派遣', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  running: { label: '在跑', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  'in-progress': { label: '在跑', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  aggregating: { label: '汇聚中', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  report_ready: { label: '待御览', color: '#3DD68C', bg: 'rgba(61,214,140,0.18)' },
  'awaiting-decision': { label: '待御览', color: '#3DD68C', bg: 'rgba(61,214,140,0.18)' },
  reviewed: { label: '已批', color: '#3DD68C', bg: 'rgba(61,214,140,0.12)' },
  archived: { label: '已归档', color: '#6A7299', bg: 'rgba(106,114,153,0.18)' },
  done: { label: '已归档', color: '#6A7299', bg: 'rgba(106,114,153,0.18)' },
  failed: { label: '失败', color: '#F43F5E', bg: 'rgba(244,63,94,0.15)' },
  pending: { label: '待办', color: '#9AA3C4', bg: 'rgba(154,163,196,0.12)' },
  blocked: { label: '阻塞', color: '#F5A524', bg: 'rgba(245,165,36,0.15)' },
};

const PRIORITY_TINT: Record<string, string> = {
  P0: '#F43F5E',
  P1: '#F5A524',
  P2: '#9AA3C4',
};

export default function TasksListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04060E]" />}>
      <TasksListBody />
    </Suspense>
  );
}

function TasksListBody() {
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get('filter') ?? 'all');
  const [search, setSearch] = useState('');

  const { data: board } = useSWR<TaskGroup[], Error>('/tasks/board', swrFetcher<TaskGroup[]>, {
    refreshInterval: 30_000,
  });

  useEffect(() => {
    const sync = sp.get('filter') ?? 'all';
    if (sync !== filter) setFilter(sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const allTasks = useMemo<TaskRow[]>(() => {
    if (!board) return [];
    return board
      .flatMap((g) => g.tasks as TaskRow[])
      .sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      });
  }, [board]);

  const filtered = useMemo(() => {
    let list = allTasks;
    const f = STATUS_FILTERS.find((x) => x.id === filter);
    if (f && f.id !== 'all') {
      list = list.filter((t) => t.filters?.includes(f.id));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [allTasks, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allTasks.length };
    for (const f of STATUS_FILTERS.slice(1)) {
      c[f.id] = allTasks.filter((t) => t.filters?.includes(f.id)).length;
    }
    return c;
  }, [allTasks]);

  const takeoverCount = counts.takeover ?? 0;

  return (
    <main className="min-h-screen p-8" style={{ color: '#EAEEFB' }}>
      <PageHeaderShell
        title="任务总览"
        subtitle="所有任务一页可见 · 自动按时间倒序 · 30 秒自动刷新"
        breadcrumbs={[{ label: '朝堂', href: '/throne' }, { label: '任务总览' }]}
        actions={
          <Link
            href="/prime"
            className="rounded-lg border px-4 py-2 text-[12px] transition"
            style={{
              borderColor: 'rgba(240,198,106,0.4)',
              color: '#F0C66A',
              background: 'rgba(240,198,106,0.06)',
            }}
          >
            起一道旨 →
          </Link>
        }
      />

      {/* 需接管警示横条 — 仅当存在卡住任务时显示 */}
      {takeoverCount > 0 && filter !== 'takeover' && (
        <button
          type="button"
          onClick={() => setFilter('takeover')}
          className="mb-3 flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition hover:brightness-110"
          style={{
            borderColor: 'rgba(245,165,36,0.4)',
            background: 'rgba(245,165,36,0.08)',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#F5A524' }} />
          <span className="text-[12px]" style={{ color: '#F5A524' }}>
            <strong>{takeoverCount}</strong> 条任务被后端判定为需要人工接管
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px]" style={{ color: '#F5A524' }}>
            查看 <ArrowRight size={11} />
          </span>
        </button>
      )}

      {/* Filter + Search */}
      <GlassPanel padding="md">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.id;
            const cnt = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="rounded-md border px-3 py-1.5 text-[12px] transition"
                style={{
                  background: active ? 'rgba(240,198,106,0.15)' : 'transparent',
                  color: active ? '#F0C66A' : '#9AA3C4',
                  borderColor: active ? 'rgba(240,198,106,0.4)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] opacity-70">{cnt}</span>
              </button>
            );
          })}
          <div
            className="ml-auto flex items-center gap-2 rounded-md border px-3 py-1.5"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
          >
            <Search size={12} style={{ color: '#6A7299' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索任务标题…"
              className="bg-transparent text-[12px] focus:outline-none placeholder:text-[#484F72]"
              style={{ color: '#EAEEFB', width: 200 }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[10px]" style={{ color: '#6A7299' }}>
                ×
              </button>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* List */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <GlassPanel padding="lg">
            <div className="flex flex-col items-center gap-3 py-8">
              <Inbox size={28} style={{ color: '#484F72' }} />
              <div className="text-[13px]" style={{ color: '#9AA3C4' }}>
                {search ? `没有匹配「${search}」的任务` : '暂无符合条件的任务'}
              </div>
              <Link
                href="/prime"
                className="rounded-lg border px-4 py-2 text-[12px] transition"
                style={{
                  borderColor: 'rgba(240,198,106,0.4)',
                  color: '#F0C66A',
                  background: 'rgba(240,198,106,0.06)',
                }}
              >
                去丞相台下旨 →
              </Link>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel padding="sm">
            <ul className="divide-y divide-white/5">
              {filtered.map((t) => {
                const pill = STATUS_PILL[t.status] ?? STATUS_PILL.submitted;
                const time = formatRelative(t.updatedAt ?? t.createdAt);
                const tint = t.priority ? PRIORITY_TINT[t.priority] ?? '#9AA3C4' : '#9AA3C4';
                const stuck = t.stuck === true;
                const showTakeover = filter === 'takeover' || t.needsTakeover === true;
                return (
                  <li key={t.id}>
                    <div className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.03]">
                      {/* Priority bar */}
                      {t.priority && (
                        <Link
                          href={`/task/${t.id}`}
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            background: `${tint}22`,
                            color: tint,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {t.priority}
                        </Link>
                      )}

                      {/* Status pill — 卡住时换成琥珀色"卡住 Nh"标记 */}
                      {stuck ? (
                        <span
                          className="shrink-0 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{
                            background: 'rgba(245,165,36,0.15)',
                            color: '#F5A524',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                          title={`原状态 ${pill.label}，已卡住超 30 分钟`}
                        >
                          ⚠ 卡住 {time}
                        </span>
                      ) : (
                        <span
                          className="shrink-0 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{
                            background: pill.bg,
                            color: pill.color,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {pill.label}
                        </span>
                      )}

                      {/* Title — 点击进详情 */}
                      <Link
                        href={`/task/${t.id}`}
                        className="min-w-0 flex-1 truncate text-[13px]"
                        style={{ color: '#EAEEFB' }}
                      >
                        {t.title}
                      </Link>

                      {/* Owner */}
                      {(t.ownerLabel || t.owner) && (
                        <span className="shrink-0 text-[11px]" style={{ color: '#6A7299' }}>
                          {t.ownerLabel ?? t.owner}
                        </span>
                      )}

                      {/* Time（非卡住才显示，卡住时间已经在 pill 里）*/}
                      {!stuck && time && (
                        <span
                          className="shrink-0 text-[10px]"
                          style={{ color: '#484F72', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {time}
                        </span>
                      )}

                      {/* 接管按钮 — 失败/阻塞/卡住时显示。带 prefill 把原标题填入下旨编辑器 */}
                      {showTakeover && (
                        <Link
                          href={`/throne/compose?prefill=${encodeURIComponent(t.title)}&takeover_from=${encodeURIComponent(t.id)}`}
                          className="shrink-0 rounded-md border px-3 py-1 text-[11px] transition hover:brightness-110"
                          style={{
                            borderColor: 'rgba(245,165,36,0.4)',
                            background: 'rgba(245,165,36,0.08)',
                            color: '#F5A524',
                          }}
                          title="重新派遣此任务"
                        >
                          接管 →
                        </Link>
                      )}

                      {!showTakeover && (
                        <Link href={`/task/${t.id}`} className="shrink-0" style={{ color: '#484F72' }}>
                          →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </GlassPanel>
        )}

        <div className="mt-3 text-[11px]" style={{ color: '#484F72' }}>
          共 {filtered.length} 条 · 自动刷新每 30 秒
        </div>
      </div>
    </main>
  );
}

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d2 = Math.floor(h / 24);
  return `${d2} 天前`;
}
