/**
 * /task/[id] — 任务详情主页（11 态可视化）
 *
 * 数据：GET /api/v1/tasks/:id
 * 11 态进度条：draft → submitted → interpreting → planning → assigned →
 *              running → aggregating → report_ready → reviewed → archived
 *              (任意 → failed)
 */
'use client';
import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { TaskStatus } from '@/lib/contracts/task';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PageHeaderShell } from '@/components/PageHeaderShell';
import { DataState } from '@/components/DataState';

interface TaskRow {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: TaskStatus | string;
  owner: string | null;
  nextStep: string | null;
  swarmId: string | null;
  goal: string | null;
  createdAt: string;
  updatedAt: string;
}

const TIMELINE: { status: TaskStatus; label: string }[] = [
  { status: 'draft', label: '草稿' },
  { status: 'submitted', label: '已提交' },
  { status: 'interpreting', label: '丞相解读' },
  { status: 'planning', label: '编排' },
  { status: 'assigned', label: '已分派' },
  { status: 'running', label: '执行中' },
  { status: 'aggregating', label: '汇聚' },
  { status: 'report_ready', label: '呈报待审' },
  { status: 'reviewed', label: '已批示' },
  { status: 'archived', label: '已归档' },
];

const LEGACY_TO_NEW: Record<string, TaskStatus> = {
  pending: 'submitted',
  'in-progress': 'running',
  blocked: 'running',
  'awaiting-decision': 'report_ready',
  done: 'archived',
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, isLoading, mutate } = useSWR<TaskRow, Error>(
    `/tasks/${id}`,
    swrFetcher<TaskRow>,
  );

  return (
    <main className="min-h-screen p-8" style={{ color: '#EAEEFB' }}>
      <PageHeaderShell
        title={data ? `${data.priority} · ${data.title}` : `任务 ${id}`}
        subtitle={data?.goal ?? '加载中…'}
        breadcrumbs={[{ label: '丞相台', href: '/prime' }, { label: id }]}
      />

      <DataState loading={isLoading} error={error} empty={!data} onRetry={() => void mutate()}>
        {data && (
          <>
            <StatusTimeline current={normalizeStatus(data.status)} isFailed={data.status === 'failed'} />

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <SubNav id={id} />
              <div className="md:col-span-2 space-y-4">
                <GlassPanel padding="md">
                  <div className="page-eyebrow mb-2">基本信息</div>
                  <dl className="space-y-2 text-sm">
                    <Row label="所属蜂群">{data.swarmId ?? '—'}</Row>
                    <Row label="负责人">{data.owner ?? '—'}</Row>
                    <Row label="下一步">{data.nextStep ?? '—'}</Row>
                    <Row label="创建时间">{new Date(data.createdAt).toLocaleString('zh-CN')}</Row>
                    <Row label="更新时间">{new Date(data.updatedAt).toLocaleString('zh-CN')}</Row>
                  </dl>
                </GlassPanel>

                <GlassPanel padding="md" variant={data.status === 'failed' ? 'danger' : 'default'}>
                  <div className="page-eyebrow mb-2">目标</div>
                  <p className="text-sm leading-7" style={{ color: '#C8CDD8' }}>
                    {data.goal ?? '该任务尚未设定明确目标。'}
                  </p>
                </GlassPanel>
              </div>
            </div>
          </>
        )}
      </DataState>
    </main>
  );
}

function normalizeStatus(raw: string): TaskStatus {
  return (LEGACY_TO_NEW[raw] ?? raw) as TaskStatus;
}

function StatusTimeline({ current, isFailed }: { current: TaskStatus; isFailed: boolean }) {
  const currentIdx = TIMELINE.findIndex(t => t.status === current);
  return (
    <GlassPanel padding="md" hudCorners glow>
      <div className="page-eyebrow mb-3">状态进度（11 态生命周期）</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {TIMELINE.map((step, i) => {
          const passed = i < currentIdx;
          const active = i === currentIdx;
          const color = isFailed ? '#F43F5E' : active ? '#F0C66A' : passed ? '#3DD68C' : '#484F72';
          return (
            <div key={step.status} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: color, boxShadow: active ? `0 0 12px ${color}` : 'none' }}
              />
              <span className="text-[11px]" style={{ color }}>{step.label}</span>
              {i < TIMELINE.length - 1 && <span style={{ color: '#1A2142' }}>—</span>}
            </div>
          );
        })}
        {isFailed && (
          <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(244,63,94,0.15)', color: '#F43F5E' }}>
            FAILED
          </span>
        )}
      </div>
    </GlassPanel>
  );
}

function SubNav({ id }: { id: string }) {
  const items = [
    { href: `/task/${id}`, label: '概览' },
    { href: `/task/${id}/plan`, label: '编排计划' },
    { href: `/task/${id}/runs`, label: 'Subtask 运行' },
    { href: `/task/${id}/report`, label: '呈报' },
  ];
  return (
    <GlassPanel padding="sm">
      <div className="page-eyebrow mb-2">导航</div>
      <ul className="space-y-1">
        {items.map(it => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="block px-2 py-1.5 rounded text-sm transition-colors"
              style={{ color: '#C8CDD8', background: 'transparent' }}
            >
              {it.label} →
            </Link>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <dt className="text-xs" style={{ color: '#6A7299' }}>{label}</dt>
      <dd className="text-sm" style={{ color: '#EAEEFB' }}>{children}</dd>
    </div>
  );
}
