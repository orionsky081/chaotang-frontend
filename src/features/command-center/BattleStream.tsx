'use client';

import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ScrollText, Server, Users } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { swrFetcher } from '@/lib/api';

export interface MinisterRow {
  agentCode: string;
  name: string;
  status: string;
  opinion: string;
}

export interface GroupCard {
  groupId: string;
  name: string;
  status: string;
  liveText: string;
  summary?: string;
}

export interface RiskBanner {
  level: string;
  label: string;
  detail: string;
}

export interface MemorialSnapshot {
  memorialId?: string;
  runId?: string;
  qualityScore?: number;
  streamStatus: string;
}

interface BackendCouncilRow {
  agentCode?: string;
  name?: string;
  opinion?: string;
  qualityScore?: number;
  status?: string;
}

interface BackendGroupRun {
  groupId?: string;
  name?: string;
  status?: string;
  aggregateSummary?: string;
}

interface BackendTaskExecution {
  task?: {
    id?: string;
    title?: string;
    rawCommand?: string;
    status?: string;
    finalReportId?: string | null;
    result?: Record<string, unknown>;
  };
  council?: BackendCouncilRow[];
  groupRuns?: BackendGroupRun[];
  runId?: string | null;
}

function readRisks(result: Record<string, unknown> | undefined): RiskBanner[] {
  const value = result?.risks;
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === 'string') {
      return [{ level: 'reported', label: item, detail: '' }];
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const risk = item as Record<string, unknown>;
    const label = typeof risk.label === 'string'
      ? risk.label
      : typeof risk.title === 'string'
        ? risk.title
        : `风险 ${index + 1}`;
    return [{
      level: typeof risk.level === 'string' ? risk.level : 'reported',
      label,
      detail: typeof risk.detail === 'string' ? risk.detail : '',
    }];
  });
}

function terminalStatus(status: string | undefined): boolean {
  return ['completed', 'done', 'report_ready', 'reviewed', 'archived', 'failed', 'error'].includes(status ?? '');
}

export interface BattleStreamProps {
  taskId: string;
  onMinistersChange?: (ministers: MinisterRow[]) => void;
  onRisksChange?: (risks: RiskBanner[]) => void;
  onGroupsChange?: (groups: GroupCard[]) => void;
  onCouncilSummaryChange?: (summary: string | undefined) => void;
  onMemorialChange?: (memorial: MemorialSnapshot) => void;
}

