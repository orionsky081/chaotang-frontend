import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDecisionRequest,
  hasSignoffRequiredFlag,
  parseHumanSignoffCredentialJson,
  ZHumanSignoffChallengeResponse,
  type HumanSignoffChallenge,
  type HumanSignoffCredential,
} from './shangshufang-loop.ts';

const CONTEXT_DIGEST = `sha256:${'a'.repeat(64)}`;
const CHALLENGE: HumanSignoffChallenge = {
  version: 1,
  tenant_slug: 'default',
  user_id: '1',
  task_id: 'task-high-risk',
  action: 'approve',
  context: {
    version: 1,
    tenant_slug: 'default',
    user_id: '1',
    task_id: 'task-high-risk',
    action: 'approve',
    task_revision: {
      updated_at: '2026-07-30T10:00:00Z',
      status: 'awaiting_decision',
      raw_question: '是否签署合同？',
      refined_edict: '核验后裁决。',
      decision_type: 'contract_admission',
      source_label: 'LIVE',
      risk_flags: ['不可逆合同承诺'],
      known_facts: ['合同已复核'],
      unknown_gaps: [],
    },
    latest_review: {
      id: 'review-1',
      round_number: 1,
      updated_at: '2026-07-30T10:00:00Z',
      review_status: 'awaiting_decision',
      formal_memorial_digest: `sha256:${'b'.repeat(64)}`,
      routing_plan_digest: `sha256:${'c'.repeat(64)}`,
    },
  },
  context_digest: CONTEXT_DIGEST,
};

const CREDENTIAL: HumanSignoffCredential = {
  claims: {
    version: 1,
    key_id: 'human-root-2026',
    tenant_slug: 'default',
    user_id: '1',
    task_id: 'task-high-risk',
    action: 'approve',
    context_digest: CONTEXT_DIGEST,
    issued_at: '2026-07-30T10:00:00Z',
    expires_at: '2026-07-30T10:05:00Z',
    nonce: 'nonce-0000000000000001',
  },
  signature: 'server-verifiable-ed25519-signature',
};
const ARCHIVE_CREDENTIAL: HumanSignoffCredential = {
  ...CREDENTIAL,
  claims: {
    ...CREDENTIAL.claims,
    action: 'archive',
    context_digest: `sha256:${'d'.repeat(64)}`,
    nonce: 'nonce-0000000000000002',
  },
};

test('签字 JSON 仅解析结构并匹配当前案件动作', () => {
  const parsed = parseHumanSignoffCredentialJson(
    JSON.stringify(CREDENTIAL),
    CHALLENGE,
  );
  assert.deepEqual(parsed, CREDENTIAL);
});

test('拒绝把私钥或未知字段混入签字凭据', () => {
  assert.throws(
    () => parseHumanSignoffCredentialJson(
      JSON.stringify({ ...CREDENTIAL, private_key: 'must-never-enter-browser' }),
      CHALLENGE,
    ),
    /未允许字段/,
  );
});

test('拒绝复用不同动作或不同案件的凭据', () => {
  assert.throws(
    () => parseHumanSignoffCredentialJson(
      JSON.stringify(CREDENTIAL),
      { ...CHALLENGE, action: 'archive' },
    ),
    /动作不匹配/,
  );
  assert.throws(
    () => parseHumanSignoffCredentialJson(
      JSON.stringify(CREDENTIAL),
      { ...CHALLENGE, task_id: 'another-task' },
    ),
    /不属于当前案件/,
  );
});

test('缺少或伪造 context_digest 的凭据必须在发送前被拦下', () => {
  const missingDigest = structuredClone(CREDENTIAL) as unknown as Record<string, unknown>;
  delete (missingDigest.claims as Record<string, unknown>).context_digest;
  assert.throws(
    () => parseHumanSignoffCredentialJson(JSON.stringify(missingDigest), CHALLENGE),
    /字段结构/,
  );
  assert.throws(
    () => parseHumanSignoffCredentialJson(
      JSON.stringify({
        ...CREDENTIAL,
        claims: {
          ...CREDENTIAL.claims,
          context_digest: `sha256:${'0'.repeat(64)}`,
        },
      }),
      CHALLENGE,
    ),
    /上下文摘要不匹配/,
  );
});

test('challenge 响应必须符合严格只读契约', () => {
  assert.deepEqual(
    ZHumanSignoffChallengeResponse.parse({ challenge: CHALLENGE }).challenge,
    CHALLENGE,
  );
  assert.throws(
    () => ZHumanSignoffChallengeResponse.parse({
      challenge: { ...CHALLENGE, private_key: 'forbidden' },
    }),
  );
  assert.throws(
    () => ZHumanSignoffChallengeResponse.parse({
      challenge: {
        ...CHALLENGE,
        context: { ...CHALLENGE.context, task_id: 'swapped-task' },
      },
    }),
    /challenge context task_id mismatch/,
  );
});

test('edited_edict 生成的严格 server-owned 黑级风险 marker 可通过 challenge 契约', () => {
  const editedChallenge = {
    ...CHALLENGE,
    context: {
      ...CHALLENGE.context,
      task_revision: {
        ...CHALLENGE.context.task_revision,
        risk_flags: [
          '原始字符串风险',
          {
            source: 'user_edited_edict',
            level: 'black',
            keyword: '违约金',
          },
        ],
      },
    },
  };
  const parsed = ZHumanSignoffChallengeResponse.parse({ challenge: editedChallenge });
  assert.deepEqual(
    parsed.challenge.context.task_revision.risk_flags,
    editedChallenge.context.task_revision.risk_flags,
  );
});

test('任意对象不能伪装成 server-owned edited_edict 风险 marker', () => {
  const attack = (marker: Record<string, unknown>) => ({
    challenge: {
      ...CHALLENGE,
      context: {
        ...CHALLENGE.context,
        task_revision: {
          ...CHALLENGE.context.task_revision,
          risk_flags: [marker],
        },
      },
    },
  });
  assert.throws(() => ZHumanSignoffChallengeResponse.parse(attack({
    source: 'browser',
    level: 'black',
    keyword: '合同',
  })));
  assert.throws(() => ZHumanSignoffChallengeResponse.parse(attack({
    source: 'user_edited_edict',
    level: 'red',
    keyword: '合同',
  })));
  assert.throws(() => ZHumanSignoffChallengeResponse.parse(attack({
    source: 'user_edited_edict',
    level: 'black',
    keyword: '合同',
    trusted: true,
  })));
});

test('只有 approve/archive 请求可以携带签字凭据', () => {
  assert.equal(buildDecisionRequest('approve', '准奏', CREDENTIAL).signoff_credential, CREDENTIAL);
  assert.equal(
    buildDecisionRequest('archive', '归档', ARCHIVE_CREDENTIAL).signoff_credential,
    ARCHIVE_CREDENTIAL,
  );
  assert.equal('signoff_credential' in buildDecisionRequest('reject', '驳回', CREDENTIAL), false);
  assert.equal(
    'signoff_credential' in buildDecisionRequest('request_evidence', '补证', CREDENTIAL),
    false,
  );
  assert.throws(
    () => buildDecisionRequest('archive', '归档', CREDENTIAL),
    /动作不匹配/,
  );
});

test('仅响应结构中的明确签字标志触发入口，不从普通错误文案猜测', () => {
  assert.equal(hasSignoffRequiredFlag({ success: false, data: { needs_signoff: true } }), true);
  assert.equal(hasSignoffRequiredFlag({ error: { code: 'signoff_required' } }), true);
  assert.equal(hasSignoffRequiredFlag({ error: '请人工确认后重试' }), false);
});
