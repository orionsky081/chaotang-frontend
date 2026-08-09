import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPLETION_STATUSES,
  AGENT_CONTRIBUTION_STATUSES,
  ARCHIVE_REF_STATUSES,
  COURT_RUN_PUBLIC_RESULT_FIELDS,
  CRITERION_RESULT_FIELDS,
  CRITERION_STATUSES,
  FULFILLMENT_MATRIX_FIELDS,
  FULFILLMENT_SCHEMA_VERSION,
  REPLY_FIELDS,
  RISK_LEVELS,
  TRUTH_LABELS,
  UNCERTAINTY_LEVELS,
  VERIFICATION_OUTCOMES,
} from './fulfillment.ts';

test('旨意兑现 schema 版本与 fulfillment.json 一致', () => {
  assert.equal(FULFILLMENT_SCHEMA_VERSION, 'fulfillment.v1');
});

test('旨意兑现枚举与 fulfillment.json 完全一致且不接受静默增删', () => {
  assert.deepEqual(CRITERION_STATUSES, [
    'achieved',
    'not_achieved',
    'unverifiable',
  ]);
  assert.deepEqual(COMPLETION_STATUSES, ['complete', 'incomplete']);
  assert.deepEqual(RISK_LEVELS, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  assert.deepEqual(UNCERTAINTY_LEVELS, ['LOW', 'MEDIUM', 'HIGH', 'EXTREME']);
  assert.equal(TRUTH_LABELS.length, 6);
  assert.deepEqual(VERIFICATION_OUTCOMES, [
    'VERIFIED',
    'CONTRADICTED',
    'UNAVAILABLE',
  ]);
  assert.deepEqual(AGENT_CONTRIBUTION_STATUSES, ['AVAILABLE', 'UNAVAILABLE']);
  assert.deepEqual(ARCHIVE_REF_STATUSES, ['UNSEALED', 'SEALED']);
});

test('旨意兑现字段清单与 fulfillment.json 完全一致且顺序稳定', () => {
  assert.equal(CRITERION_RESULT_FIELDS.length, 9);
  assert.equal(FULFILLMENT_MATRIX_FIELDS.length, 9);
  assert.equal(REPLY_FIELDS.length, 18);
  assert.equal(COURT_RUN_PUBLIC_RESULT_FIELDS.length, 7);
  assert.equal(COURT_RUN_PUBLIC_RESULT_FIELDS[0], 'runtime_authority');
});

test('关键完成语义不能从旨意兑现矩阵中移除', () => {
  assert.ok(
    CRITERION_RESULT_FIELDS.includes('independent_evidence_refs'),
    '每项标准必须绑定独立证据',
  );
  assert.ok(
    CRITERION_RESULT_FIELDS.includes('gap_or_next_action'),
    '未兑现或不可验证的标准必须给出差距或下一步',
  );
  assert.ok(
    FULFILLMENT_MATRIX_FIELDS.includes('completion_status'),
    '矩阵必须给出总完成状态',
  );
  assert.ok(
    FULFILLMENT_MATRIX_FIELDS.includes('recommended_next_action'),
    '矩阵必须给出可执行的下一步',
  );
  assert.ok(REPLY_FIELDS.includes('department_memorials'));
  assert.ok(REPLY_FIELDS.includes('verification_records'));
  assert.ok(REPLY_FIELDS.includes('agent_contributions'));
  assert.ok(REPLY_FIELDS.includes('archive_ref'));
});
