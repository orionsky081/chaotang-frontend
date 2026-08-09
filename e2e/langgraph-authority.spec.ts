import { expect, test } from '@playwright/test';

import { seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH
  ?? process.env.NEXT_PUBLIC_BASE_PATH
  ?? '/chaotang';

test('上书房报价证据包只写入 LangGraph 权威入口', async ({ page }) => {
  await seedSession(page);
  let intakeBody: Record<string, unknown> | null = null;
  let legacyWriteCount = 0;
  await page.route('**/api/chaotang/study/briefing', (route) => route.fulfill({
    json: { success: true, data: {} },
  }));
  await page.route('**/api/court/shangshufang/draft-edict', (route) => {
    legacyWriteCount += 1;
    return route.fulfill({ status: 500, json: { error: 'legacy must not run' } });
  });
  await page.route('**/api/court/shangshufang/confirm-edict', (route) => {
    legacyWriteCount += 1;
    return route.fulfill({ status: 500, json: { error: 'legacy must not run' } });
  });
  await page.route('**/api/court/shangshufang/kernel/intake', (route) => {
    intakeBody = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      json: {
        runtime_authority: 'LANGGRAPH',
        run_id: 'run-langgraph-authority',
        revision: 1,
        status: 'QUEUED',
        chancellor_message: '臣已领旨。',
        permitted_actions: ['WAIT_FOR_REPLY'],
        reply: null,
      },
    });
  });
  await page.route('**/api/court/shangshufang/kernel/runs/run-langgraph-authority', (route) => route.fulfill({
    json: {
      runtime_authority: 'LANGGRAPH',
      run_id: 'run-langgraph-authority',
      revision: 1,
      status: 'QUEUED',
      chancellor_message: '臣已领旨。',
      permitted_actions: ['WAIT_FOR_REPLY'],
      reply: null,
    },
  }));

  await page.goto(`${BASE_PATH}/shangshufang?skipOnboarding=1`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('shangshufang-pilot')).toHaveAttribute(
    'data-pilot-ready',
    'true',
  );
  await page.getByLabel('试点证据包编号').fill('case-001-evidence-v1');
  await page.getByPlaceholder('直接说您的裁决：准、驳回、补证或让谁先办。').fill(
    '请审核该新能源设备项目是否可以正式报价。',
  );
  await page.getByRole('button', { name: '下旨并启动 LangGraph' }).click();

  await expect(page).toHaveURL(/\/task\/run-langgraph-authority\/report/);
  await expect(page.getByText('回奏尚未形成')).toBeVisible();
  expect(intakeBody?.request_text).toBe(
    '请审核该新能源设备项目是否可以正式报价。',
  );
  expect(intakeBody?.evidence_pack_id).toBe('case-001-evidence-v1');
  expect(String(intakeBody?.idempotency_key)).toMatch(/^court-intake:/);
  expect(legacyWriteCount).toBe(0);
});
