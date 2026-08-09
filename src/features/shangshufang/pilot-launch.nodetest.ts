import assert from 'node:assert/strict';
import test from 'node:test';

import type { PilotReadinessResponse } from '@/lib/contracts/shangshufang-loop';
import {
  FIRST_DECREE_TEMPLATE,
  resolvePilotLaunchGuide,
} from './pilot-launch.ts';

function readiness(
  value: Partial<PilotReadinessResponse>,
): PilotReadinessResponse {
  return {
    status: 'ok',
    version: '1',
    checks: {},
    ready: true,
    blockers: [],
    internal_pilot: {
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
    },
    ...value,
  };
}

test('内部链路在线但正式试点未启用时，明确允许内部试用', () => {
  const guide = resolvePilotLaunchGuide(readiness({
    quote_pilot: {
      enabled: false,
      ready: false,
      blockers: ['quote_pilot_not_enabled'],
    },
  }), null);

  assert.equal(guide.state, 'ready');
  assert.match(guide.headline, /可以拟第一道真实旨意/);
  assert.match(guide.formalPilotLabel, /未启用（不影响内部试用）/);
  assert.match(guide.description, /非真实多 Agent/);
  assert.deepEqual(guide.serviceBlockers, []);
});

test('内部链路阻塞时不因页面可打开而误报可用', () => {
  const guide = resolvePilotLaunchGuide(readiness({
    status: 'degraded',
    ready: false,
    blockers: ['model_gateway_unavailable'],
    internal_pilot: {
      ...readiness({}).internal_pilot!,
      pilotReady: false,
      blockers: ['primary_database_migration_not_at_head'],
    },
  }), null);

  assert.equal(guide.state, 'blocked');
  assert.match(guide.headline, /未就绪/);
  assert.deepEqual(
    guide.serviceBlockers,
    ['primary_database_migration_not_at_head'],
  );
});

test('准入读取失败和核验中必须与就绪态区分', () => {
  assert.equal(resolvePilotLaunchGuide(null, null).state, 'checking');
  assert.equal(resolvePilotLaunchGuide(null, 'backend offline').state, 'unavailable');
  assert.equal(resolvePilotLaunchGuide({
    ...readiness({}),
    internal_pilot: undefined,
  }, null).state, 'unavailable');
});

test('首旨模板收敛到储能报价与交付主切口，并包含外部动作边界', () => {
  assert.match(FIRST_DECREE_TEMPLATE, /100MWh 冷库储能项目/);
  assert.match(FIRST_DECREE_TEMPLATE, /报价边界、交付边界/);
  assert.match(FIRST_DECREE_TEMPLATE, /BOM/);
  assert.match(FIRST_DECREE_TEMPLATE, /未经单独准奏/);
});
