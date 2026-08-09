import { expect, test } from '@playwright/test';

import { seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH
  ?? process.env.NEXT_PUBLIC_BASE_PATH
  ?? '/chaotang';

const REPLY = {
  conclusion: '报价边界与交付风险已完成会审，待最终裁决。',
  fulfillment_matrix: null,
  key_reasons: ['毛利底线已核验'],
  evidence_refs: ['evidence://quote-1'],
  risk_level: 'HIGH',
  uncertainty_level: 'MEDIUM',
  foresight_brief_refs: [],
  budget_and_timeline: {},
  alternatives: [],
  disagreements: [],
  matters_for_imperial_decision: ['是否准许进入正式报价'],
  next_step: '由最终裁决人准奏、补证或驳回',
  truth_label: 'MULTI_AGENT_WORKFLOW',
  department_memorials: [],
  verification_records: [],
  council_review: null,
  agent_contributions: null,
  archive_ref: null,
};

test('回奏页只提交用户意图，入队后不宣称已裁决并持续刷新', async ({ page }) => {
  await seedSession(page);
  let getCount = 0;
  let terminal = false;
  let browserCommand: Record<string, unknown> | null = null;

  await page.route('**/api/court/shangshufang/kernel/runs/run-decision**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      browserCommand = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: {
          success: true,
          data: {
            run_id: 'run-decision',
            outbox_id: 'outbox-decision-1',
            revision: 7,
            status: 'QUEUED',
            command_kind: 'COURT_DECISION',
            runtime: 'langgraph_court',
          },
          error: null,
        },
      });
      return;
    }
    getCount += 1;
    await route.fulfill({
      json: {
        runtime_authority: 'LANGGRAPH',
        run_id: 'run-decision',
        revision: 7,
        status: terminal ? 'APPROVED' : 'AWAITING_HUMAN',
        chancellor_message: '回奏已呈，请裁断关键事项。',
        permitted_actions: ['APPROVE', 'REQUEST_EVIDENCE', 'REJECT', 'AMEND_CONSTRAINTS'],
        reply: REPLY,
      },
    });
  });

  await page.goto(`${BASE_PATH}/task/run-decision/report`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('court-decision-approve')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId('court-decision-request_evidence')).toBeVisible();
  await expect(page.getByTestId('court-decision-reject')).toBeVisible();
  await page.screenshot({
    path: 'dev/screenshots/court-decision-awaiting-human-desktop.png',
    fullPage: true,
  });

  await page.getByTestId('court-decision-reason').fill('利润底线与交付边界均已复核');
  await page.getByTestId('court-decision-exception-confirm').check();
  await page.getByTestId('court-business-exception-reason').fill('战略首单需突破利润底线');
  await page.getByTestId('court-business-exception-risk_exposure').fill('预计毛利损失 20 万元');
  await page.getByTestId('court-business-exception-owner').fill('销售总监');
  await page.getByTestId('court-business-exception-remediation').fill('签约前取得供应商降本承诺');
  await page.getByTestId('court-business-exception-review_date').fill('2026-08-15');
  expect(browserCommand).toBeNull();

  await page.getByTestId('court-decision-approve').click();
  await expect(page.getByTestId('court-decision-queued')).toContainText('已入队');
  await expect(page.getByTestId('court-decision-queued')).not.toContainText('已裁决');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('court-decision-queued')).toBeVisible();
  await page.screenshot({
    path: 'dev/screenshots/court-decision-queued-mobile.png',
    fullPage: true,
  });

  expect(browserCommand).toMatchObject({
    action: 'APPROVE',
    reason: '利润底线与交付边界均已复核',
    business_exception: {
      reason: '战略首单需突破利润底线',
      risk_exposure: '预计毛利损失 20 万元',
      owner: '销售总监',
      remediation: '签约前取得供应商降本承诺',
      review_date: '2026-08-15',
    },
  });
  expect(Object.keys(browserCommand ?? {}).sort()).toEqual([
    'action',
    'business_exception',
    'idempotency_key',
    'reason',
  ]);
  await expect.poll(() => getCount).toBeGreaterThan(1);
  terminal = true;
  await expect(page.getByTestId('court-decision-queued')).toContainText('APPROVED');
  const terminalReadCount = getCount;
  await page.waitForTimeout(2_000);
  expect(getCount).toBe(terminalReadCount);
});
