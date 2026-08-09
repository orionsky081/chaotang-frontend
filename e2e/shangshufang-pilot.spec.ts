import { expect, test, type Page } from '@playwright/test';

import { addCookieAcrossOrigins, seedSession } from './fixtures';

const BASE_PATH = process.env.PLAYWRIGHT_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? '/chaotang';

function internalPilotReadiness() {
  return {
    profile: 'internal_supervised',
    pilotReady: true,
    productionClaimAllowed: false,
    blockers: [],
    constraints: [
      'real_agent_swarm_unavailable',
      'external_side_effects_disabled',
    ],
    decisionRuntime: {
      mode: 'restricted_deterministic',
      runtimeKind: 'deterministic_fallback',
      realAgentsEnabled: false,
      truthLabelCeiling: 'FALLBACK',
    },
    capabilities: {
      deterministicDecisionLoop: true,
      realModelDecisionLoop: false,
    },
  };
}

function unsignedRoleToken(role: 'user' | 'admin' | 'final_decider'): string {
  const payload = Buffer.from(JSON.stringify({
    user_id: 9001,
    username: `e2e-${role}`,
    tenant_slug: 'e2e-tenant',
    role,
    exp: '2100-01-01T00:00:00Z',
  })).toString('base64url');
  return `e2e-header.${payload}.e2e-signature`;
}

async function seedRoleSession(
  page: Page,
  role: 'user' | 'admin' | 'final_decider',
): Promise<void> {
  const accessToken = unsignedRoleToken(role);
  await addCookieAcrossOrigins(
    page,
    'courtos.access_token',
    accessToken,
  );
  await page.addInitScript((token) => {
    window.localStorage.setItem('courtos.auth', JSON.stringify({
      accessToken: token,
      tenantId: 1,
      username: 'e2e-role-user',
      accountType: 0,
      expiresAt: 4102444800000,
    }));
    window.localStorage.setItem('courtos.onboarded', '1');
  }, accessToken);
}

test('御前试行：区分内部可用与正式试点，并引导第一道真实旨意', async ({ page }) => {
  await seedSession(page);
  await page.route('**/api/ready', (route) => route.fulfill({
    json: {
      status: 'ok',
      version: '1.0',
      checks: {
        litellm: 'up',
        deepseek_key: 'configured',
      },
      ready: true,
      blockers: [],
      internal_pilot: internalPilotReadiness(),
      quote_pilot: {
        enabled: false,
        ready: false,
        blockers: ['quote_pilot_not_enabled'],
      },
    },
  }));

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });

  const guide = page.getByTestId('pilot-start-guide');
  await expect(guide).toHaveAttribute('data-launch-state', 'ready');
  await expect(page.getByTestId('pilot-internal-readiness')).toContainText('内部试用 · 可开始');
  await expect(page.getByTestId('pilot-formal-readiness')).toContainText('未启用（不影响内部试用）');
  await expect(guide).toContainText('第一道真实旨意');
  await expect(guide).toContainText('第一步');

  await page.getByRole('button', { name: '填入首旨模板' }).click();
  await expect(page.getByTestId('ssf-ask-input')).toHaveValue(/经营目标.*预算上限/);
  await expect(page.getByTestId('ssf-ask-input')).toHaveValue(/未经单独准奏/);
  if (process.env.CAPTURE_PILOT_SCREENSHOT === '1') {
    await page.screenshot({
      path: 'dev/screenshots/shangshufang-first-decree-guide.png',
      fullPage: true,
    });
  }
});

