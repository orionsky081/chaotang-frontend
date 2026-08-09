import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRIMARY_PRODUCT_SLICE,
  buildPrimaryDecreeTemplate,
} from './product-slice.ts';

test('终极产品只有一个永久主切口，且入口是上书房真实闭环', () => {
  const { productWedge } = PRIMARY_PRODUCT_SLICE;

  assert.equal(PRIMARY_PRODUCT_SLICE.productName, '朝堂OS');
  assert.equal(productWedge.id, 'new-energy-equipment-formal-quote-admission');
  assert.equal(productWedge.nameCn, '新能源设备项目正式报价准入');
  assert.equal(productWedge.entryRoute, '/court-briefing');
  assert.match(PRIMARY_PRODUCT_SLICE.positioning, /20–300 人新能源设备项目制企业/);
});

test('设计伙伴场景与永久产品边界分离', () => {
  const { designPartnerScenario, productWedge } = PRIMARY_PRODUCT_SLICE;

  assert.match(designPartnerScenario.labelCn, /储能设备 \/ 电池 PACK/);
  assert.match(designPartnerScenario.decisionQuestion, /储能项目/);
  assert.doesNotMatch(productWedge.nameCn, /储能|PACK/);
});

test('主切口覆盖正式报价、人工裁决、业务例外双确认和结果回填', () => {
  const { productWedge } = PRIMARY_PRODUCT_SLICE;

  assert.deepEqual(productWedge.outcomeMetrics, [
    'gross_margin',
    'delivery_days',
    'payment_days',
  ]);
  assert.deepEqual(productWedge.humanDecisionActions, [
    'approve',
    'request_evidence',
    'reject',
  ]);
  assert.equal(productWedge.businessException.requiresDualConfirmation, true);
  assert.equal(
    productWedge.businessException.exceptionEligibleGate,
    'quote_margin_below_forbidden_threshold',
  );
  assert.deepEqual(productWedge.businessException.nonOverrideableGates, [
    'quote_inputs_invalid',
    'quote_margin_policy_missing',
  ]);
  assert.match(productWedge.businessOutcome, /追加偏差卡/);
});

test('首旨由产品契约生成，不含泛化占位符且保留不可逆动作边界', () => {
  const template = buildPrimaryDecreeTemplate();

  assert.doesNotMatch(template, /【[^】]+】/);
  assert.match(template, /对外报价明细/);
  assert.match(template, /BOM/);
  assert.match(template, /质保、违约、赔偿/);
  assert.match(template, /付款、签约、对外发送、采购下单/);
  assert.match(template, /未经单独准奏/);
});
