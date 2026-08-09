import { expect, test } from '@playwright/test';
import { seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? '/chaotang';

const ASK_QUESTION = '客户要求正式报价，要不要发？';

const BRIEFING = {
  dailyReport: {
    taskTotal: 2,
    pendingDecisions: 1,
    runningCount: 0,
    completedToday: 1,
  },
  importantEvents: [],
  pendingDecisions: [
    {
      memorialId: 'm-1',
      dept: '军机处',
      title: '客户要对外承诺',
      summary: '先核验授权与边界。',
      priority: 'urgent',
      urgent: true,
    },
  ],
  recommendations: [],
  recentMemorials: [],
  recentTasks: [],
};

const RUN_RESPONSE = {
  success: true,
  data: {
    taskId: 'ui-to-edict-task',
    status: 'completed',
    isAsync: false,
    edict: {
      run_id: 'ui-to-edict-study',
      source_mode: 'LIVE',
      title: '正式报价是否发出',
      verdict: '建议先补充付款条件与授权链。',
      summary: '当前材料不足以支撑对外承诺，建议补齐边界后再下令。',
      departments: [
        {
          dept: 'finance',
          name: '户部',
          opinion: '需确认财务授权与回款条款。',
          confidence: 0.91,
          status: 'completed',
          run_id: 'run-hubu',
        },
      ],
      evidence: [
        {
          label: '用户旨意',
          value: ASK_QUESTION,
          source: 'study_input',
        },
      ],
      risks: ['付款条件缺失'],
      next_actions: [
        {
          type: 'dispatch',
          label: '补齐付款条款',
          target: '/finance-intel-loop',
          owner: '户部',
        },
      ],
      quality_gate: {
        status: 'needs_review',
        score: 0.73,
        reasons: ['payment_term_required'],
        human_signoff_required: true,
      },
      created_at: '2026-07-19T01:00:00.000Z',
    },
  },
};

test('上书房真点击：输入问题后生成 study 契约圣旨', async ({ page }) => {
  test.setTimeout(90_000);
  await seedSession(page);
  await page.route('**/api/chaotang/study/briefing', (route) =>
    route.fulfill({ json: { success: true, data: BRIEFING } }),
  );

  let received: Record<string, unknown> | null = null;
  await page.route('**/api/chaotang/study/run', (route) => {
    received = route.request().postDataJSON() as Record<string, unknown>;
    route.fulfill(RUN_RESPONSE);
  });

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });

  const askInput = page.getByPlaceholder('写明要解决的问题和事实边界……');
  await expect(askInput).toBeVisible({ timeout: 30_000 });
  await askInput.fill(ASK_QUESTION);
  await page.getByRole('button', { name: '先干跑（dry_run）' }).click();

  await expect(page.getByText('正式报价是否发出')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('建议先补充付款条件与授权链。')).toBeVisible();
  expect(received?.command).toBe(ASK_QUESTION);
  expect(received?.mode).toBe('dry_run');
});
