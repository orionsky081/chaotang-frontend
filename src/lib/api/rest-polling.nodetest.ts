import assert from 'node:assert/strict';
import test from 'node:test';

import { pollUntilTerminal, PollingHttpError } from './rest-polling.ts';

test('REST polling：收到 terminal 状态后立即完成', async () => {
  const states = ['running', 'running', 'done'] as const;
  let calls = 0;
  const seen: string[] = [];
  const result = await pollUntilTerminal({
    load: async () => ({ status: states[calls++] ?? 'done' }),
    isTerminal: (value) => value.status === 'done',
    onUpdate: (value) => seen.push(value.status),
    wait: async () => {},
  });
  assert.equal(result.status, 'done');
  assert.equal(calls, 3);
  assert.deepEqual(seen, ['running', 'running', 'done']);
});

test('REST polling：404 是终止错误，不继续重试', async () => {
  let calls = 0;
  await assert.rejects(
    pollUntilTerminal({
      load: async () => {
        calls += 1;
        throw new PollingHttpError(404, 'missing');
      },
      isTerminal: () => false,
      wait: async () => {},
    }),
    (error: unknown) => error instanceof PollingHttpError && error.status === 404,
  );
  assert.equal(calls, 1);
});

test('REST polling：瞬时失败按上限退避后恢复', async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await pollUntilTerminal({
    load: async () => {
      calls += 1;
      if (calls < 3) throw new PollingHttpError(503, 'busy');
      return { status: 'done' };
    },
    isTerminal: (value) => value.status === 'done',
    initialDelayMs: 100,
    backoffFactor: 2,
    maxDelayMs: 150,
    wait: async (ms) => { waits.push(ms); },
  });
  assert.equal(result.status, 'done');
  assert.deepEqual(waits, [100, 150]);
});

test('REST polling：AbortSignal 取消后不再发下一次请求', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    pollUntilTerminal({
      load: async () => {
        calls += 1;
        controller.abort();
        return { status: 'running' };
      },
      isTerminal: () => false,
      signal: controller.signal,
      wait: async () => {},
    }),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
  assert.equal(calls, 1);
});

