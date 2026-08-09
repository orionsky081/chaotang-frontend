import assert from 'node:assert/strict';
import test from 'node:test';

import type { ChancellorReply } from '@/lib/contracts/fulfillment';

import {
  extractChancellorReply,
  projectChancellorReply,
} from './chancellor-reply-projection';

const REPLY: ChancellorReply = {
  conclusion: '尚未完成现场观赛安排，票务真实性仍待核验。',
  fulfillment_matrix: {
    schema_version: 'fulfillment.v1',
    mission_id: 'mission-premier-league',
    objective_restatement: '安排现场观看英超球赛',
    criterion_results: [
      {
        criterion_id: 'criterion-ticket',
        criterion: '取得可核验的正式球票',
        status: 'unverifiable',
        execution_artifact_refs: ['artifact://ticket-search'],
        domain_evidence_refs: [],
        independent_evidence_refs: [],
        verifier_findings: ['售票渠道尚未确认订单'],
        confidence: 0.42,
        gap_or_next_action: '由锦衣卫核验售票渠道与订单号',
      },
      {
        criterion_id: 'criterion-travel',
        criterion: '形成可执行的行程',
        status: 'achieved',
        execution_artifact_refs: ['artifact://itinerary'],
        domain_evidence_refs: ['evidence://flight-options'],
        independent_evidence_refs: ['verification://travel'],
        verifier_findings: [],
        confidence: 0.91,
        gap_or_next_action: null,
      },
    ],
    disagreements: ['礼部建议等待赛程最终确认'],
    unknowns: ['开球时间可能调整'],
    residual_risks: ['票务价格波动'],
    recommended_next_action: '先核验票务，再请求圣裁预算',
    completion_status: 'incomplete',
  },
  key_reasons: ['票务无独立证据', '行程已经形成', '预算仍待圣裁', '第四条不得进入首屏'],
  evidence_refs: ['evidence://case'],
  risk_level: 'MEDIUM',
  uncertainty_level: 'HIGH',
  foresight_brief_refs: ['foresight://schedule'],
  budget_and_timeline: { budget: '£1,500' },
  alternatives: ['改看下一轮主场'],
  disagreements: ['礼部建议等待'],
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
      criterion: '取得可核验的正式球票',
      verifier_department_id: 'jin_yi_wei',
      verification_ref: `sha256:${'a'.repeat(64)}`,
      outcome: 'UNAVAILABLE',
      evidence_refs: [],
      findings: ['售票渠道尚未确认订单'],
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

test('projects one backend conclusion, at most three reasons and one next action without deciding completion', () => {
  const view = projectChancellorReply(REPLY);

  assert.equal(view.conclusion, REPLY.conclusion);
  assert.deepEqual(view.keyReasons, REPLY.key_reasons.slice(0, 3));
  assert.equal(view.nextAction, REPLY.next_step);
  assert.equal(view.completionStatus, 'incomplete');
  assert.deepEqual(
    view.criteria.map((criterion) => criterion.status),
    ['unverifiable', 'achieved'],
  );
});

test('keeps criterion evidence provenance and backend gap verbatim in the dossier projection', () => {
  const [ticket, travel] = projectChancellorReply(REPLY).criteria;

  assert.deepEqual(ticket.evidence, [
    { kind: 'execution', ref: 'artifact://ticket-search' },
  ]);
  assert.equal(ticket.gap, '由锦衣卫核验售票渠道与订单号');
  assert.deepEqual(travel.evidence, [
    { kind: 'execution', ref: 'artifact://itinerary' },
    { kind: 'domain', ref: 'evidence://flight-options' },
    { kind: 'independent', ref: 'verification://travel' },
  ]);
  assert.equal(travel.gap, null);
});

test('does not invent a completion status when the backend reply has no matrix', () => {
  const view = projectChancellorReply({ ...REPLY, fulfillment_matrix: null });

  assert.equal(view.completionStatus, null);
  assert.deepEqual(view.criteria, []);
});

test('projects the complete authoritative dossier without fabricating agent or archive state', () => {
  const dossier = projectChancellorReply(REPLY).dossier;

  assert.equal(dossier.departmentMemorials[0]?.department_id, 'hu_bu');
  assert.equal(dossier.verificationRecords[0]?.outcome, 'UNAVAILABLE');
  assert.equal(dossier.councilReview, null);
  assert.equal(dossier.agentContributions?.status, 'UNAVAILABLE');
  assert.deepEqual(dossier.agentContributions?.contributions, []);
  assert.equal(dossier.archiveRef?.status, 'UNSEALED');
});

test('accepts only the authoritative court runtime reply boundary', () => {
  assert.deepEqual(extractChancellorReply({ runtime_authority: 'LANGGRAPH', reply: REPLY }), REPLY);
  assert.equal(extractChancellorReply({ reply: REPLY }), null);
  assert.equal(
    extractChancellorReply({ runtime_authority: 'LEGACY', reply: REPLY }),
    null,
  );
  assert.equal(
    extractChancellorReply({
      id: 'task-1',
      result_json: JSON.stringify({ reply: REPLY }),
    }),
    null,
  );
  assert.equal(extractChancellorReply({ result: { reply: REPLY } }), null);
});

test('rejects a partial reply instead of letting malformed legacy data crash the presentation', () => {
  assert.equal(extractChancellorReply({
    runtime_authority: 'LANGGRAPH',
    reply: {
      conclusion: '字段不完整',
      fulfillment_matrix: null,
      key_reasons: [],
      next_step: '等待',
    },
  }), null);
});

test('rejects authoritative-looking replies with malformed nested dossier records', () => {
  const attacks: Array<{
    name: string;
    mutate: (reply: Record<string, unknown>) => void;
  }> = [
    {
      name: '空对象冒充分奏',
      mutate: (reply) => {
        reply.department_memorials = [{}];
      },
    },
    {
      name: '未登记枚举冒充锦衣卫核验结论',
      mutate: (reply) => {
        reply.verification_records = [
          {
            ...(REPLY.verification_records[0] as object),
            outcome: 'PROBABLY_VERIFIED',
          },
        ];
      },
    },
    {
      name: '空对象冒充军机处会审',
      mutate: (reply) => {
        reply.council_review = {};
      },
    },
    {
      name: '空对象冒充 Agent 贡献记录',
      mutate: (reply) => {
        reply.agent_contributions = {
          status: 'AVAILABLE',
          contributions: [{}],
          unavailable_reason: null,
        };
      },
    },
    {
      name: '无封存标识却冒充已封存',
      mutate: (reply) => {
        reply.archive_ref = {
          status: 'SEALED',
          archive_id: null,
          ref: null,
        };
      },
    },
  ];

  for (const attack of attacks) {
    const reply = structuredClone(REPLY) as unknown as Record<string, unknown>;
    attack.mutate(reply);
    assert.equal(
      extractChancellorReply({ runtime_authority: 'LANGGRAPH', reply }),
      null,
      `${attack.name}必须被权威边界拒绝`,
    );
  }
});
