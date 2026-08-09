import { expect, test } from '@playwright/test';
import { seedSession } from './fixtures';

/**
 * 回归护栏 · 上书房 study 合约（3 栏版本）
 * 覆盖与旧版不兼容的关键点：
 * 1) briefing 使用 /api/chaotang/study/briefing。
 * 2) dry_run / live 走 /api/chaotang/study/run。
 * 3) 页面主面板与圣旨渲染可见。
 */
const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? '/chaotang';

const BRIEFING = {
  dailyReport: {
    taskTotal: 4,
    pendingDecisions: 2,
    runningCount: 1,
    completedToday: 1,
  },
  importantEvents: [
    {
      dept: '军机处',
      title: '客户要求正式报价，需会审边界',
      tag: '待裁 · 紧急',
      priority: 'urgent',
      at: '今晨',
    },
  ],
  pendingDecisions: [
    {
      memorialId: 'verdict-m-1',
      dept: '户部',
      title: '客户报价是否发出',
      summary: '正式报价可能构成对外承诺，需先核成本与授权边界。',
      priority: 'urgent',
      urgent: true,
    },
  ],
  recommendations: [
    {
      icon: 'scroll',
      title: '先行 dry_run',
      detail: '先做风险透视，再决定是否正式下旨。',
      actionHref: '/court-briefing',
    },
  ],
  recentMemorials: [],
  recentTasks: [],
};

const SAMPLE_EDICT = {
  run_id: 'study-live-smoke',
  source_mode: 'FALLBACK',
  title: '是否可对外正式报价',
  verdict: '建议暂缓外发，补齐授权与付款条件。',
  summary: '基于当前材料，报价仍有边界风险，建议先补齐凭证。',
  departments: [
    {
      dept: 'finance',
      name: '户部',
      opinion: '补齐授权与利润边界。',
      confidence: 0.83,
      status: 'pending',
      run_id: 'r-finance',
    },
  ],
  evidence: [
    {
      label: '用户意图',
      value: '正式报价',
      source: 'study_input',
    },
  ],
  risks: ['付款条件缺失'],
  next_actions: [
    {
      type: 'archive',
      label: '归档待复核材料',
      target: '/shiguan',
      owner: '史馆',
    },
  ],
  quality_gate: {
    status: 'needs_review',
    score: 0.72,
    reasons: ['missing_evidence'],
    human_signoff_required: true,
  },
  created_at: '2026-07-01T00:00:00.000Z',
  run_status: 'completed',
};

async function gotoBriefing(page) {
  await seedSession(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('courtos.onboarded', '1');
    window.localStorage.setItem('courtos.first-decree-seeded', '1');
  });
  await page.route('**/api/chaotang/study/briefing', (route) =>
    route.fulfill({ json: { success: true, data: BRIEFING } }),
  );
}

test('上书房能按 study 契约加载日报与待裁决列表', async ({ page }) => {
  await gotoBriefing(page);
  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: '上书房' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('后端今日要务')).toBeVisible();
  await expect(page.getByText('今日总量')).toBeVisible();
  await expect(page.getByText('4')).toBeVisible();
  await expect(page.getByText('待裁决')).toBeVisible();
  await expect(page.getByText('客户要求正式报价，需会审边界')).toBeVisible();
});

test('dry_run 按钮会发起 study run 并回填圣旨', async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await gotoBriefing(page);
  await page.route('**/api/chaotang/study/run', (route) => {
    payload = route.request().postDataJSON() as Record<string, unknown>;
    route.fulfill({
      json: {
        success: true,
        data: {
          taskId: 'e2e-task',
          status: 'completed',
          isAsync: false,
          edict: SAMPLE_EDICT,
        },
      },
    });
  });

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('textbox').fill('客户要求正式报价，要不要发？');
  await page.getByRole('button', { name: '先干跑（dry_run）' }).click();

  await expect(page.getByText(SAMPLE_EDICT.title)).toBeVisible({ timeout: 20_000 });
  expect(payload?.mode).toBe('dry_run');
  expect(payload?.command).toBe('客户要求正式报价，要不要发？');
});

test('live 按钮会带 asyncRun=true 的 live 模式', async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await gotoBriefing(page);
  await page.route('**/api/chaotang/study/run', (route) => {
    payload = route.request().postDataJSON() as Record<string, unknown>;
    route.fulfill({
      json: {
        success: true,
        data: {
          taskId: 'e2e-task-live',
          status: 'accepted',
          isAsync: true,
          edict: SAMPLE_EDICT,
        },
      },
    });
  });

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('textbox').fill('客户要求正式报价，要不要发？');
  await page.getByRole('button', { name: '正式下旨（live + async）' }).click();

  await expect(page.getByText(SAMPLE_EDICT.title)).toBeVisible({ timeout: 20_000 });
  expect(payload?.mode).toBe('live');
  expect(payload?.asyncRun).toBe(true);
});
