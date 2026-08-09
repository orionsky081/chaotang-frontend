import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseDadianBriefing,
  resolveDadianBriefingState,
  selectDadianNextAction,
} from './live-briefing.ts';

const LIVE_BRIEFING = {
  dailyReport: {
    memorialTotal: 3,
    pendingDecisions: 2,
    handledToday: 1,
  },
  pendingDecisions: [
    { memorialId: 'memorial-1', title: '批准英国观赛计划' },
  ],
  recommendations: [
    {
      title: '优先处理紧急事项',
      detail: '今日 2 件待裁决',
      actionHref: '/court-briefing',
    },
  ],
  recentTasks: [
    { taskId: 'task/a b', title: '核验签证材料', status: 'running' },
  ],
};

test('解析后端真实 briefing 字段，不用静态兜底补造事项', () => {
  const briefing = parseDadianBriefing(LIVE_BRIEFING);
  assert.equal(briefing.pendingDecisionCount, 2);
  assert.equal(briefing.runningCount, 1);
  assert.equal(briefing.recommendations[0]?.title, '优先处理紧急事项');
  assert.equal(briefing.pendingDecisions[0]?.memorialId, 'memorial-1');
});

test('加载、错误、成功空态和真实就绪态边界互不混淆', () => {
  assert.equal(
    resolveDadianBriefingState({ data: LIVE_BRIEFING, isLoading: true, error: new Error('late') }).status,
    'loading',
  );
  assert.equal(
    resolveDadianBriefingState({ data: LIVE_BRIEFING, isLoading: false, error: new Error('offline') }).status,
    'error',
  );
  assert.equal(
    resolveDadianBriefingState({ data: {}, isLoading: false, error: null }).status,
    'empty',
  );
  assert.equal(
    resolveDadianBriefingState({ data: LIVE_BRIEFING, isLoading: false, error: null }).status,
    'ready',
  );
});

test('御前底栏优先展示待裁决，而不是被执行中任务抢占', () => {
  const action = selectDadianNextAction(parseDadianBriefing(LIVE_BRIEFING));
  assert.equal(action.role, '御前');
  assert.match(action.notice, /2 件待裁决/);
  assert.equal(action.href, '/court-briefing');
  assert.equal(action.activeStep, 2);
});

test('没有待裁决时链接到真实执行任务，taskId 必须安全编码', () => {
  const briefing = parseDadianBriefing({
    dailyReport: { pendingDecisions: 0 },
    recentTasks: [{ taskId: 'task/a b', title: '核验签证材料', status: 'running' }],
  });
  const action = selectDadianNextAction(briefing);
  assert.equal(action.role, '丞相');
  assert.equal(action.href, '/command-center?taskId=task%2Fa%20b');
  assert.equal(action.activeStep, 1);
});

test('真实成功但无事项时明确为空态，不伪装为后端离线', () => {
  const state = resolveDadianBriefingState({ data: {}, isLoading: false, error: null });
  assert.equal(state.status, 'empty');
  if (state.status !== 'empty') throw new Error('expected empty briefing');
  assert.deepEqual(selectDadianNextAction(state.briefing), {
    role: '丞相',
    notice: '今日暂无待办，可从上书房拟旨',
    href: '/court-briefing',
    activeStep: -1,
  });
});
