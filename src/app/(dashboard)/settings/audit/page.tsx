'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { useState } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { swrFetcher } from '@/lib/api';

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  targetType: 'swarm' | 'task' | 'agent' | 'command' | 'department';
  targetId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  remark: string | null;
  timestamp: string;
}

interface AuditPage {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 50;

const TARGET_LABELS: Record<string, string> = {
  swarm: '蜂群',
  task: '任务',
  agent: 'Agent',
  command: '指令',
  department: '部门',
};

const TARGET_COLORS: Record<string, string> = {
  swarm: '#F0C66A',
  task: '#60A5FA',
  agent: '#A78BFA',
  command: '#FB923C',
  department: '#4ADE80',
};

export default function AuditPage() {
  const [offset, setOffset] = useState(0);
  const { data, error, isLoading } = useSWR<AuditPage, Error>(
    `/audit?limit=${PAGE_SIZE}&offset=${offset}`,
    swrFetcher<AuditPage>,
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] space-y-5 p-6">
        <Link href="/settings" className="inline-flex items-center gap-2 text-xs hover:text-amber-400" style={{ color: '#9AA3C4' }}>
          <ArrowLeft className="size-3.5" /> 返回设置
        </Link>

        <div className="flex items-center gap-3">
          <Shield className="size-5" style={{ color: '#F0C66A' }} />
          <h1 className="display-serif text-2xl gold-text">审计日志</h1>
          <span className="text-xs" style={{ color: '#6A7299' }}>共 {total} 条</span>
        </div>

        {error && (
          <GlassPanel padding="md">
            <p className="text-sm" style={{ color: '#F87171' }}>加载失败：{error.message}</p>
          </GlassPanel>
        )}

        {isLoading && (
          <GlassPanel padding="md">
            <p className="text-sm" style={{ color: '#9AA3C4' }}>加载中…</p>
          </GlassPanel>
        )}

        {!isLoading && items.length === 0 && (
          <GlassPanel padding="md">
            <p className="text-sm text-center py-8" style={{ color: '#6A7299' }}>暂无审计记录</p>
          </GlassPanel>
        )}

        {items.length > 0 && (
          <GlassPanel padding="none">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2142' }}>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#9AA3C4' }}>时间</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#9AA3C4' }}>操作者</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#9AA3C4' }}>动作</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#9AA3C4' }}>对象</th>
                  <th className="text-left px-4 py-3 text-xs" style={{ color: '#9AA3C4' }}>变更</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-amber-900/5" style={{ borderBottom: '1px solid #12182E' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6A7299' }}>
                      {new Date(e.timestamp).toLocaleString('zh-CN', { hour12: false })}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#EAEEFB' }}>{e.actor}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#F0C66A' }}>{e.action}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          background: `${TARGET_COLORS[e.targetType] ?? '#6A7299'}22`,
                          color: TARGET_COLORS[e.targetType] ?? '#9AA3C4',
                          border: `1px solid ${TARGET_COLORS[e.targetType] ?? '#6A7299'}44`,
                        }}
                      >
                        {TARGET_LABELS[e.targetType] ?? e.targetType}
                      </span>
                      <span className="ml-2" style={{ color: '#9AA3C4' }}>{e.targetId.slice(0, 16)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9AA3C4' }}>
                      {e.afterState ? JSON.stringify(e.afterState).slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs" style={{ color: '#9AA3C4' }}>
            <span>第 {currentPage} / {totalPages} 页</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="rounded px-3 py-1.5 disabled:opacity-30"
                style={{ background: 'rgba(15,20,40,0.7)', border: '1px solid #1A2142' }}
              >
                上一页
              </button>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={currentPage >= totalPages}
                className="rounded px-3 py-1.5 disabled:opacity-30"
                style={{ background: 'rgba(15,20,40,0.7)', border: '1px solid #1A2142' }}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
