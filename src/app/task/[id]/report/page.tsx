'use client';

import { use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';

import { DataState } from '@/components/DataState';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PageHeaderShell } from '@/components/PageHeaderShell';
import { swrFetcher } from '@/lib/api';
import type { CourtRunPublicResult } from '@/lib/contracts/fulfillment';
import { ChancellorReplyView } from '@/features/court-console/chancellor-reply/ChancellorReplyView';
import { CourtDecisionCommandPanel } from '@/features/court-console/chancellor-reply/CourtDecisionCommandPanel';
import { CourtArchiveCommandPanel } from '@/features/court-console/chancellor-reply/CourtArchiveCommandPanel';
import { OutcomePanel } from '@/features/court-console/outcomes/OutcomePanel';
import {
  extractChancellorReply,
  projectChancellorReply,
} from '@/features/court-console/chancellor-reply/chancellor-reply-projection';

export default function TaskReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const path = `/api/court/shangshufang/kernel/runs/${encodeURIComponent(id)}`;
  const { data, error, isLoading, mutate } = useSWR<CourtRunPublicResult, Error>(
    path,
    swrFetcher<CourtRunPublicResult>,
  );
  const reply = useMemo(() => extractChancellorReply(data), [data]);
  const projection = useMemo(() => reply ? projectChancellorReply(reply) : null, [reply]);
  const poll = useCallback(() => mutate(), [mutate]);

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ color: '#EAEEFB' }}>
      <PageHeaderShell
        title="御前回奏"
        subtitle="皇帝只与丞相交互；此处一次呈现六部结论、逐项证据与下一步"
        breadcrumbs={[
          { label: '丞相台', href: '/prime' },
          { label: `任务 ${id}`, href: `/task/${encodeURIComponent(id)}` },
          { label: '呈报' },
        ]}
        actions={(
          <Link
            href={`/task/${encodeURIComponent(id)}`}
            className="rounded border border-[#F0C66A]/25 px-3 py-1.5 text-xs text-[#D9C79A] transition-colors hover:bg-[#F0C66A]/[0.06]"
          >
            返回任务概览
          </Link>
        )}
      />

      <DataState loading={isLoading} error={error} empty={!data} onRetry={() => void mutate()}>
        {data && projection && (
          <div className="space-y-4">
            <ChancellorReplyView
              reply={projection}
              runtimeAuthority={data.runtime_authority}
            />
            <CourtDecisionCommandPanel
              runId={data.run_id}
              status={data.status}
              permittedActions={data.permitted_actions}
              onPoll={poll}
            />
            <CourtArchiveCommandPanel
              runId={data.run_id}
              status={data.status}
              permittedActions={data.permitted_actions}
              onPoll={poll}
            />
            <OutcomePanel runId={data.run_id} />
          </div>
        )}
        {data && !projection && (
          <GlassPanel padding="md" variant="gold" hudCorners>
            <div className="page-eyebrow mb-2">回奏尚未形成</div>
            <p className="text-sm leading-7 text-[#D5B979]">
              丞相尚未从后端取得统一回奏。页面不会根据任务状态或零散部门结果自行拼出“已完成”结论。
            </p>
            <p className="page-meta mt-2">当前任务状态：{data.status}</p>
          </GlassPanel>
        )}
      </DataState>
    </main>
  );
}
