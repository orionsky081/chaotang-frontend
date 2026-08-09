import test from 'node:test';
import assert from 'node:assert/strict';

import { isMinistryLive, MINISTRY_TO_DEPT_CODE } from './department-vitrine.ts';

// 铁律4 回归：真徽 ⟺ 真注册了办公厅。2026-07 六部办公厅全部上架
// (0366bc34 户/工全套 + 刑部孤儿办公厅上架 + 兵/吏/礼办公厅注册),预期同步为 6。
test('六部均已注册办公厅亮真徽（真徽 ⟺ 注册表有厅，防金光给错部门骗人）', () => {
  assert.equal(isMinistryLive('hubu'), true, '户部已注册办公厅');
  assert.equal(isMinistryLive('bingbu'), true, '兵部已注册办公厅');
  assert.equal(isMinistryLive('gongbu'), true, '工部已注册办公厅');
  assert.equal(isMinistryLive('libu'), true, '吏部已注册办公厅');
  assert.equal(isMinistryLive('libu2'), true, '礼部已注册办公厅');
  assert.equal(isMinistryLive('xingbu'), true, '刑部已注册办公厅');
});

test('未知 key 不得亮真徽（诚实兜底）', () => {
  assert.equal(isMinistryLive('not-a-ministry'), false);
  assert.equal(isMinistryLive(''), false);
});

test('恰好 6 个真部门（与注册表一致，变了=有人动注册表未同步预期）', () => {
  const liveCount = Object.keys(MINISTRY_TO_DEPT_CODE).filter(isMinistryLive).length;
  assert.equal(liveCount, 6, '真部门应恰好 6 个(六部全上架)；变了说明注册表动了，需同步预期');
});