export function BattleStream({
  taskId,
  onMinistersChange,
  onRisksChange,
  onGroupsChange,
  onCouncilSummaryChange,
  onMemorialChange,
}: BattleStreamProps) {
  const { data, error, isLoading, mutate } = useSWR<BackendTaskExecution>(
    taskId ? `/api/chaotang/tasks/${encodeURIComponent(taskId)}` : null,
    swrFetcher<BackendTaskExecution>,
    {
      refreshInterval: (latest) => terminalStatus(latest?.task?.status) ? 0 : 2_000,
      revalidateOnFocus: true,
    },
  );

  const ministers = useMemo<MinisterRow[]>(() => (data?.council ?? []).map((row, index) => ({
    agentCode: row.agentCode ?? `minister-${index}`,
    name: row.name ?? row.agentCode ?? `参审大臣 ${index + 1}`,
    status: row.status ?? 'unknown',
    opinion: row.opinion ?? '',
  })), [data?.council]);

  const groups = useMemo<GroupCard[]>(() => (data?.groupRuns ?? []).map((row, index) => ({
    groupId: row.groupId ?? `group-${index}`,
    name: row.name ?? row.groupId ?? `执行组 ${index + 1}`,
    status: row.status ?? 'unknown',
    liveText: '',
    summary: row.aggregateSummary,
  })), [data?.groupRuns]);

  const risks = useMemo(() => readRisks(data?.task?.result), [data?.task?.result]);
  const summary = typeof data?.task?.result?.summary === 'string'
    ? data.task.result.summary
    : undefined;
  const executionStatus = data?.task?.status ?? (isLoading ? 'loading' : 'unknown');
  const memorial: MemorialSnapshot = {
    memorialId: data?.task?.finalReportId ?? undefined,
    runId: data?.runId ?? undefined,
    streamStatus: executionStatus,
  };

  useEffect(() => onMinistersChange?.(ministers), [ministers, onMinistersChange]);
  useEffect(() => onGroupsChange?.(groups), [groups, onGroupsChange]);
  useEffect(() => onRisksChange?.(risks), [risks, onRisksChange]);
  useEffect(() => onCouncilSummaryChange?.(summary), [summary, onCouncilSummaryChange]);
  useEffect(() => onMemorialChange?.(memorial), [
    memorial.memorialId,
    memorial.runId,
    memorial.streamStatus,
    onMemorialChange,
  ]);

  if (error && !data) {
    return (
      <GlassPanel variant="danger" className="flex min-h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#F5E9C9]">后端任务状态读取失败</p>
          <p className="mt-2 text-xs text-white/40">{error.message}</p>
          <button type="button" onClick={() => void mutate()} className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs text-white/60">重试</button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <GlassPanel variant="gold" hudCorners>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-eyebrow">JSON REST · 后端执行快照</div>
            <div className="mt-2 text-lg font-semibold text-[#F5E9C9]">{data?.task?.title ?? '正在读取后端案卷'}</div>
            <p className="mt-2 text-xs leading-6 text-white/45">{data?.task?.rawCommand || taskId}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#F0C66A]/30 bg-[#F0C66A]/10 px-3 py-1.5 text-xs text-[#F0C66A]">
            <Server className="h-3.5 w-3.5" />
            {executionStatus}
          </div>
        </div>
      </GlassPanel>

      {isLoading && !data && (
        <GlassPanel className="flex min-h-40 items-center justify-center">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin text-[#F0C66A]" />
          <span className="text-sm text-white/45">轮询后端任务状态…</span>
        </GlassPanel>
      )}

      {ministers.length > 0 && (
        <GlassPanel>
          <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-[#6BA0FF]" /><h2 className="section-title">大臣回奏</h2></div>
          <div className="space-y-2">
            {ministers.map((item) => (
              <div key={item.agentCode} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex justify-between gap-3"><span className="text-sm text-[#F5E9C9]">{item.name}</span><span className="text-[10px] text-white/40">{item.status}</span></div>
                {item.opinion && <p className="mt-2 text-xs leading-6 text-white/50">{item.opinion}</p>}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {groups.length > 0 && (
        <GlassPanel>
          <div className="mb-3 flex items-center gap-2"><Server className="h-4 w-4 text-[#3DD68C]" /><h2 className="section-title">蜂群执行</h2></div>
          <div className="space-y-2">
            {groups.map((item) => (
              <div key={item.groupId} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex justify-between gap-3"><span className="text-sm text-[#F5E9C9]">{item.name}</span><span className="text-[10px] text-white/40">{item.status}</span></div>
                {item.summary && <p className="mt-2 text-xs leading-6 text-white/50">{item.summary}</p>}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {risks.length > 0 && (
        <GlassPanel variant="danger">
          <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#F5A524]" /><h2 className="section-title">后端风险回报</h2></div>
          <div className="space-y-2">
            {risks.map((item, index) => (
              <div key={`${item.label}-${index}`} className="rounded-lg border border-[#F43F5E]/20 bg-[#F43F5E]/5 p-3">
                <div className="text-sm text-[#F6A5B2]">{item.label}</div>
                {item.detail && <p className="mt-1 text-xs text-white/50">{item.detail}</p>}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {data && ministers.length === 0 && groups.length === 0 && risks.length === 0 && (
        <GlassPanel className="py-12 text-center">
          <p className="text-sm text-white/45">后端已返回任务状态，当前尚无大臣、蜂群或风险明细。</p>
        </GlassPanel>
      )}

      {memorial.memorialId && (
        <GlassPanel variant="success">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3"><ScrollText className="h-5 w-5 text-[#3DD68C]" /><div><div className="text-sm font-semibold text-[#F5E9C9]">后端奏折已生成</div><div className="mt-1 font-mono text-[10px] text-white/35">{memorial.memorialId}</div></div></div>
            <Link href="/reports" className="rounded-md border border-[#3DD68C]/30 bg-[#3DD68C]/10 px-3 py-2 text-xs text-[#3DD68C]">查看奏折</Link>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
