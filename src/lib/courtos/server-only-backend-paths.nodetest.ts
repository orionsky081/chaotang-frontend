import assert from 'node:assert/strict';
import test from 'node:test';

import { POST as catchAllPost } from '@/app/api/[...path]/route.ts';
import { isServerOnlyBackendPath } from './server-only-backend-paths.ts';

test('通用代理不能把裁决或归档 bearer 与 raw command 暴露给浏览器', () => {
  for (const command of [
    'decision-challenge',
    'decision',
    'archive-challenge',
    'archive',
  ]) {
    assert.equal(isServerOnlyBackendPath([
      'court',
      'shangshufang',
      'kernel',
      'runs',
      'run-1',
      command,
    ]), true);
  }
  assert.equal(isServerOnlyBackendPath([
    'court',
    'shangshufang',
    'kernel',
    'runs',
    'run-1',
    'decision-command',
  ]), false);
  assert.equal(isServerOnlyBackendPath([
    'court',
    'shangshufang',
    'kernel',
    'runs',
    'run-1',
    'archive-command',
  ]), false);
  assert.equal(isServerOnlyBackendPath([
    'court',
    'shangshufang',
    'kernel',
    'runs',
    'run-1',
  ]), false);
});

test('catch-all 在调用后端 proxy 前即把 server-only 路径伪装成 404', async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await catchAllPost(
    new Request('https://court.example/api/court/shangshufang/kernel/runs/run-1/decision-challenge', {
      method: 'POST',
    }),
    {
      params: Promise.resolve({
        path: [
          'court',
          'shangshufang',
          'kernel',
          'runs',
          'run-1',
          'decision-challenge',
        ],
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(called, false);
});
