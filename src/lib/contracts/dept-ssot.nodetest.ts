import assert from 'node:assert/strict';
import test from 'node:test';
import { DEPT_TO_AGENT_CODE, DEPT_DISPLAY, DEPARTMENTS } from './dept.ts';
import { AGENT_META } from './agent.ts';

/**
 * 铁律2 回归（部门命名 SSOT 防漂移）：
 * contracts/dept.ts 的 DEPT_TO_AGENT_CODE 是部门码→AgentCode 的【单一真相源】。
 * 旧的 advisor-signal / decision-ledger 并行副本已随前端业务运行时退役。
 * 本断言钉死:① SSOT 自身内部一致 ② SSOT 的 agentCode 都是真 Tier-0 码
 * 前端业务运行时里的平行映射已经退役；本测试只验证契约自身与共享 JSON。
 */

const META_CODES: Set<string> = new Set(
  Array.isArray(AGENT_META)
    ? (AGENT_META as Array<{ code: string }>).map((m) => m.code)
    : Object.keys(AGENT_META as Record<string, unknown>),
);

test('SSOT 内部一致:DEPT_TO_AGENT_CODE 与 DEPT_DISPLAY 同键集', () => {
  const a = Object.keys(DEPT_TO_AGENT_CODE).sort();
  const b = Object.keys(DEPT_DISPLAY).sort();
  assert.deepEqual(a, b, 'DEPT_TO_AGENT_CODE 与 DEPT_DISPLAY 的部门键必须一致');
});

test('SSOT 的每个 agentCode 都是真 Tier-0 AGENT_META 码', () => {
  for (const [dept, code] of Object.entries(DEPT_TO_AGENT_CODE)) {
    assert.ok(META_CODES.has(code), `SSOT dept '${dept}'→'${code}' 不是合法 AGENT_META 码`);
  }
});

// ── 跨进程 SSOT (departments.json) ⟷ AGENT_META 防漂移(铁律2/6:前后端同读一份 JSON) ──

test('departments.json 覆盖 AGENT_META 全部码(码集相等,不多不少)', () => {
  const jsonCodes = DEPARTMENTS.map((d) => d.agentCode).sort();
  const metaCodes = [...META_CODES].sort();
  assert.deepEqual(jsonCodes, metaCodes, 'departments.json 与 AGENT_META 码集必须一致(加/删部门先改 JSON)');
});

test('departments.json 每行身份/显示与 AGENT_META 逐字段一致', () => {
  const META = AGENT_META as Record<string, { nameCn: string; nameEn: string; tier: string; emoji: string; color: string }>;
  for (const d of DEPARTMENTS) {
    const m = META[d.agentCode];
    assert.ok(m, `AGENT_META 缺码 '${d.agentCode}'`);
    for (const f of ['nameCn', 'nameEn', 'tier', 'emoji', 'color'] as const) {
      assert.equal(d[f], m[f], `'${d.agentCode}'.${f}: JSON='${d[f]}' 与 AGENT_META='${m[f]}' 漂移(改先改 JSON)`);
    }
  }
});

test('DEPT_TO_AGENT_CODE 恰好由 6 个 pageCode 行派生', () => {
  const pageRows = DEPARTMENTS.filter((d) => d.pageCode !== null);
  assert.equal(pageRows.length, 6, 'pageCode 非空的部门应为 6 个(前端六部门页)');
  for (const d of pageRows) {
    assert.equal(DEPT_TO_AGENT_CODE[d.pageCode as keyof typeof DEPT_TO_AGENT_CODE], d.agentCode);
  }
});

test('swarmId 非空者唯一(后端 sid 无重复)', () => {
  const sids = DEPARTMENTS.map((d) => d.swarmId).filter((s): s is string => s !== null);
  assert.equal(sids.length, new Set(sids).size, 'departments.json 存在重复 swarmId');
});