test('御前试行：受控证据包随拟旨提交并显示真实草案', async ({ page }) => {
  await seedSession(page);

  await page.route('**/api/ready', (route) => route.fulfill({
    status: 503,
    json: {
      status: 'degraded',
      version: '1.0',
      checks: {
        litellm: 'up',
        deepseek_key: 'configured',
      },
      ready: false,
      blockers: [
        'quote_evidence_signers_missing',
        'quote_fx_artifact_unavailable',
      ],
      internal_pilot: internalPilotReadiness(),
      quote_pilot: {
        enabled: true,
        ready: false,
        blockers: [
          'quote_evidence_signers_missing',
          'quote_fx_artifact_unavailable',
        ],
      },
    },
  }));

  let draftBody: Record<string, unknown> | null = null;
  await page.route('**/api/court/shangshufang/draft-edict', async (route) => {
    draftBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        success: true,
        data: {
          task_id: 'case-pilot-001',
          case_id: 'case-pilot-001',
          status: 'awaiting_emperor_confirm',
          source_label: 'LIVE',
          evidence_pack: {
            evidence_pack_id: 'case-001-evidence-v1',
            verification_status: 'verified',
          },
          draft_edict: {
            original_question: '请审核该新能源设备项目是否可以正式报价。',
            refined_edict: '核验项目报价、交付与合同风险后回奏。',
            decision_type: 'quotation_admission',
            known_facts: ['已登记受控证据包'],
            unknown_gaps: [],
            recommended_departments: ['户部', '工部', '刑部'],
            risk_flags: [],
            expected_memorial_format: ['一页回奏'],
            emperor_confirmation_question: '是否下旨会审？',
            source_label: 'LIVE',
          },
        },
      },
    });
  });

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('shangshufang-pilot')).toHaveAttribute('data-pilot-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('pilot-readiness-status')).toContainText('内部试用 · 可开始');
  await page.getByTestId('pilot-readiness-status').click();
  await expect(page.getByTestId('pilot-readiness-panel')).toContainText('证据签名人名册缺失');
  await expect(page.getByTestId('pilot-readiness-panel')).toContainText('汇率签名材料不可用');
  await page.getByLabel('试点证据包编号').fill('case-001-evidence-v1');
  await page.getByTestId('ssf-ask-input').fill('请审核该新能源设备项目是否可以正式报价。');
  await page.getByRole('button', { name: '拟旨' }).click();

  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('核验项目报价、交付与合同风险后回奏。');
  await expect(page.getByText('case-pilot-001')).toBeVisible();
  expect(draftBody).toMatchObject({
    raw_question: '请审核该新能源设备项目是否可以正式报价。',
    evidence_pack_id: 'case-001-evidence-v1',
  });
  if (process.env.CAPTURE_PILOT_SCREENSHOT === '1') {
    await page.waitForTimeout(1_200);
    await page.screenshot({
      path: 'dev/screenshots/shangshufang-pilot-drafted.png',
      fullPage: true,
    });
  }
});

test('御前试行：下旨轮询形成一页回奏并可准奏、驳回或补证', async ({ page }) => {
  await seedSession(page);

  const draftEdict = {
    original_question: '请审核新能源项目报价。',
    refined_edict: '核验报价后回奏。',
    decision_type: 'quotation_admission',
    known_facts: ['证据包已核验'],
    unknown_gaps: [],
    recommended_departments: ['户部', '工部', '刑部'],
    risk_flags: ['长账期'],
    expected_memorial_format: ['一页回奏'],
    emperor_confirmation_question: '是否下旨？',
    source_label: 'LIVE',
  };
  const memorial = {
    title: '新能源项目报价准入回奏',
    verdict: '建议补齐回款保障后再准奏',
    summary: '毛利可接受，但账期需要补强。',
    ministry_outputs: [
      {
        department: '户部',
        position: '补证',
        opinion: '补齐回款保障。',
        status: 'completed',
        source_label: 'LIVE',
      },
      {
        department: '工部',
        position: '可交付',
        opinion: '当前资源可以履约。',
        status: 'completed',
        source_label: 'LIVE',
      },
      {
        department: '刑部',
        position: '补证',
        opinion: '质保责任需明确。',
        status: 'completed',
        source_label: 'LIVE',
      },
    ],
    evidence_gaps: ['回款担保'],
    risk_flags: ['长账期'],
    evidence_chain: [{ title: '受控证据包', source_type: 'server_registered', confidence: 'verified' }],
    recommended_next_action: '补齐回款担保后重新会审。',
    decision_options: [
      { action: 'approve', label: '准奏', enabled: true },
      { action: 'reject', label: '驳回', enabled: true },
      { action: 'request_evidence', label: '补证', enabled: true },
    ],
    quality_gate: {
      status: 'needs_review',
      reasons: ['payment_guarantee_required'],
      human_signoff_required: true,
    },
    source_label: 'LIVE',
  };
  let decided = false;
  let decisionBody: Record<string, unknown> | null = null;

  await page.route('**/api/court/shangshufang/draft-edict', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        task_id: 'case-pilot-002',
        status: 'awaiting_emperor_confirm',
        draft_edict: draftEdict,
      },
    },
  }));
  await page.route('**/api/court/shangshufang/confirm-edict', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        task_id: 'case-pilot-002',
        status: 'awaiting_decision',
        routing_plan: {
          route_reason: '报价同时涉及利润、交付与合同责任，召集三部会审。',
        },
        memorial,
      },
    },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-pilot-002/status', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        task: {
          task_id: 'case-pilot-002',
          status: decided ? 'awaiting_evidence' : 'awaiting_decision',
          raw_question: '请审核新能源项目报价。',
          draft_edict: draftEdict,
          source_label: 'LIVE',
          risk_flags: ['长账期'],
          known_facts: ['证据包已核验'],
          unknown_gaps: [],
          missing_evidence: ['回款担保'],
          recommended_departments: ['户部', '工部', '刑部'],
          created_at: '2026-07-30T00:00:00Z',
          updated_at: decided ? '2026-07-30T00:02:00Z' : '2026-07-30T00:01:00Z',
        },
        review: {
          review_id: 'review-pilot-002',
          review_status: decided ? 'awaiting_evidence' : 'awaiting_decision',
          routing_plan: {
            route_reason: '报价同时涉及利润、交付与合同责任，召集三部会审。',
          },
          memorial,
        },
      },
    },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-pilot-002/decision', async (route) => {
    decisionBody = route.request().postDataJSON() as Record<string, unknown>;
    decided = true;
    await route.fulfill({
      json: {
        success: true,
        data: {
          task_id: 'case-pilot-002',
          status: 'awaiting_evidence',
          action: 'request_evidence',
        },
      },
    });
  });

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('shangshufang-pilot')).toHaveAttribute('data-pilot-ready', 'true', { timeout: 20_000 });
  await page.getByTestId('ssf-ask-input').fill('请审核新能源项目报价。');
  await page.getByRole('button', { name: '拟旨' }).click();
  await page.getByRole('button', { name: '下旨', exact: true }).click();

  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('建议补齐回款保障后再准奏');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('毛利可接受，但账期需要补强');
  await expect(page.getByTestId('pilot-route-reason')).toContainText('报价同时涉及利润、交付与合同责任，召集三部会审。');
  await expect(page.getByRole('button', { name: '准奏', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '驳回', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '补证', exact: true })).toBeEnabled();

  await page.getByLabel('裁决理由').fill('请补齐回款担保。');
  await page.getByRole('button', { name: '补证', exact: true }).click();
  await expect(page.getByTestId('pilot-loop-status')).toContainText('awaiting_evidence');
  expect(decisionBody).toMatchObject({
    action: 'request_evidence',
    reason: '请补齐回款担保。',
    human_confirmed: true,
  });
});

