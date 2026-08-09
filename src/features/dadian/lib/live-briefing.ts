export interface DadianRecommendation {
  title: string;
  detail: string;
  actionHref: string;
}

export interface DadianPendingDecision {
  memorialId: string;
  title: string;
}

export interface DadianRecentTask {
  taskId: string;
  title: string;
  status: string;
}

export interface DadianBriefing {
  pendingDecisionCount: number;
  runningCount: number;
  recommendations: DadianRecommendation[];
  pendingDecisions: DadianPendingDecision[];
  recentTasks: DadianRecentTask[];
}

export type DadianBriefingState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty'; briefing: DadianBriefing }
  | { status: 'ready'; briefing: DadianBriefing };

export interface DadianNextAction {
  role: string;
  notice: string;
  href: string;
  activeStep: -1 | 0 | 1 | 2 | 3;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function parseDadianBriefing(value: unknown): DadianBriefing {
  const raw = isRecord(value) ? value : {};
  const daily = isRecord(raw.dailyReport) ? raw.dailyReport : {};

  const pendingDecisions = records(raw.pendingDecisions)
    .map((item) => ({
      memorialId: text(item.memorialId),
      title: text(item.title),
    }))
    .filter((item) => item.memorialId && item.title);

  const recentTasks = records(raw.recentTasks)
    .map((item) => ({
      taskId: text(item.taskId),
      title: text(item.title),
      status: text(item.status),
    }))
    .filter((item) => item.taskId && item.title);

  const recommendations = records(raw.recommendations)
    .map((item) => ({
      title: text(item.title),
      detail: text(item.detail),
      actionHref: text(item.actionHref) || '/court-briefing',
    }))
    .filter((item) => item.title);

  const runningFromTasks = recentTasks.filter((task) =>
    ['running', 'queued', 'pending'].includes(task.status.toLowerCase()),
  ).length;

  return {
    pendingDecisionCount:
      finiteNumber(daily.pendingDecisions) || pendingDecisions.length,
    runningCount: finiteNumber(daily.runningCount) || runningFromTasks,
    recommendations,
    pendingDecisions,
    recentTasks,
  };
}

export function resolveDadianBriefingState({
  data,
  isLoading,
  error,
}: {
  data: unknown;
  isLoading: boolean;
  error: unknown;
}): DadianBriefingState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error' };

  const briefing = parseDadianBriefing(data);
  const hasLiveWork =
    briefing.pendingDecisionCount > 0
    || briefing.runningCount > 0
    || briefing.recommendations.length > 0
    || briefing.pendingDecisions.length > 0
    || briefing.recentTasks.length > 0;

  return hasLiveWork
    ? { status: 'ready', briefing }
    : { status: 'empty', briefing };
}

export function selectDadianNextAction(briefing: DadianBriefing): DadianNextAction {
  const pending = briefing.pendingDecisions[0];
  if (briefing.pendingDecisionCount > 0 || pending) {
    const count = briefing.pendingDecisionCount || briefing.pendingDecisions.length;
    return {
      role: '御前',
      notice: pending ? `${count} 件待裁决 · ${pending.title}` : `${count} 件奏折待裁决`,
      href: '/court-briefing',
      activeStep: 2,
    };
  }

  const running = briefing.recentTasks.find((task) =>
    ['running', 'queued', 'pending'].includes(task.status.toLowerCase()),
  );
  if (briefing.runningCount > 0 || running) {
    const count = briefing.runningCount || 1;
    return {
      role: '丞相',
      notice: running ? `${count} 项执行中 · ${running.title}` : `${count} 项旨意正在办理`,
      href: running
        ? `/command-center?taskId=${encodeURIComponent(running.taskId)}`
        : '/command-center',
      activeStep: 1,
    };
  }

  const latest = briefing.recentTasks[0];
  if (latest) {
    return {
      role: '史馆',
      notice: `最近办结 · ${latest.title}`,
      href: `/command-center?taskId=${encodeURIComponent(latest.taskId)}`,
      activeStep: 3,
    };
  }

  return {
    role: '丞相',
    notice: '今日暂无待办，可从上书房拟旨',
    href: '/court-briefing',
    activeStep: -1,
  };
}
