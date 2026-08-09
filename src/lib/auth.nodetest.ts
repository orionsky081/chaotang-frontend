import assert from 'node:assert/strict';
import test from 'node:test';

import { authedFetch } from './auth.ts';

// 会审回归(2026-07-11):authedFetch 是"取 token + 401 refresh 重试"的唯一姿势,
// 钉死 chaotang.ts/client.ts/useOrchestrationRun 收编后的行为,防再退回"只 getToken、过期即裸奔 401"。

const store = new Map<string, string>();

function setupBrowser(): void {
  (globalThis as unknown as { window: unknown }).window = { location: { protocol: 'http:' } };
  (globalThis as unknown as { document: unknown }).document = { cookie: '' };
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

function seed(session: Record<string, unknown>): void {
  store.set('courtos.auth', JSON.stringify(session));
}

function reset(): void {
  setupBrowser();
  store.clear();
}

test('authedFetch: getToken 有效 → 带 Bearer', async () => {
  reset();
  seed({ accessToken: 'tok1', refreshToken: 'r1', expiresAt: Date.now() + 3_600_000 });
  let seenAuth: string | undefined;
  (globalThis as unknown as { fetch: unknown }).fetch = async (_url: string, init: RequestInit) => {
    seenAuth = (init.headers as Record<string, string>)?.Authorization;
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
  };
  const res = await authedFetch('/x');
  assert.equal(res.status, 200);
  assert.equal(seenAuth, 'Bearer tok1');
});

test('authedFetch: getToken 过期返回 null → 兜底 getSession 仍发出 token(修复核心)', async () => {
  reset();
  seed({ accessToken: 'tok1', refreshToken: 'r1', expiresAt: Date.now() - 1_000 }); // 客户端已过期
  let seenAuth: string | undefined;
  (globalThis as unknown as { fetch: unknown }).fetch = async (_url: string, init: RequestInit) => {
    seenAuth = (init.headers as Record<string, string>)?.Authorization;
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
  };
  const res = await authedFetch('/x');
  assert.equal(res.status, 200);
  assert.equal(seenAuth, 'Bearer tok1'); // 旧 authHeaders() 这里会是 undefined → 401
});

test('authedFetch: 401 → refresh → 带新 token 重试成功', async () => {
  reset();
  seed({ accessToken: 'old', refreshToken: 'r1', expiresAt: Date.now() + 3_600_000 });
  const calls: Array<{ auth?: string }> = [];
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string, init: RequestInit) => {
    if (String(url).includes('/api/v1/auth/refresh')) {
      return { ok: true, status: 200, json: async () => ({ data: { access_token: 'new', refresh_token: 'r2' } }) } as unknown as Response;
    }
    calls.push({ auth: (init.headers as Record<string, string>)?.Authorization });
    return (calls.length === 1
      ? { ok: false, status: 401, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => ({}) }) as unknown as Response;
  };
  const res = await authedFetch('/target');
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].auth, 'Bearer old');
  assert.equal(calls[1].auth, 'Bearer new');
});

test('authedFetch: 401 且无 refreshToken → 不重试,返回 401(不死循环)', async () => {
  reset();
  seed({ accessToken: 'old', expiresAt: Date.now() + 3_600_000 }); // 无 refreshToken
  let n = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async () => {
    n += 1;
    return { ok: false, status: 401, json: async () => ({}) } as unknown as Response;
  };
  const res = await authedFetch('/target');
  assert.equal(res.status, 401);
  assert.equal(n, 1);
});
