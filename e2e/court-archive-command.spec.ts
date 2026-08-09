import { expect, test } from '@playwright/test';

import { seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH
  ?? process.env.NEXT_PUBLIC_BASE_PATH
  ?? '/chaotang';

const REPLY = {
  conclusion: '御前裁决已经生效，案件已具备签封条件。',
  fulfillment_matrix: null,
  key_reasons: ['批准版本与证据身份已经冻结'],
  evidence_refs: ['evidence://quote-1'],
  risk_level: 'MEDIUM',
  uncertainty_level: 'LOW',
  foresight_brief_refs: [],
  budget_and_timeline: {},
  alternatives: [],
  disagreements: [],
  matters_for_imperial_decision: [],
  next_step: '签封归档并等待史馆确认',
  truth_label: 'MULTI_AGENT_WORKFLOW',
  department_memorials: [],
  verification_records: [],
  council_review: null,
  agent_contributions: null,
  archive_ref: {
    status: 'UNSEALED',
    archive_id: null,
    ref: null,
  },
};

test('批准回奏二次确认签封，入队后轮询至后端确认归档', async ({ page }) => {
  await seedSession(page);
  let getCount = 0;
  let browserCommand: Record<string, unknown> | null = null;
  let allowArchived = false;

  await page.route('**/api/court/shangshufang/kernel/runs/run-archive**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      browserCommand = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: {
          success: true,
          data: {
            run_id: 'run-archive',
            outbox_id: 'outbox-archive-1',
            revision: 7,
            status: 'QUEUED',
            command_kind: 'COURT_ARCHIVE',
            runtime: 'langgraph_court',
          },
          error: null,
        },
      });
      return;
    }
    getCount += 1;
    const archived = allowArchived;
    await route.fulfill({
      json: {
        runtime_authority: 'LANGGRAPH',
        run_id: 'run-archive',
        revision: archived ? 8 : 7,
        status: archived ? 'ARCHIVED' : 'APPROVED',
        chancellor_message: archived ? '本案已签封入史馆。' : '裁决已生效，等待签封。',
        permitted_actions: archived ? [] : ['WAIT_FOR_ARCHIVE'],
        reply: archived
          ? {
            ...REPLY,
            next_step: '史馆归档已完成',
            archive_ref: {
              status: 'SEALED',
              archive_id: 'archive-1',
              ref: 'court-archive://archive-1',
            },
          }
          : REPLY,
      },
    });
  });

  await page.goto(`${BASE_PATH}/task/run-archive/report`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('court-archive-open-confirmation')).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({
    path: 'dev/screenshots/court-archive-approved-desktop.png',
    fullPage: true,
  });

  await page.getByTestId('court-archive-open-confirmation').click();
  await expect(page.getByTestId('court-archive-confirmation')).toContainText(
    '不能覆盖本次归档',
  );
  expect(browserCommand).toBeNull();

  await page.getByTestId('court-archive-confirm').click();
  await expect(page.getByTestId('court-archive-status')).toContainText(
    '已入队',
  );
  await expect(page.getByTestId('court-archive-status')).not.toContainText(
    '已完成签封归档',
  );
  expect(browserCommand).toEqual({
    idempotency_key: expect.any(String),
  });
  expect(Object.keys(browserCommand ?? {})).toEqual(['idempotency_key']);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'dev/screenshots/court-archive-queued-mobile.png',
    fullPage: true,
  });

  allowArchived = true;
  await expect(page.getByTestId('court-archive-status')).toContainText(
    '已完成签封归档',
    { timeout: 8_000 },
  );
  await expect.poll(() => getCount).toBeGreaterThan(1);
});
