'use client';

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { chaotang } from '@/lib/api/clients/chaotang';

interface BackendTaskDetail {
  task?: {
    id?: string;
    title?: string;
    rawCommand?: string;
    status?: string;
    mode?: string;
    createdAt?: string;
    updatedAt?: string;
    result?: Record<string, unknown>;
  };
  council?: Array<{
    agentCode?: string;
    name?: string;
    opinion?: string;
    status?: string;
  }>;
  runId?: string | null;
}

export default function ScribeDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const { data, error, isLoading, mutate } = useSWR<BackendTaskDetail, Error>(
    `scribe-task:${taskId}`,
    () => chaotang.taskDetail(taskId) as Promise<BackendTaskDetail>,
  );
  const task = data?.task;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/scribe" className="inline-flex items-center gap-1.5 text-[11px] text-[#6A7299] hover:text-[#F0C66A]">
            <ArrowLeft size={12} /> 返回史馆
          </Link>
          <button type="button" onClick={() => void mutate()} className="rounded border border-white/10 px-3 py-1.5 text-[11px] text-[#B8C0DA]">
            刷新后端案卷
          </button>
        </div>

        {isLoading ? <Status copy="正在读取后端案卷…" /> : null}
        {error ? <Status copy={`后端案卷不可读：${error.message}`} danger /> : null}
        {!isLoading && !error && !task ? <Status copy="后端未返回该任务案卷。" /> : null}

        {task ? (
          <>
            <GlassPanel variant="gold" tone="elevated" padding="lg" hudCorners>
              <div className="flex items-start gap-3">
                <ScrollText size={18} className="mt-1 shrink-0 text-[#F0C66A]" />
                <div className="min-w-0">
                  <div className="page-eyebrow">BACKEND CASE FILE · {task.id ?? taskId}</div>
                  <h1 className="page-title mt-2">{task.title || '后端未提供标题'}</h1>
                  <div className="page-meta mt-2">
                    状态 {task.status || '未知'} · 模式 {task.mode || '未知'} · run {data?.runId || '未提供'}
                  </div>
                </div>
              </div>
              <p className="body-copy mt-5 whitespace-pre-wrap rounded-md border border-white/5 bg-black/20 p-4">
                {task.rawCommand || '后端未提供任务原文'}
              </p>
            </GlassPanel>

            <GlassPanel tone="elevated" padding="md">
              <div className="section-eyebrow">COUNCIL RECORD · 后端会审</div>
              <div className="mt-3 space-y-3">
                {(data?.council ?? []).length === 0 ? (
                  <p className="body-copy">后端尚未返回会审记录。</p>
                ) : (
                  data?.council?.map((entry, index) => (
                    <div key={`${entry.agentCode ?? entry.name ?? 'council'}-${index}`} className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                      <div className="text-[11px] text-[#F0C66A]">{entry.name || entry.agentCode || '未署名'} · {entry.status || '未知状态'}</div>
                      <p className="body-copy mt-2 whitespace-pre-wrap">{entry.opinion || '后端未提供意见正文'}</p>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>

            <div className="flex flex-wrap gap-3">
              <Link href={`/command-center?taskId=${encodeURIComponent(task.id ?? taskId)}`} className="rounded-md border border-[#F0C66A]/35 bg-[#F0C66A]/10 px-3 py-2 text-[11px] text-[#F0C66A]">
                去军机处看真实执行
              </Link>
              <Link href="/reports" className="rounded-md border border-white/10 px-3 py-2 text-[11px] text-[#B8C0DA]">
                查看后端报告
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Status({ copy, danger = false }: { copy: string; danger?: boolean }) {
  return (
    <GlassPanel tone="deep" padding="md">
      <p className={danger ? 'text-[12px] text-[#F58B8B]' : 'text-[12px] text-[#8A92AC]'}>{copy}</p>
    </GlassPanel>
  );
}
