import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertLiveDecisionChallenge,
  availableDecisionActions,
  decisionPollingDisposition,
  MAX_DECISION_POLL_ATTEMPTS,
  ZBrowserDecisionCommand,
} from './court-decision-command.ts';

test('待裁状态只显示 V1 准奏、补证、驳回动作', () => {
  assert.deepEqual(
    availableDecisionActions('AWAITING_HUMAN', [
      'APPROVE',
      'AMEND_CONSTRAINTS',
      'REQUEST_EVIDENCE',
      'REJECT',
    ]),
    ['APPROVE', 'REQUEST_EVIDENCE', 'REJECT'],
  );
  assert.deepEqual(
    availableDecisionActions('APPROVED', ['APPROVE', 'REJECT']),
    [],
  );
});

test('裁决轮询在终态或次数上限停止', () => {
  assert.equal(decisionPollingDisposition('AWAITING_HUMAN', 0), 'POLL');
  assert.equal(decisionPollingDisposition('APPROVED', 1), 'DONE');
  assert.equal(
    decisionPollingDisposition('AWAITING_HUMAN', MAX_DECISION_POLL_ATTEMPTS),
    'STOP_ATTEMPT_LIMIT',
  );
});

test('浏览器裁决契约拒绝 bearer、revision 和未知控制字段', () => {
  assert.throws(() => ZBrowserDecisionCommand.parse({
    action: 'APPROVE',
    reason: '准奏',
    idempotency_key: 'decision-123',
    review_token: 'must-not-enter-browser',
    expected_revision: 99,
  }));
});

test('challenge 必须绑定当前动作且尚未过期', () => {
  const envelope = {
    success: true,
    data: {
      review_token: 'opaque-review-token',
      expected_revision: 7,
      action: 'APPROVE',
      expires_at: '2026-08-02T12:05:00Z',
    },
    error: null,
  };
  assert.equal(
    assertLiveDecisionChallenge(
      envelope,
      'APPROVE',
      Date.parse('2026-08-02T12:00:00Z'),
    ).expected_revision,
    7,
  );
  assert.throws(() => assertLiveDecisionChallenge(
    envelope,
    'REJECT',
    Date.parse('2026-08-02T12:00:00Z'),
  ), /action_mismatch/);
  assert.throws(() => assertLiveDecisionChallenge(
    envelope,
    'APPROVE',
    Date.parse('2026-08-02T12:05:00Z'),
  ), /expired/);
});
