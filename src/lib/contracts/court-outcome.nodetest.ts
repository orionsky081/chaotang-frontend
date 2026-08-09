import assert from 'node:assert/strict';
import test from 'node:test';

import {
  outcomeRequestIsTerminal,
  ZBrowserOutcomeCommand,
  ZRunOutcomeProjection,
} from './court-outcome.ts';

const browserCommand = {
  source_artifact_id: 'artifact://erp/quote-42',
  metric: 'gross_margin' as const,
  actual_value: 23.4,
  observed_at: '2026-08-02T10:30:00+08:00',
  idempotency_key: 'outcome-123456',
};

test('浏览器结果回填只接受五个公开字段和三项固定指标', () => {
  assert.deepEqual(ZBrowserOutcomeCommand.parse(browserCommand), browserCommand);

  for (const forbidden of [
    { human_validated: true },
    { tenant_id: 'tenant-forged' },
    { run_id: 'run-forged' },
    { subject_id: 'subject-forged' },
    { provenance_signature: 'forged' },
  ]) {
    assert.throws(() => ZBrowserOutcomeCommand.parse({
      ...browserCommand,
      ...forbidden,
    }));
  }
  assert.throws(() => ZBrowserOutcomeCommand.parse({
    ...browserCommand,
    metric: 'revenue',
  }));
  assert.throws(() => ZBrowserOutcomeCommand.parse({
    ...browserCommand,
    observed_at: '2026-08-02T10:30:00',
  }));
});

test('封印基线投影严格区分待观察与已记录，并拒绝未知指标', () => {
  const projection = {
    tenant_id: 'tenant-a',
    run_id: 'run-1',
    sealed_archive_id: 'a'.repeat(64),
    sealed_chain_hash: 'b'.repeat(64),
    metrics: [
      {
        prediction_id: 'prediction-margin',
        metric: 'gross_margin',
        metric_unit: '%',
        expected_value: 25,
        observation_window: '2026-08-01T00:00:00Z/2026-09-01T00:00:00Z',
        status: 'PENDING',
      },
      {
        prediction_id: 'prediction-delivery',
        metric: 'delivery_days',
        metric_unit: 'days',
        expected_value: 30,
        observation_window: '2026-08-01T00:00:00Z/2026-09-01T00:00:00Z',
        status: 'RECORDED',
        actual_value: 33,
        signed_delta: 3,
        observed_at: '2026-08-30T00:00:00Z',
        observation_ref: 'outcome://delivery-1',
      },
    ],
  } as const;
  assert.equal(ZRunOutcomeProjection.parse(projection).metrics.length, 2);
  assert.throws(() => ZRunOutcomeProjection.parse({
    ...projection,
    metrics: [{ ...projection.metrics[0], metric: 'revenue' }],
  }));
});

test('请求状态只在完成或诚实失败时终止轮询', () => {
  const base = { run_id: 'run-1', outbox_id: 'outbox-1', result_ref: null };
  assert.equal(outcomeRequestIsTerminal({ ...base, status: 'PENDING' }), false);
  assert.equal(outcomeRequestIsTerminal({ ...base, status: 'CLAIMED' }), false);
  assert.equal(outcomeRequestIsTerminal({ ...base, status: 'COMPLETED' }), true);
  assert.equal(outcomeRequestIsTerminal({ ...base, status: 'FAILED' }), true);
  assert.equal(
    outcomeRequestIsTerminal({ ...base, status: 'RECONCILIATION_REQUIRED' }),
    true,
  );
});