test('御前试行：服务端拒绝证据包时诚实停在错误态', async ({ page }) => {
  await seedSession(page);
  await page.route('**/api/court/shangshufang/draft-edict', (route) => route.fulfill({
    status: 422,
    json: {
      success: false,
      error: '证据包清单缺失或格式无效',
    },
  }));

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('shangshufang-pilot')).toHaveAttribute('data-pilot-ready', 'true', { timeout: 20_000 });
  await page.getByLabel('试点证据包编号').fill('missing-pack');
  await page.getByTestId('ssf-ask-input').fill('请审核新能源项目报价。');
  await page.getByRole('button', { name: '拟旨' }).click();

  await expect(page.getByTestId('pilot-loop-status')).toContainText('证据包清单缺失或格式无效');
  await expect(page.getByRole('button', { name: '下旨', exact: true })).toHaveCount(0);
});

test('御前试行：准奏成功后立即归档并明确预测快照已签封', async ({ page }) => {
  await seedSession(page);

  const draftEdict = {
    original_question: '是否准许项目进入执行？',
    refined_edict: '核验证据与风险后决定是否执行。',
    decision_type: 'execution_admission',
    known_facts: ['证据已核验'],
    unknown_gaps: [],
    recommended_departments: ['户部'],
    risk_flags: [],
    expected_memorial_format: ['一页回奏'],
    emperor_confirmation_question: '是否下旨？',
    source_label: 'LIVE',
  };
  const memorial = {
    title: '项目执行准入回奏',
    verdict: '建议准奏',
    summary: '证据与风险均满足执行条件。',
    ministry_outputs: [{
      department: '户部',
      position: '准奏',
      opinion: '预算边界清晰。',
      status: 'completed',
      source_label: 'LIVE',
    }],
    evidence_gaps: [],
    risk_flags: [],
    evidence_chain: [{ title: '受控证据包', source_type: 'server_registered' }],
    horizontal_reviews: [
      {
        institution: '锦衣卫',
        triggered: false,
        rule_id: 'quote.horizontal.jinyiwei.evidence-integrity',
        rule_version: '1.0.0',
        reasons: ['未命中异常核验条件'],
        status: 'not_triggered',
        findings: [],
        source_refs: [],
      },
      {
        institution: '钦天监',
        triggered: true,
        rule_id: 'quote.horizontal.qintianjian.forecast-risk',
        rule_version: '1.0.0',
        reasons: ['签名清单包含预测输入'],
        status: 'completed',
        findings: ['原预测必须冻结并在揭盲后计算偏差'],
        source_refs: ['manifest:case-archive-ok'],
      },
    ],
    recommended_next_action: '准奏后归档。',
    decision_options: [
      { action: 'approve', label: '准奏', enabled: true },
      { action: 'reject', label: '驳回', enabled: true },
      { action: 'request_evidence', label: '补证', enabled: true },
    ],
    quality_gate: {
      status: 'passed',
      reasons: [],
      human_signoff_required: true,
    },
    source_label: 'LIVE',
  };
  const actions: string[] = [];
  let status = 'awaiting_decision';

  await page.route('**/api/court/shangshufang/draft-edict', (route) => route.fulfill({
    json: { success: true, data: { task_id: 'case-archive-ok', status: 'awaiting_emperor_confirm', draft_edict: draftEdict } },
  }));
  await page.route('**/api/court/shangshufang/confirm-edict', (route) => route.fulfill({
    json: { success: true, data: { task_id: 'case-archive-ok', status: 'awaiting_decision', memorial } },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-archive-ok/status', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        task: {
          task_id: 'case-archive-ok',
          status,
          raw_question: draftEdict.original_question,
          draft_edict: draftEdict,
          source_label: 'LIVE',
          risk_flags: [],
          known_facts: ['证据已核验'],
          unknown_gaps: [],
          missing_evidence: [],
          recommended_departments: ['户部'],
          created_at: '2026-07-30T00:00:00Z',
          updated_at: '2026-07-30T00:01:00Z',
        },
        review: {
          review_id: 'review-archive-ok',
          review_status: status,
          memorial,
        },
      },
    },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-archive-ok/decision', async (route) => {
    const body = route.request().postDataJSON() as { action: string };
    actions.push(body.action);
    status = body.action === 'archive' ? 'archived' : 'approved';
    await route.fulfill({
      json: {
        success: true,
        data: { task_id: 'case-archive-ok', status, action: body.action },
      },
    });
  });
  await page.route('**/api/court/shangshufang/tasks/case-archive-ok/archive', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        case_id: 'case-archive-ok',
        status: 'archived',
        archive_id: 'archive-case-archive-ok',
        evidence_pack_id: 'case-archive-ok-evidence-v1',
        snapshot_hash: 'a'.repeat(64),
        chain_hash: 'b'.repeat(64),
        created_at: '2026-07-30T00:02:00Z',
        prediction_snapshot: {
          sealed: true,
          decision_as_of: '2026-07-30T00:00:00Z',
          predictions: [
            {
              prediction_type: 'gross_margin',
              status: 'available',
              expected_value: 0.2,
              unit: 'ratio',
            },
          ],
        },
      },
    },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-archive-ok/deviation-card', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        case_id: 'case-archive-ok',
        snapshot_hash: 'a'.repeat(64),
        chain_hash: 'b'.repeat(64),
        deviations: [],
      },
    },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-archive-ok/telemetry', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        case_id: 'case-archive-ok',
        effect_coverage: {
          status: 'incomplete',
          reason: 'legacy_runtime_egress_not_fully_instrumented',
        },
        measurements: {
          draft_to_memorial_elapsed: { status: 'available', value: 12_500, unit: 'ms' },
          cost: { status: 'unavailable', value: null, unit: 'currency', currency: null },
          external_reads: { status: 'partial', value: null, unit: 'reads' },
          external_mutations: { status: 'partial', value: null, unit: 'mutations' },
        },
        gates: {
          time_20_minutes: { status: 'pass', threshold_ms: 1_200_000 },
          cost_15_cny: {
            status: 'blocked',
            threshold: 15,
            currency: 'CNY',
            reason: 'provider_cost_unavailable',
          },
          external_mutations_zero: {
            status: 'blocked',
            threshold: 0,
            reason: 'effect_coverage_incomplete',
          },
          overall: { status: 'blocked' },
        },
        draft_started_at: '2026-07-30T00:00:00Z',
        memorial_completed_at: '2026-07-30T00:00:12.500Z',
      },
    },
  }));

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('shangshufang-pilot')).toHaveAttribute('data-pilot-ready', 'true', { timeout: 20_000 });
  await page.getByTestId('ssf-ask-input').fill(draftEdict.original_question);
  await page.getByRole('button', { name: '拟旨' }).click();
  await page.getByRole('button', { name: '下旨', exact: true }).click();
  await page.getByRole('button', { name: '准奏', exact: true }).click();

  await expect(page.getByTestId('pilot-decision-outcome')).toContainText('已准奏并入史馆');
  await expect(page.getByTestId('pilot-decision-outcome')).toContainText('预测快照已签封');
  await expect(page.getByTestId('pilot-provenance-mode')).toContainText('LIVE · 责任人签名材料');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('签封');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('锦衣卫 · 未触发');
  await expect(page.getByRole('button', { name: /钦天监 · 已触发 · completed/ })).toBeVisible();
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('毛利率：20.00%');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('耗时：12.5 秒');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('成本：不可用');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('副作用观测未完整');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('外部变更：不可用');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('尚未揭盲');
  await expect(page).toHaveURL(/caseId=case-archive-ok/);
  expect(actions).toEqual(['approve', 'archive']);
});

