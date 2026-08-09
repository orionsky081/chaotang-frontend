import { expect, test } from '@playwright/test';

import { seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH
  ?? process.env.NEXT_PUBLIC_BASE_PATH
  ?? '/chaotang';

const REPLY = {
  conclusion: '尚未完成现场观赛安排，票务真实性仍待核验。',
  fulfillment_matrix: {
    schema_version: 'fulfillment.v1',
    mission_id: 'mission-premier-league',
    objective_restatement: '安排现场观看英超球赛',
    criterion_results: [
      {
        criterion_id: 'criterion-ticket',
        criterion: '取得带来源和采集时间的票务实况',
        status: 'unverifiable',
        execution_artifact_refs: ['artifact://ticket-search'],
        domain_evidence_refs: [],
        independent_evidence_refs: [],
        verifier_findings: ['官方渠道尚未返回可用性'],
        confidence: 0.42,
        gap_or_next_action: '由锦衣卫刷新官方渠道的价格和余票状态',
      },
      {
        criterion_id: 'criterion-visa',
        criterion: '形成签证与入境办理清单',
        status: 'achieved',
        execution_artifact_refs: ['artifact://visa-plan'],
        domain_evidence_refs: ['evidence://visa-rules'],
        independent_evidence_refs: [],
        verifier_findings: ['已列出申请材料、办理步骤和时限'],
        confidence: 0.9,
        gap_or_next_action: null,
      },
    ],
    disagreements: [],
    unknowns: ['开球时间可能调整'],
    residual_risks: ['票务价格波动'],
    recommended_next_action: '先核验票务',
    completion_status: 'incomplete',
  },
  key_reasons: ['票务无独立证据', '预算仍待圣裁', '赛程可能调整', '第四条不得显示'],
  evidence_refs: ['evidence://case'],
  risk_level: 'MEDIUM',
  uncertainty_level: 'HIGH',
  foresight_brief_refs: [],
  budget_and_timeline: { currency: 'GBP', total_estimate: '1800-2400', duration_days: 5 },
  alternatives: [],
  disagreements: [],
  matters_for_imperial_decision: ['是否接受预算上限'],
  next_step: '核验票务后再呈报',
  truth_label: 'MULTI_AGENT_WORKFLOW',
  department_memorials: [
    {
      department_id: 'hu_bu',
      position: '预算可承受',
      key_findings: ['预算上限已核算'],
      evidence_refs: ['evidence://budget'],
      red_flags: [],
      unresolved_questions: [],
      dissent: [],
      recommendation: '同意呈报',
      office_result_refs: ['proof://budget'],
    },
  ],
  verification_records: [
    {
      criterion: '取得带来源和采集时间的票务实况',
      verifier_department_id: 'jin_yi_wei',
      verification_ref: `sha256:${'a'.repeat(64)}`,
      outcome: 'UNAVAILABLE',
      evidence_refs: [],
      findings: ['官方渠道尚未返回可用性'],
    },
  ],
  council_review: null,
  agent_contributions: {
    status: 'UNAVAILABLE',
    contributions: [],
    unavailable_reason: '当前运行没有权威 Agent 贡献归因记录',
  },
  archive_ref: {
    status: 'UNSEALED',
    archive_id: null,
    ref: null,
  },
};

test('皇帝在呈报页一次看到丞相结论、三条理由、下一步和逐项证据', async ({ page }) => {
  await seedSession(page);
  await page.route('**/api/court/shangshufang/kernel/runs/**', (route) => route.fulfill({
    json: {
      runtime_authority: 'LANGGRAPH',
      run_id: 'premier-league',
      revision: 7,
      status: 'report_ready',
      chancellor_message: '丞相统一回奏已形成。',
      permitted_actions: ['WAIT_FOR_REPLY'],
      reply: REPLY,
    },
  }));
  await page.goto(`${BASE_PATH}/task/premier-league/report`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('chancellor-unified-reply')).toBeVisible();
  await expect(page.getByTestId('runtime-authority')).toHaveText('LANGGRAPH 唯一权威');
  await expect(page.getByTestId('reply-conclusion')).toHaveText(REPLY.conclusion);
  await expect(page.getByTestId('reply-key-reasons').locator('li')).toHaveCount(3);
  await expect(page.getByText('第四条不得显示')).toHaveCount(0);
  await expect(page.getByTestId('reply-next-action')).toContainText(REPLY.next_step);
  const criteria = page.getByTestId('reply-criteria');
  await expect(criteria.getByText('取得带来源和采集时间的票务实况')).toBeVisible();
  await expect(
    criteria.getByText('由锦衣卫刷新官方渠道的价格和余票状态'),
  ).toBeVisible();
  await expect(page.getByTestId('reply-completion-status')).toContainText('后端总判定');
  await expect(page.getByTestId('travel-decision-brief')).toBeVisible();
  await expect(page.getByTestId('ticket-intelligence')).toContainText('票务实况');
  await expect(page.getByTestId('budget-plan')).toContainText('1800-2400');
  await expect(page.getByTestId('visa-plan')).toContainText('申请材料、办理步骤和时限');
  await expect(page.getByText(/不下单、不锁座、不付款/)).toBeVisible();
  await expect(page.getByTestId('reply-completion-status')).toContainText('未完整兑现');
  await page.getByText(/展开完整案卷/).click();
  await expect(page.getByText('预算可承受')).toBeVisible();
  await expect(page.getByText('锦衣卫核验', { exact: true })).toBeVisible();
  await expect(page.getByText(/权威 Agent 贡献归因记录/)).toBeVisible();
  await expect(page.getByText('尚未封存')).toBeVisible();
  if (process.env.CHAOTANG_CAPTURE_SCREENSHOTS === '1') {
    await page.screenshot({
      path: 'dev/screenshots/chancellor-unified-reply.png',
      fullPage: true,
    });
  }
});

test('没有后端统一回奏时页面拒绝自行拼出完成结论', async ({ page }) => {
  await seedSession(page);
  await page.route('**/api/court/shangshufang/kernel/runs/**', (route) => route.fulfill({
    json: {
      runtime_authority: 'LANGGRAPH',
      run_id: 'premier-league',
      revision: 7,
      status: 'report_ready',
      chancellor_message: '尚未形成回奏。',
      permitted_actions: [],
      reply: null,
    },
  }));

  await page.goto(`${BASE_PATH}/task/premier-league/report`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('回奏尚未形成')).toBeVisible();
  await expect(page.getByText(/不会根据任务状态或零散部门结果/)).toBeVisible();
  await expect(page.getByTestId('chancellor-unified-reply')).toHaveCount(0);
});
