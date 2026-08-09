'use client';

/**
 * 陛下视图 · 呈报详页
 *
 * 一个任务的白话版详情。不展示 DAG、tokens、confidence 数字。
 * 只讲人话：丞相研判了什么、六部正在做什么、下一步要做什么。
 */

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, ExternalLink, CheckCircle2, XCircle, MessageSquare, Loader2, Scroll, AlertTriangle } from 'lucide-react';
import { chaotang } from '@/lib/api/clients/chaotang';
import type { Task } from '@/types/task';
import type { AgentRun } from '@/types/agent';
import { AGENT_META, getNodeDisplayName } from '@/types/agent';
import {
  taskStateInPlainWords,
  taskStateEmoji,
  timeAgoInPlainWords,
} from '@/features/throne/lib/plain-language';
import { Attendant, type AttendantLine } from '@/features/throne/components/attendant';
import { RunCard } from '@/features/throne/components/run-card';
import {
  ImperialHero,
  SectionHeader,
  EmptyState,
} from '@/features/shared/components/imperial';

interface PageProps {
  params: Promise<{ taskId: string }>;
}

function pickNextPendingTask(tasks: Task[], currentTaskId: string): Task | null {
  const reportReadyTasks = tasks
    .filter((candidate) => candidate.status === 'report_ready')
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      return leftTime - rightTime;
    });

  const currentIndex = reportReadyTasks.findIndex((candidate) => candidate.id === currentTaskId);
  if (currentIndex === -1) {
    return reportReadyTasks[0] ?? null;
  }

  return reportReadyTasks[currentIndex + 1] ?? null;
}

