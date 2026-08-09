import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertLiveArchiveChallenge,
  archiveCommandAvailable,
  archivePollingDisposition,
  MAX_ARCHIVE_POLL_ATTEMPTS,
  ZBrowserArchiveCommand,
} from './court-command.ts';

test('归档入口只接受后端批准且明确等待归档的状态', () => {
  assert.equal(
    archiveCommandAvailable('APPROVED', ['WAIT_FOR_ARCHIVE']),
    true,
  );
  assert.equal(
    archiveCommandAvailable('AWAITING_HUMAN', ['WAIT_FOR_ARCHIVE']),
    false,
  );
  assert.equal(archiveCommandAvailable('APPROVED', []), false);
  assert.equal(
    archiveCommandAvailable('ARCHIVED', ['WAIT_FOR_ARCHIVE']),
    false,
  );
});

test('归档轮询在完成、状态漂移或次数上限时停止', () => {
  assert.equal(archivePollingDisposition('APPROVED', 0), 'POLL');
  assert.equal(archivePollingDisposition('ARCHIVED', 1), 'DONE');
  assert.equal(
    archivePollingDisposition('FAILED', 1),
    'STOP_STATUS_DRIFT',
  );
  assert.equal(
    archivePollingDisposition('APPROVED', MAX_ARCHIVE_POLL_ATTEMPTS),
    'STOP_ATTEMPT_LIMIT',
  );
});

test('浏览器归档契约只允许幂等键', () => {
  assert.deepEqual(
    ZBrowserArchiveCommand.parse({ idempotency_key: 'archive-123456' }),
    { idempotency_key: 'archive-123456' },
  );
  for (const forbidden of [
    { review_token: 'server-only' },
    { expected_revision: 7 },
    { execution_attestation: 'server-only-signature' },
    { action: 'ARCHIVE' },
  ]) {
    assert.throws(() => ZBrowserArchiveCommand.parse({
      idempotency_key: 'archive-123456',
      ...forbidden,
    }));
  }
});

test('archive challenge 必须是普通内核 ARCHIVE 且尚未过期', () => {
  const envelope = {
    success: true,
    data: {
      review_token: 'opaque-review-token',
      expected_revision: 7,
      action: 'ARCHIVE',
      expires_at: '2026-08-02T12:05:00Z',
      runtime: 'langgraph_court',
    },
    error: null,
  };
  assert.equal(
    assertLiveArchiveChallenge(
      envelope,
      Date.parse('2026-08-02T12:00:00Z'),
    ).expected_revision,
    7,
  );
  assert.throws(() => assertLiveArchiveChallenge(
    envelope,
    Date.parse('2026-08-02T12:05:00Z'),
  ), /expired/);
  assert.throws(() => assertLiveArchiveChallenge({
    ...envelope,
    data: { ...envelope.data, action: 'APPROVE' },
  }));
  assert.throws(() => assertLiveArchiveChallenge({
    ...envelope,
    data: { ...envelope.data, runtime: 'canary' },
  }));
});
