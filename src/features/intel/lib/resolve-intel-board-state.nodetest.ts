import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveIntelBoardState } from './resolve-intel-board-state.ts';
import type { IntelBoard } from '@/lib/contracts/intel';

const SAMPLE_BOARD: IntelBoard = {
  signals: [],
  headline: null,
  dispatchTargets: [],
  stats: { total: 3, urgent: 1, verified: 2, sourceCount: 4 },
  sourceLabel: 'LIVE_SWARM',
};

test('isLoading 优先于其余一切信号', () => {
  const state = resolveIntelBoardState({ board: SAMPLE_BOARD, isLoading: true, isError: true });
  assert.equal(state.status, 'loading');
});

test('isError 优先于 ready/empty（即便 board 已经到手也判 error）', () => {
  const state = resolveIntelBoardState({ board: SAMPLE_BOARD, isLoading: false, isError: true });
  assert.equal(state.status, 'error');
});

test('board 到手 → ready，且 data 就是那份真 board（不是复制品、不是兜底值）', () => {
  const state = resolveIntelBoardState({ board: SAMPLE_BOARD, isLoading: false, isError: false });
  assert.equal(state.status, 'ready');
  assert.equal(state.status === 'ready' ? state.data : null, SAMPLE_BOARD);
});

// 铁律4 回归：把"不该发生的事"钉成测试。
// 后端对该端点存在合法的"成功但空 body"路径（204 透传 + apiFetch 空 body 归 undefined，
// 见 resolve-intel-board-state.ts 顶部注释）——isLoading=false 且 isError=false，
// 但 board 仍可能是 null。这种情况绝不能被伪装成 ready（旧代码正是这样，靠
// Metric 的 `?? 0` 把"没数据"画成"0 条情报"）。必须显式落入 empty。
test('board 缺失（isLoading=false, isError=false, board=null）必须显式落入 empty，不许伪装成 ready', () => {
  const state = resolveIntelBoardState({ board: null, isLoading: false, isError: false });
  assert.equal(
    state.status,
    'empty',
    '这是 B4 红线：未知不能兜底成 0，board 缺失只能是 empty，不能是 ready',
  );
});

test('board=undefined 与 board=null 同等对待（TS 类型只声明了 null，运行时兜底同一路径）', () => {
  const state = resolveIntelBoardState({
    board: undefined as unknown as IntelBoard | null,
    isLoading: false,
    isError: false,
  });
  assert.equal(state.status, 'empty');
});
