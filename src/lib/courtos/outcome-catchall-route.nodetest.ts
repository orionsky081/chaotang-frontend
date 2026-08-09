import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GET as catchAllGet,
  POST as catchAllPost,
} from '@/app/api/[...path]/route.ts';
import { isServerOnlyBackendMutation } from './server-only-backend-mutations.ts';

const prefix = ['court', 'shangshufang', 'kernel', 'runs', 'run-1'];

test('raw outcome 只有 POST 被专用 BFF 隔离', () => {
  assert.equal(isServerOnlyBackendMutation('POST', [...prefix, 'outcomes']), true);
  assert.equal(isServerOnlyBackendMutation('GET', [...prefix, 'outcomes']), false);
  assert.equal(
    isServerOnlyBackendMutation('GET', [...prefix, 'outcomes', 'requests', 'outbox-1']),
    false,
  );
  assert.equal(isServerOnlyBackendMutation('GET', [...prefix, 'similar-cases']), false);
});

test('catch-all 对 raw POST outcomes 伪装 404 且不接触后端', async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await catchAllPost(
    new Request('https://court.example/api/court/shangshufang/kernel/runs/run-1/outcomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ human_validated: false }),
    }),
    { params: Promise.resolve({ path: [...prefix, 'outcomes'] }) },
  );
  assert.equal(response.status, 404);
  assert.equal(called, false);
});

test('catch-all 保留 projection、request status 与 similar cases 三个只读面', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return Response.json({ success: true, data: {}, error: null });
  };

  const paths = [
    [...prefix, 'outcomes'],
    [...prefix, 'outcomes', 'requests', 'outbox-1'],
    [...prefix, 'similar-cases'],
  ];
  for (const path of paths) {
    const response = await catchAllGet(
      new Request(`https://court.example/api/${path.join('/')}`, {
        headers: { Authorization: 'Bearer browser-session' },
      }),
      { params: Promise.resolve({ path }) },
    );
    assert.equal(response.status, 200);
  }
  assert.equal(calls.length, 3);
  assert.match(calls[0], /\/outcomes$/);
  assert.match(calls[1], /\/outcomes\/requests\/outbox-1$/);
  assert.match(calls[2], /\/similar-cases$/);
});
