import productSliceData from './product-slice.json';

export type ProductOutcomeMetric = 'gross_margin' | 'delivery_days' | 'payment_days';
export type ProductDecisionAction = 'approve' | 'request_evidence' | 'reject';

export interface ProductWedge {
  id: string;
  nameCn: string;
  entryRoute: '/court-briefing';
  businessOutcome: string;
  requiredEvidence: readonly string[];
  outcomeMetrics: readonly ProductOutcomeMetric[];
  humanDecisionActions: readonly ProductDecisionAction[];
  businessException: {
    requiresDualConfirmation: true;
    exceptionEligibleGate: 'quote_margin_below_forbidden_threshold';
    nonOverrideableGates: readonly (
      | 'quote_inputs_invalid'
      | 'quote_margin_policy_missing'
    )[];
    requiredFields: readonly string[];
  };
  forbiddenAutomaticActions: readonly string[];
}

export interface DesignPartnerScenario {
  id: string;
  labelCn: string;
  decisionQuestion: string;
}

export interface ProductSliceContract {
  version: string;
  productName: '朝堂OS';
  positioning: string;
  primaryActor: string;
  productWedge: ProductWedge;
  designPartnerScenario: DesignPartnerScenario;
}

/**
 * 产品主切口 SSOT。
 *
 * 页面、首旨模板和产品验收必须从这里读取，禁止再各写一套“首个场景”。
 * JSON 作为跨进程稳定载体；类型层只负责让前端消费端获得静态约束。
 */
export const PRIMARY_PRODUCT_SLICE =
  productSliceData as ProductSliceContract;

export function buildPrimaryDecreeTemplate(
  contract: ProductSliceContract = PRIMARY_PRODUCT_SLICE,
): string {
  const evidence = contract.productWedge.requiredEvidence.join('、');
  const forbidden = contract.productWedge.forbiddenAutomaticActions.join('、');

  return [
    contract.designPartnerScenario.decisionQuestion,
    `请核验：${evidence}。`,
    '请给出准奏、补证或驳回建议，并明确报价边界、交付边界与下一步唯一动作；',
    `禁止未经单独准奏的${forbidden}。`,
  ].join('');
}
