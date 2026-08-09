import { expect, test } from '@playwright/test';

import { seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH
  ?? process.env.NEXT_PUBLIC_BASE_PATH
  ?? '/chaotang';

const REPLY = {
  conclusion: '报价决策已经完成并签封，现进入结果观察期。',
  fulfillment_matrix: null,
  key_reasons: ['报价基线已冻结'],
  evidence_refs: ['evidence://quote-42'],
  risk_level: 'MEDIUM',
  uncertainty_level: 'LOW',
  foresight_brief_refs: [],
  budget_and_timeline: {},
  alternatives: [],
  disagreements: [],
  matters_for_imperial_decision: [],
  next_step: '按观察窗回填独立实测',
  truth_label: 'MULTI_AGENT_WORKFLOW',
  department_memorials: [],
  verification_records: [],
  council_review: null,
  agent_contributions: null,
  archive_ref: {
    status: 'SEALED',
    archive_id: 'archive-outcome-1',
    ref: 'court-archive://archive-outcome-1',
  },
};

const metric = (
  name: 'gross_margin' | 'delivery_days' | 'payment_days',
  expected: number,
  unit: string,
) => ({
  prediction_id: `prediction-${name}`,
  metric: name,
  metric_unit: unit,
  expected_value: expected,
  observation_window: '2026-08-01T00:00:00Z/2026-09-01T00:00:00Z',
  status: 'PENDING',
  actual_value: null,
  signed_delta: null,
  observed_at: null,
  observation_ref: null,
});

test('结果卡从封印 PENDING 入队，经状态轮询后刷新为 RECORDED 偏差', async ({ page }) => {
  await seedSession(page);
  let browserCommand: Record<string, unknown> | null = null;
  let statusReads = 0;
  let completed = false;

  await page.route('**/api/court/shangshufang/kernel/runs/run-outcome**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith('/outcomes/requests/outbox-outcome-1')) {
      statusReads += 1;
      if (statusReads >= 2) completed = true;
      await route.fulfill({
        json: {
          success: true,
          data: {
            run_id: 'run-outcome',
            outbox_id: 'outbox-outcome-1',
            status: completed ? 'COMPLETED' : 'PENDING',
            result_ref: completed ? 'outcome://gross-margin-1' : null,
          },
          error: null,
        },
      });
      return;
    }

    if (pathname.endsWith('/outcomes') && request.method() === 'POST') {
      browserCommand = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: {
          success: true,
          data: {
            run_id: 'run-outcome',
            outbox_id: 'outbox-outcome-1',
            status: 'QUEUED',
          },
          error: null,
        },
      });
      return;
    }

    if (pathname.endsWith('/outcomes')) {
      const grossMargin = metric('gross_margin', 25, '%');
      await route.fulfill({
        json: {
          success: true,
          data: {
            tenant_id: 'tenant-e2e',
            run_id: 'run-outcome',
            sealed_archive_id: 'a'.repeat(64),
            sealed_chain_hash: 'b'.repeat(64),
            metrics: [
              completed
                ? {
                    ...grossMargin,
                    status: 'RECORDED',
                    actual_value: 22.5,
                    signed_delta: -2.5,
                    observed_at: '2026-08-20T02:30:00Z',
                    observation_ref: 'outcome://gross-margin-1',
                  }
                : grossMargin,
              {
                ...metric('delivery_days', 30, 'days'),
                status: 'RECORDED',
                actual_value: 28,
                signed_delta: -2,
                observed_at: '2026-08-19T00:00:00Z',
                observation_ref: 'outcome://delivery-1',
              },
              metric('payment_days', 45, 'days'),
            ],
          },
          error: null,
        },
      });
      return;
    }

    await route.fulfill({
      json: {
        runtime_authority: 'LANGGRAPH',
        run_id: 'run-outcome',
        revision: 9,
        status: 'ARCHIVED',
        chancellor_message: '本案已签封，等待结果观察。',
        permitted_actions: [],
        reply: REPLY,
      },
    });
  });

  await page.goto(`${BASE_PATH}/task/run-outcome/report`, {
    waitUntil: 'domcontentloaded',
  });

  const panel = page.getByTestId('outcome-panel');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('outcome-metric-gross_margin')).toContainText('毛利');
  await expect(page.getByTestId('outcome-metric-delivery_days')).toContainText('交付');
  await expect(page.getByTestId('outcome-metric-payment_days')).toContainText('回款');
  await expect(page.getByTestId('outcome-metric-gross_margin')).toContainText('待观察');
  await expect(page.getByTestId('outcome-metric-delivery_days')).toContainText('已记录');
  await expect(page.getByTestId('outcome-metric-delivery_days')).toContainText('outcome://delivery-1');

  await page.getByTestId('outcome-source-artifact').fill('artifact://erp/quote-42');
  await page.getByTestId('outcome-actual-value').fill('22.5');
  await page.getByTestId('outcome-observed-at').fill('2026-08-20T10:30');
  await page.getByTestId('outcome-submit').click();

  await expect(page.getByTestId('outcome-request-status')).toContainText('COMPLETED', {
    timeout: 8_000,
  });
  await expect(page.getByTestId('outcome-metric-gross_margin')).toContainText('已记录');
  await expect(page.getByTestId('outcome-delta-gross_margin')).toContainText('-2.5');
  await expect(page.getByTestId('outcome-metric-gross_margin')).toContainText(
    'outcome://gross-margin-1',
  );

  expect(browserCommand).not.toBeNull();
  expect(Object.keys(browserCommand ?? {}).sort()).toEqual([
    'actual_value',
    'idempotency_key',
    'metric',
    'observed_at',
    'source_artifact_id',
  ]);
  expect(browserCommand).toMatchObject({
    source_artifact_id: 'artifact://erp/quote-42',
    metric: 'gross_margin',
    actual_value: 22.5,
    observed_at: expect.stringMatching(/Z$/),
  });
  expect(browserCommand).not.toHaveProperty('human_validated');
  expect(browserCommand).not.toHaveProperty('tenant_id');
  expect(browserCommand).not.toHaveProperty('run_id');
  expect(browserCommand).not.toHaveProperty('subject_id');
  expect(browserCommand).not.toHaveProperty('provenance_signature');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2_000);
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((element) => {
      (element as HTMLElement).style.display = 'none';
    });
  });
  await page.screenshot({
    path: 'dev/screenshots/court-outcome-recorded-mobile.png',
    fullPage: true,
  });
});