test('御前试行：准奏后归档被质量门拦截时诚实显示未归档', async ({ page }) => {
  await seedSession(page);

  const draftEdict = {
    original_question: '是否准许项目进入执行？',
    refined_edict: '核验证据与风险后决定是否执行。',
    decision_type: 'execution_admission',
    known_facts: ['证据已核验'],
    unknown_gaps: [],
    recommended_departments: ['户部'],
    risk_flags: [],
    expected_memorial_format: ['一页回奏'],
    emperor_confirmation_question: '是否下旨？',
    source_label: 'LIVE',
  };
  const memorial = {
    title: '项目执行准入回奏',
    verdict: '建议准奏',
    summary: '当前可由皇帝裁决。',
    ministry_outputs: [{
      department: '户部',
      position: '准奏',
      opinion: '预算边界清晰。',
      status: 'completed',
      source_label: 'LIVE',
    }],
    evidence_gaps: [],
    risk_flags: [],
    recommended_next_action: '准奏后归档。',
    decision_options: [{ action: 'approve', label: '准奏', enabled: true }],
    quality_gate: {
      status: 'passed',
      reasons: [],
      human_signoff_required: true,
    },
    source_label: 'LIVE',
  };
  const actions: string[] = [];
  let status = 'awaiting_decision';

  await page.route('**/api/court/shangshufang/draft-edict', (route) => route.fulfill({
    json: { success: true, data: { task_id: 'case-archive-blocked', status: 'awaiting_emperor_confirm', draft_edict: draftEdict } },
  }));
  await page.route('**/api/court/shangshufang/confirm-edict', (route) => route.fulfill({
    json: { success: true, data: { task_id: 'case-archive-blocked', status: 'awaiting_decision', memorial } },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-archive-blocked/status', (route) => route.fulfill({
    json: {
      success: true,
      data: {
        task: {
          task_id: 'case-archive-blocked',
          status,
          raw_question: draftEdict.original_question,
          draft_edict: draftEdict,
          source_label: 'LIVE',
          risk_flags: [],
          known_facts: ['证据已核验'],
          unknown_gaps: [],
          missing_evidence: [],
          recommended_departments: ['户部'],
          created_at: '2026-07-30T00:00:00Z',
          updated_at: '2026-07-30T00:01:00Z',
        },
        review: {
          review_id: 'review-archive-blocked',
          review_status: status,
          memorial,
        },
      },
    },
  }));
  await page.route('**/api/court/shangshufang/tasks/case-archive-blocked/decision', async (route) => {
    const body = route.request().postDataJSON() as { action: string };
    actions.push(body.action);
    if (body.action === 'approve') {
      status = 'approved';
      await route.fulfill({
        json: { success: true, data: { task_id: 'case-archive-blocked', status, action: body.action } },
      });
      return;
    }
    await route.fulfill({
      status: 422,
      json: { success: false, error: '预测快照尚未签封，质量门拒绝归档' },
    });
  });

  await page.goto(`${BASE_PATH}/court-briefing?skipOnboarding=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('shangshufang-pilot')).toHaveAttribute('data-pilot-ready', 'true', { timeout: 20_000 });
  await page.getByTestId('ssf-ask-input').fill(draftEdict.original_question);
  await page.getByRole('button', { name: '拟旨' }).click();
  await page.getByRole('button', { name: '下旨', exact: true }).click();
  await page.getByRole('button', { name: '准奏', exact: true }).click();

  await expect(page.getByTestId('pilot-decision-outcome')).toContainText('已准奏但未归档');
  await expect(page.getByTestId('pilot-decision-outcome')).toContainText('预测快照尚未签封，质量门拒绝归档');
  await expect(page.getByTestId('pilot-decision-outcome')).not.toContainText('已准奏并入史馆');
  expect(actions).toEqual(['approve', 'archive']);
});

test('御前试行：刷新恢复已归档案件并回填实际结果生成中文偏差卡', async ({ page }) => {
  await seedSession(page);

  const caseId = 'case-outcome-restore';
  const snapshotHash = 'c'.repeat(64);
  const chainHash = 'd'.repeat(64);
  const draftEdict = {
    original_question: '是否准许项目正式报价？',
    refined_edict: '核验报价与回款条件后决定。',
    decision_type: 'quotation_admission',
    known_facts: ['证据已核验'],
    unknown_gaps: [],
    recommended_departments: ['户部'],
    risk_flags: [],
    expected_memorial_format: ['一页回奏'],
    emperor_confirmation_question: '是否下旨？',
    source_label: 'LIVE',
  };
  const memorial = {
    title: '项目报价准入回奏',
    verdict: '建议准奏',
    summary: '毛利满足准入要求。',
    ministry_outputs: [{
      department: '户部',
      position: '准奏',
      opinion: '毛利边界清晰。',
      status: 'completed',
      source_label: 'LIVE',
    }],
    evidence_gaps: [],
    risk_flags: [],
    recommended_next_action: '准奏后归档并等待揭盲。',
    decision_options: [{ action: 'approve', label: '准奏', enabled: true }],
    quality_gate: {
      status: 'passed',
      reasons: [],
      human_signoff_required: true,
    },
    source_label: 'LIVE',
  };
  const archive = {
    case_id: caseId,
    status: 'archived',
    archive_id: `archive-${caseId}`,
    evidence_pack_id: `${caseId}-evidence-v1`,
    snapshot_hash: snapshotHash,
    chain_hash: chainHash,
    created_at: '2026-07-30T00:02:00Z',
    prediction_snapshot: {
      sealed: true,
      decision_as_of: '2026-07-30T00:00:00Z',
      qintian_role: {
        advisory_only: true,
        can_block_decision: false,
        description: '钦天监仅提供预测预警，最终裁决仍由皇帝作出。',
      },
      predictions: [{
        prediction_type: 'gross_margin',
        status: 'available',
        expected_value: 0.2,
        unit: 'ratio',
        scenarios: {
          base: {
            expected_value: 0.2,
            unit: 'ratio',
            assumptions: ['报价额与估算成本按签署清单基准值执行'],
            evidence_refs: ['evidence-pack://case-outcome-restore/quotation.txt#utf8'],
            probability: { status: 'unavailable', value: null },
          },
          optimistic: {
            expected_value: 0.24,
            unit: 'ratio',
            assumptions: ['报价额不变，估算成本较基准下降 5%'],
            evidence_refs: ['evidence-pack://case-outcome-restore/quotation.txt#utf8'],
            probability: { status: 'unavailable', value: null },
          },
          pessimistic: {
            expected_value: 0.12,
            unit: 'ratio',
            assumptions: ['报价额不变，估算成本较基准上升 10%'],
            evidence_refs: ['evidence-pack://case-outcome-restore/quotation.txt#utf8'],
            probability: { status: 'unavailable', value: null },
          },
        },
        interval: {
          lower: 0.12,
          upper: 0.24,
          unit: 'ratio',
          kind: 'deterministic_stress_range',
        },
        probability: {
          status: 'unavailable',
          value: null,
          unavailable_reason_code: 'probability_not_evidenced',
        },
        evidence_refs: ['evidence-pack://case-outcome-restore/quotation.txt#utf8'],
        sensitivity: [{
          factor: 'estimated_cost',
          direction: 'increase_reduces_gross_margin',
          stress_change: '-5% / +10%',
        }],
        risk_triggers: ['估算成本超过基准值 10%'],
        recommended_actions: ['成本偏差达到 5% 时重新测算毛利'],
        versions: {
          model: { status: 'not_applicable', version: null },
          prompt: { status: 'not_applicable', version: null },
          data: { status: 'available', version: 'manifest-sha256' },
          rule: { status: 'available', version: 'quote.prediction-scenarios.v1' },
        },
        advisory_only: true,
      }],
    },
  };
  let outcomeRecorded = false;
  let outcomeBody: Record<string, unknown> | null = null;

  await page.route(`**/api/court/shangshufang/tasks/${caseId}/status`, (route) => route.fulfill({
    json: {
      success: true,
      data: {
        task: {
          task_id: caseId,
          status: 'archived',
          raw_question: draftEdict.original_question,
          draft_edict: draftEdict,
          source_label: 'LIVE',
          risk_flags: [],
          known_facts: ['证据已核验'],
          unknown_gaps: [],
          missing_evidence: [],
          recommended_departments: ['户部'],
          latest_decision: {
            decision_id: 'decision-archive',
            action: 'archive',
            decided_at: '2026-07-30T00:02:00Z',
          },
          created_at: '2026-07-30T00:00:00Z',
          updated_at: '2026-07-30T00:02:00Z',
        },
        review: {
          review_id: 'review-outcome-restore',
          review_status: 'archived',
          memorial,
        },
      },
    },
  }));
  await page.route(`**/api/court/shangshufang/tasks/${caseId}/archive`, (route) => route.fulfill({
    json: { success: true, data: archive },
  }));
  await page.route(`**/api/court/shangshufang/tasks/${caseId}/outcomes`, async (route) => {
    outcomeBody = route.request().postDataJSON() as Record<string, unknown>;
    outcomeRecorded = true;
    await route.fulfill({
      status: 201,
      json: {
        success: true,
        data: {
          case_id: caseId,
          outcome_id: outcomeBody.outcome_id,
          prediction_type: 'gross_margin',
          status: 'recorded',
          provenance_status: 'verified',
        },
      },
    });
  });
  await page.route(`**/api/court/shangshufang/tasks/${caseId}/deviation-card`, (route) => route.fulfill({
    json: {
      success: true,
      data: {
        case_id: caseId,
        snapshot_hash: snapshotHash,
        chain_hash: chainHash,
        deviations: outcomeRecorded
          ? [{
              prediction_type: 'gross_margin',
              expected_value: 0.2,
              actual_value: 0.18,
              unit: 'ratio',
              absolute_deviation: -0.02,
              outcome: {
                outcome_id: 'outcome-browser-001',
                prediction_type: 'gross_margin',
                actual_value: 0.18,
                unit: 'ratio',
                observed_at: '2026-08-31T16:00:00Z',
                source_ref: 'reveal-pack://case-outcome-restore',
                human_validated: true,
                provenance_status: 'verified',
                trusted_for_learning: true,
                source_artifact_digest: `sha256:${'a'.repeat(64)}`,
                idempotency_key: 'outcome-browser-001',
              },
              recorded_at: '2026-08-31T16:01:00Z',
            }]
          : [],
      },
    },
  }));

  await page.goto(
    `${BASE_PATH}/court-briefing?skipOnboarding=1&caseId=${caseId}`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page.getByText('正式奏折 · 史馆签封')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('pilot-outcome-form')).toBeVisible({ timeout: 20_000 });

  await page.getByLabel('实际结果指标').selectOption('gross_margin');
  await page.getByLabel('实际值').fill('0.18');
  await page.getByLabel('观测时间').fill('2026-09-01T00:00');
  await page.getByLabel('结果来源', { exact: true }).fill('reveal-pack://case-outcome-restore');
  await page.getByLabel('实际结果来源文件').setInputFiles({
    name: 'revealed-outcome.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"gross_margin":0.18}'),
  });
  await page.getByLabel('我已人工核验实际结果').check();
  await page.getByRole('button', { name: '回填实际结果' }).click();

  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('毛利率');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('钦天监仅提供预测预警');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('毛利率 · 基准：20.00%');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('乐观：24.00%');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('悲观：12.00%');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('现有证据不足以估计概率');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('预测值：20.00%');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('实际值：18.00%');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('偏差：-2.00 个百分点');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('已验签，可进入飞轮');
  if (process.env.CAPTURE_PILOT_SCREENSHOT === '1') {
    await page.screenshot({
      path: 'dev/screenshots/shangshufang-pilot-outcome.png',
      fullPage: true,
    });
  }
  expect(outcomeBody).toMatchObject({
    prediction_type: 'gross_margin',
    actual_value: 0.18,
    unit: 'ratio',
    source_ref: 'reveal-pack://case-outcome-restore',
    source_artifact_base64: Buffer.from('{"gross_margin":0.18}').toString('base64'),
    human_validated: true,
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('毛利率');
  await expect(page.getByTestId('pilot-one-page-memorial')).toContainText('实际值：18.00%');
  await expect(page.getByTestId('pilot-outcome-form')).toBeVisible();
});

function authorityCasePayload(
  caseId: string,
  status: 'awaiting_decision' | 'archived',
) {
  const draftEdict = {
    original_question: '是否准许内部报价？',
    refined_edict: '核验报价证据后形成回奏。',
    decision_type: 'quotation_admission',
    known_facts: ['证据已核验'],
    unknown_gaps: [],
    recommended_departments: ['户部'],
    risk_flags: [],
    expected_memorial_format: ['一页回奏'],
    emperor_confirmation_question: '是否下旨？',
    source_label: 'LIVE',
  };
  const memorial = {
    title: '报价准入回奏',
    verdict: '建议准奏',
    summary: '证据满足内部评审要求。',
    ministry_outputs: [{
      department: '户部',
      position: '准奏',
      opinion: '毛利边界清晰。',
      status: 'completed',
      source_label: 'LIVE',
    }],
    evidence_gaps: [],
    risk_flags: [],
    evidence_chain: [{
      title: '受控证据包',
      source_type: 'server_registered',
    }],
    recommended_next_action: '请最终裁决人裁决。',
    decision_options: [
      { action: 'approve', label: '准奏', enabled: true },
      { action: 'reject', label: '驳回', enabled: true },
      {
        action: 'request_evidence',
        label: '补证',
        enabled: true,
      },
    ],
    quality_gate: {
      status: 'passed',
      reasons: [],
      human_signoff_required: true,
    },
    source_label: 'LIVE',
  };
  return {
    task: {
      task_id: caseId,
      status,
      raw_question: draftEdict.original_question,
      draft_edict: draftEdict,
      source_label: 'LIVE',
      risk_flags: [],
      known_facts: ['证据已核验'],
      unknown_gaps: [],
      missing_evidence: [],
      recommended_departments: ['户部'],
      created_at: '2026-07-30T00:00:00Z',
      updated_at: '2026-07-30T00:01:00Z',
    },
    review: {
      review_id: `review-${caseId}`,
      review_status: status,
      memorial,
    },
  };
}

test('御前权限：真实 user 会话只能阅览回奏，不显示三种皇帝裁决', async ({ page }) => {
  await seedRoleSession(page, 'user');
  const caseId = 'case-readonly-user';
  await page.route(
    `**/api/court/shangshufang/tasks/${caseId}/status`,
    (route) => route.fulfill({
      json: {
        success: true,
        data: authorityCasePayload(caseId, 'awaiting_decision'),
      },
    }),
  );

  await page.goto(
    `${BASE_PATH}/court-briefing?skipOnboarding=1&caseId=${caseId}`,
    { waitUntil: 'domcontentloaded' },
  );

  await expect(page.getByTestId('pilot-imperial-readonly')).toContainText(
    '阅览身份',
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole('button', { name: '准奏', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '驳回', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '补证', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel('裁决理由')).toHaveCount(0);
});

test('御前权限：真实 user 阅览已归档案件时不显示结果回填', async ({ page }) => {
  await seedRoleSession(page, 'user');
  const caseId = 'case-readonly-outcome';
  const snapshotHash = 'e'.repeat(64);
  const chainHash = 'f'.repeat(64);
  await page.route(
    `**/api/court/shangshufang/tasks/${caseId}/status`,
    (route) => route.fulfill({
      json: {
        success: true,
        data: authorityCasePayload(caseId, 'archived'),
      },
    }),
  );
  await page.route(
    `**/api/court/shangshufang/tasks/${caseId}/archive`,
    (route) => route.fulfill({
      json: {
        success: true,
        data: {
          case_id: caseId,
          status: 'archived',
          archive_id: `archive-${caseId}`,
          evidence_pack_id: `${caseId}-evidence-v1`,
          snapshot_hash: snapshotHash,
          chain_hash: chainHash,
          created_at: '2026-07-30T00:02:00Z',
          prediction_snapshot: {
            sealed: true,
            decision_as_of: '2026-07-30T00:00:00Z',
            predictions: [{
              prediction_type: 'gross_margin',
              status: 'available',
              expected_value: 0.2,
              unit: 'ratio',
            }],
          },
        },
      },
    }),
  );
  await page.route(
    `**/api/court/shangshufang/tasks/${caseId}/deviation-card`,
    (route) => route.fulfill({
      json: {
        success: true,
        data: {
          case_id: caseId,
          snapshot_hash: snapshotHash,
          chain_hash: chainHash,
          deviations: [],
        },
      },
    }),
  );

  await page.goto(
    `${BASE_PATH}/court-briefing?skipOnboarding=1&caseId=${caseId}`,
    { waitUntil: 'domcontentloaded' },
  );

  await expect(page.getByText('正式奏折 · 史馆签封')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('pilot-imperial-readonly')).toBeVisible();
  await expect(page.getByTestId('pilot-outcome-form')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '回填实际结果' }),
  ).toHaveCount(0);
});

test('御前权限：服务端返回 403 时管理员界面不得伪成功', async ({ page }) => {
  await seedRoleSession(page, 'admin');
  const caseId = 'case-admin-server-denied';
  await page.route(
    `**/api/court/shangshufang/tasks/${caseId}/status`,
    (route) => route.fulfill({
      json: {
        success: true,
        data: authorityCasePayload(caseId, 'awaiting_decision'),
      },
    }),
  );
  await page.route(
    `**/api/court/shangshufang/tasks/${caseId}/decision`,
    (route) => route.fulfill({
      status: 403,
      json: {
        success: false,
        data: null,
        error: {
          code: 'emperor_authority_required',
          message: '该动作只允许企业主或获授权的最终裁决人执行。',
        },
      },
    }),
  );

  await page.goto(
    `${BASE_PATH}/court-briefing?skipOnboarding=1&caseId=${caseId}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.getByRole('button', { name: '驳回', exact: true }).click();

  await expect(page.getByTestId('pilot-loop-status')).toContainText(
    '该动作只允许企业主或获授权的最终裁决人执行。',
  );
  await expect(page.getByTestId('pilot-decision-outcome')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '驳回', exact: true }),
  ).toBeEnabled();
});