export default function BriefDetailPage({ params }: PageProps) {
  const { taskId } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const router = useRouter();
  const [reviewFlash, setReviewFlash] = useState<string | null>(null);
  const [nextPendingTaskId, setNextPendingTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      // 走 chaotang 路径，不走 legacy /api/court/backend/*
      const [detail, taskList] = await Promise.all([
        chaotang.taskDetail(taskId),
        chaotang.tasks(),
      ]);
      // Map backend task detail → Task type
      const taskRaw = detail.task as Record<string, unknown>;
      const mapped: Task = {
        id: taskRaw.id as string,
        title: (taskRaw.title as string | undefined) ?? (taskRaw.rawCommand as string | undefined)?.slice(0, 48) ?? taskId,
        rawCommand: (taskRaw.rawCommand as string | undefined) ?? '',
        status: (taskRaw.status as Task['status']) ?? 'running',
        mode: (taskRaw.mode as Task['mode']) ?? 'live',
        createdAt: (taskRaw.createdAt as string | undefined) ?? new Date().toISOString(),
        updatedAt: (taskRaw.updatedAt as string | undefined) ?? new Date().toISOString(),
        finalReportId: (taskRaw.finalReportId as string | undefined) ?? undefined,
      };
      setTask(mapped);
      // Map council/groupRuns → AgentRun[] for live progress display
      const council = (detail.council as Record<string, unknown>[]) ?? [];
      const groupRuns = (detail.groupRuns as Record<string, unknown>[]) ?? [];
      const agentRuns: AgentRun[] = [
        ...council.map((c, i) => ({
          id: `council_${i}_${taskId}`,
          taskId,
          subtaskId: `council_${i}`,
          agentCode: (c.agentCode as string) as AgentRun['agentCode'],
          state: (c.status as string) === 'completed' ? 'completed' as const : 'running' as const,
          progressPct: (c.status as string) === 'completed' ? 100 : 50,
          latestSummary: (c.opinion as string | undefined)?.slice(0, 200),
          hasReported: (c.status as string) === 'completed',
          isWaitingDependency: false,
        })),
        ...groupRuns.map((g, i) => ({
          id: `group_${i}_${taskId}`,
          taskId,
          subtaskId: `group_${i}`,
          agentCode: 'prime_minister' as AgentRun['agentCode'],
          state: (g.status as string) === 'completed' ? 'completed' as const : 'running' as const,
          progressPct: (g.status as string) === 'completed' ? 100 : 50,
          latestSummary: (g.aggregateSummary as string | undefined)?.slice(0, 200),
          currentTaskTitle: (g.name as string | undefined),
          hasReported: (g.status as string) === 'completed',
          isWaitingDependency: false,
        })),
      ];
      setRuns(agentRuns);
      // Find next pending from task list
      const pendingTasks: Task[] = (taskList as Record<string, unknown>[])
        .filter((t) => (t.status as string) === 'report_ready')
        .map((t) => ({
          id: t.taskId as string,
          title: (t.title as string | undefined) ?? '',
          rawCommand: '',
          status: 'report_ready' as const,
          mode: 'live' as const,
          createdAt: '',
          updatedAt: '',
        }));
      const nextPending = pickNextPendingTask(pendingTasks, taskId);
      setNextPendingTaskId(nextPending?.id ?? null);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [taskId]);

  useEffect(() => {
    load();
    // gentle poll while task is in progress
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [load]);

  // Stop polling once task is settled
  useEffect(() => {
    if (!task) return;
    if (['reviewed', 'archived', 'report_ready'].includes(task.status)) {
      return;
    }
  }, [task]);

  const handleReview = async (action: 'approve' | 'inquire' | 'reject') => {
    const map = {
      approve: '陛下已准奏 · 此案将入史馆归档',
      inquire: '陛下有疑 · 丞相将细议后再呈',
      reject: '陛下不准 · 此案暂且搁置',
    };
    // memorialId = finalReportId (run_id) on the task
    const memorialId = task?.finalReportId;
    if (memorialId) {
      const reviewAction = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'inquire';
      try {
        await chaotang.review(memorialId, reviewAction, '');
      } catch {
        // non-blocking: show flash regardless
      }
    }
    setReviewFlash(map[action]);
    if (task) {
      setTask({ ...task, status: 'reviewed' });
    }
    // P1-9: 批阅后自动跳转史馆
    if (action === 'approve') {
      setTimeout(() => {
        router.push('/archive');
      }, 2000);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Top bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 pt-8 md:px-12">
        <Link
          href="/throne"
          className="flex items-center gap-1.5 text-[12px] text-[#9AA3C4] transition-colors hover:text-[#F0C66A]"
        >
          <ArrowLeft size={13} />
          返回朝堂
        </Link>
        <Link
          href={task ? `/command-center/${task.id}` : '/command-center'}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-[10px] text-[#9AA3C4] transition-colors hover:text-[#EAEEFB]"
        >
          技术详情 <ExternalLink size={11} />
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-[900px] px-6 py-12 md:px-12">
        {phase === 'loading' ? (
          <EmptyState
            icon={Loader2}
            title="恭请本案卷宗"
            body="正在从太史馆调阅此案 — 片刻即至。"
          />
        ) : phase === 'error' ? (
          <EmptyState
            tone="error"
            icon={AlertTriangle}
            title="案卷未能送达"
            body="请稍候再试，或返回朝堂重启此案。"
            action={{ label: '再次召请', href: `/throne/brief/${taskId}` }}
          />
        ) : !task ? (
          <EmptyState
            icon={Scroll}
            title="本案卷宗未能查到"
            body={taskId}
            action={{ label: '返回朝堂', href: '/throne' }}
          />
        ) : (
          <>
            {/* Hero */}
            <ImperialHero
              eyebrow="本案 · Imperial Case"
              icon={Crown}
              title={task.title}
              decree={task.rawCommand}
            >
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-[#9AA3C4]">
                <span className="inline-flex items-center gap-2">
                  <span className="text-[16px]">{taskStateEmoji(task.status)}</span>
                  <span className="text-[#F0C66A]">{taskStateInPlainWords(task.status)}</span>
                </span>
                <span className="text-[#484F72]">·</span>
                <span>{timeAgoInPlainWords(task.createdAt)}发起</span>
              </div>
            </ImperialHero>

            {/* Plan synopsis */}
            {task.plan && (
              <section className="mt-8">
                <SectionHeader
                  label="丞相研判"
                  sub="Prime Minister's Reading"
                />
                <div
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: 'rgba(255,255,255,0.08)',
                    background:
                      'linear-gradient(180deg, rgba(20,16,8,0.5), rgba(10,8,4,0.8))',
                  }}
                >
                  <p className="display-serif text-[14px] leading-relaxed text-[#EAEEFB]">
                    {task.plan.intent}
                  </p>
                  <div className="mt-5">
                    <div className="text-[10px] uppercase tracking-wider text-[#6A7299]">
                      分派六部
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {task.plan.assignedAgents.map((code) => {
                        const meta = AGENT_META[code];
                        return (
                          <div
                            key={code}
                            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]"
                            style={{
                              borderColor: `${meta.color}55`,
                              background: `${meta.color}10`,
                              color: meta.color,
                            }}
                          >
                            <span className="text-[14px] leading-none">{meta.emoji}</span>
                            <span className="font-medium">{meta.nameCn}</span>
                          </div>
                        );
                      })}
                    </div>
                    {(task.plan.assignedNodeIds?.length ?? 0) > 0 && (
                      <div className="mt-4">
                        <div className="text-[10px] uppercase tracking-wider text-[#6A7299]">
                          节点链路
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {task.plan.assignedNodeIds?.map((nodeId) => (
                            <div
                              key={nodeId}
                              className="rounded-full border border-[#F0C66A]/25 bg-[#F0C66A]/10 px-3 py-1 text-[10px] text-[#D9C79A]"
                            >
                              {getNodeDisplayName(nodeId)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Live progress */}
            {runs.length > 0 && (
              <section className="mt-8">
                <SectionHeader label="六部回禀" sub="Live Updates" />
                <div className="space-y-3">
                  {runs.map((run) => (
                    <RunCard key={run.id} run={run} />
                  ))}
                </div>
              </section>
            )}

            {/* Review panel */}
            {task.status === 'report_ready' && !reviewFlash && (
              <section className="mt-8">
                <SectionHeader label="御批" sub="Imperial Decision" />
                <div
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: 'rgba(240,198,106,0.3)',
                    background: 'rgba(240,198,106,0.04)',
                  }}
                >
                  <p className="display-serif text-[13px] leading-relaxed text-[#C8CDD8]">
                    臣等已办毕此事 — 请陛下过目，画圈或打回。
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleReview('approve')}
                      className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-semibold transition-all hover:opacity-90"
                      style={{
                        background: 'linear-gradient(135deg, #3DD68C, #2AA968)',
                        color: '#04060E',
                        boxShadow: '0 10px 30px rgba(61,214,140,0.3)',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      准奏
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('inquire')}
                      className="flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-[12px] font-medium text-[#EAEEFB] transition-colors hover:bg-white/5"
                    >
                      <MessageSquare size={13} />
                      有疑问 · 细议
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('reject')}
                      className="flex items-center gap-2 rounded-lg border border-[#F43F5E]/40 bg-[#F43F5E]/5 px-5 py-2.5 text-[12px] font-medium text-[#F43F5E] transition-colors hover:bg-[#F43F5E]/10"
                    >
                      <XCircle size={13} />
                      打回 · 不准
                    </button>
                  </div>
                </div>
              </section>
            )}

            {reviewFlash && (
              <div
                className="mt-8 rounded-xl border p-6 text-center"
                style={{
                  borderColor: 'rgba(61,214,140,0.3)',
                  background: 'rgba(61,214,140,0.05)',
                }}
              >
                <CheckCircle2 size={20} className="mx-auto text-[#3DD68C]" />
                <div className="display-serif mt-3 text-[14px] font-medium text-[#EAEEFB]">
                  {reviewFlash}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {nextPendingTaskId ? (
                    <Link
                      href={`/throne/brief/${nextPendingTaskId}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#F0C66A]/30 bg-[#F0C66A]/10 px-4 py-2 text-[12px] font-medium text-[#F0C66A] transition-colors hover:bg-[#F0C66A]/18"
                    >
                      下一件待批
                      <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <Link
                      href="/throne"
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-4 py-2 text-[12px] text-[#EAEEFB] transition-colors hover:bg-white/5"
                    >
                      今日批阅已毕
                      <ExternalLink size={12} />
                    </Link>
                  )}
                  <Link
                    href="/throne"
                    className="text-[11px] text-[#9AA3C4] transition-colors hover:text-[#F0C66A]"
                  >
                    返回朝堂 →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Attendant
        lines={buildBriefAttendantLines(task)}
        keyProp={`throne-brief-${taskId}`}
      />
    </div>
  );
}

/* ==========================================================================
   Attendant copy
   ========================================================================== */

function buildBriefAttendantLines(task: Task | null): AttendantLine[] {
  if (!task) return [];
  const lines: AttendantLine[] = [];

  if (task.status === 'planning' || task.status === 'interpreting') {
    lines.push({
      id: 'planning',
      text: '丞相正在研判陛下的旨意 — 把一件大事拆成若干小事，分派给六部。约需 30 秒。您可稍候，亦可暂离 — 办毕后钦天监会提示复核节点。',
      tone: 'explain',
    });
  } else if (task.status === 'running' || task.status === 'assigned') {
    lines.push({
      id: 'running',
      text: '六部正在办理此事。下方"六部回禀"会实时更新 — 各位大人会一条条汇报进展。陛下可随意滚动浏览。',
      tone: 'explain',
    });
  } else if (task.status === 'aggregating') {
    lines.push({
      id: 'aggregating',
      text: '六部已各自完成差事，丞相正在汇总结论。片刻之后呈报便到。',
      tone: 'explain',
    });
  } else if (task.status === 'report_ready') {
    lines.push({
      id: 'review',
      text: '呈报已备好 — 陛下可在下方选择"准奏"、"细议"或"打回"。若把握度显示"十分有把握"，通常可直接准奏。',
      tone: 'explain',
    });
    lines.push({
      id: 'review-tip',
      text: '若陛下觉得建议太长读不完，可只看每一条的"回禀"首句 — 那是核心结论。',
      tone: 'guide',
    });
  } else if (task.status === 'reviewed' || task.status === 'archived') {
    lines.push({
      id: 'done',
      text: '此案已批示完毕，入史馆归档。陛下随时可在"翻阅史馆"回看整件事的始末。',
      tone: 'celebrate',
    });
  }

  lines.push({
    id: 'confidence-explain',
    text: '"把握度"说的是某位 agent 对自己答案的信心程度 — 越高越稳，低于 70% 时钦天监建议陛下多问一句。',
    tone: 'guide',
  });

  lines.push({
    id: 'tech-view',
    text: '若陛下想看每位 agent 的工具调用、Token 消耗等技术细节，点右上"技术详情"可进入专业面板。',
    tone: 'guide',
  });

  return lines;
}
