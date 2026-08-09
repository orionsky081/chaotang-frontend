import { expect, test } from '@playwright/test';
import { seedSession } from './fixtures';
import { ZStudyEdict } from '../src/lib/contracts/study-edict';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? '/chaotang';

/**
 * 该 spec 为 fixture 渲染契约，不做真链路证明。
 * 它验证两件事：
 *   1) fixture 数据与 ZStudyEdict 保持一致（防 mock 与形状漂移）。
 *   2) /court-briefing 在 study 契约数据与 run 回执下能渲染预期结构。
 */

const TRUE_LOOP_BRIEFING = {
  dailyReport: {
    taskTotal: 1,
    pendingDecisions: 1,
    runningCount: 0,
    completedToday: 0,
  },
  importantEvents: [
    {
      dept: '军机处',
      title: '真实闭环第一案',
      tag: '经营信号 · 待决策',
      priority: 'urgent',
      at: '今晨',
    },
  ],
  pendingDecisions: [
    {
      memorialId: 'true-loop-memorial',
      dept: '军机处',
      title: '100MWh 冷库储能项目是否推进',
      summary: '客户有明确意向，但报价、交期和风险边界需要后端蜂群给出证据。',
      priority: 'urgent',
      urgent: true,
    },
  ],
  recommendations: [
    {
      icon: 'scroll',
      title: '交军机处会审',
      detail: '优先处理交付边界与付款条件后再对外承诺。',
      actionHref: '/court-briefing',
    },
  ],
  recentMemorials: [],
  recentTasks: [
    {
      taskId: 'study-live-true-loop',
      title: '100MWh 冷库储能项目是否推进',
      status: 'running',
      progressPct: 55,
    },
  ],
};

const TRUE_LOOP_EDICT = {
  run_id: 'study-live-true-loop',
  source_mode: 'LIVE_SWARM',
  title: '100MWh 冷库储能项目是否推进',
  verdict: '需人工复核',
  summary: '后端蜂群已经形成第一轮证据，但报价和客户承诺需要人工确认。',
  departments: [
    {
      dept: 'ops',
      name: '军机处',
      opinion: '已创建执行任务卡，等待户部和工部补证。',
      confidence: 0.86,
      status: 'completed',
      run_id: 'run-command-center',
    },
    {
      dept: 'finance',
      name: '户部',
      opinion: '需要补齐成本和毛利底线。',
      confidence: 0.82,
      status: 'completed',
      run_id: 'run-hubu',
    },
    {
      dept: 'engineering',
      name: '工部',
      opinion: '需要确认交期、BOM 和供应约束。',
      confidence: 0.79,
      status: 'completed',
      run_id: 'run-gongbu',
    },
  ],
  evidence: [
    { label: '用户旨意', value: '判断 100MWh 冷库储能项目是否推进', source: 'study_input' },
    { label: '真实蜂群会话', value: 'study-live-true-loop', source: 'swarm_orchestrator' },
    { label: '史馆复盘入口', value: '/api/swarm/sessions/study-live-true-loop', source: 'swarm_replay_artifact' },
    { label: '报价缺证旧案', value: '同类项目曾因报价缺证被退回', source: 'archive' },
  ],
  risks: ['报价、交期、客户承诺属于不可逆边界，必须人工签字。'],
  next_actions: [
    {
      type: 'dispatch',
      label: '交军机处立项',
      target: '/command-center?taskId=study-live-true-loop',
      owner: '军机处',
    },
    {
      type: 'archive',
      label: '史馆保留 replay artifact',
      target: '/shiguan?taskId=study-live-true-loop',
      owner: '史馆',
    },
  ],
  quality_gate: {
    status: 'needs_review',
    score: 0.81,
    reasons: ['live_swarm_session_completed', 'human_signoff_required_for_customer_commitment'],
    human_signoff_required: true,
  },
  run_adapter: {
    name: 'swarm_orchestrator',
    session_id: 'study-live-true-loop',
    entry_swarm: 'ai_ops',
    status: 'completed',
    run_count: 3,
    completed_count: 3,
    replay_artifact: {
      kind: 'swarm_session',
      session_id: 'study-live-true-loop',
      path: 'swarm_sessions/study-live-true-loop.json',
      api_path: '/api/swarm/sessions/study-live-true-loop',
      owner: 'shiguan',
    },
  },
  created_at: '2026-06-08T00:10:00.000Z',
};

test.describe('上书房 LIVE_SWARM edict 渲染契约 (fixture-driven · 非真链路验证)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('courtos.onboarded', '1');
      window.localStorage.setItem('courtos.first-decree-seeded', '1');
    });
    await page.route('**/api/chaotang/study/briefing', (route) =>
      route.fulfill({ json: { success: true, data: TRUE_LOOP_BRIEFING } }),
    );
    await page.route('**/api/chaotang/study/run', (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            taskId: 'study-live-true-loop',
            status: 'completed',
            isAsync: false,
            edict: TRUE_LOOP_EDICT,
          },
        },
      }),
    );
  });

  test('fixture conforms to ZStudyEdict', () => {
    expect(() => ZStudyEdict.parse(TRUE_LOOP_EDICT)).not.toThrow();
  });

  test('给定注入的 LIVE_SWARM edict，UI 能正确渲染主要字段', async ({ page }) => {
    await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: '上书房' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('textbox').fill('100MWh 冷库储能项目是否推进');
    await page.getByRole('button', { name: '先干跑（dry_run）' }).click();

    await expect(page.getByText(TRUE_LOOP_EDICT.title)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('LIVE_SWARM')).toBeVisible();
    await expect(page.getByText('军机处')).toBeVisible();
    await expect(page.getByText('真实蜂群会话')).toBeVisible();
    await expect(page.getByText('study-live-true-loop')).toBeVisible();
    await expect(page.getByText('needs_review · 81分 · 需人工圣裁', { exact: true })).toBeVisible();
  });
});
