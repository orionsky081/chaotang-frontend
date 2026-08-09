import assert from 'node:assert/strict';
import test from 'node:test';

import { POST } from '@/app/api/court/shangshufang/kernel/runs/[runId]/archive-command/route.ts';

const URL = 'https://court.example/api/court/shangshufang/kernel/runs/run-1/archive-command';

function browserRequest(
  body: object,
  origin = 'https://court.example',
): Request {
  return new Request(URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer browser-session',
      'Content-Type': 'application/json',
      Origin: origin,
      'Sec-Fetch-Site': origin === 'https://court.example'
        ? 'same-origin'
        : 'cross-site',
    },
    body: JSON.stringify(body),
  });
}

test('BFF 服务端兑换归档 challenge 且绝不返回 token 或签名', async (t) => {
  const calls: Array<{
    url: string;
    body: Record<string, unknown>;
    authorization: string | null;
  }> = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      authorization: new Headers(init?.headers).get('authorization'),
    });
    if (calls.length === 1) {
      return Response.json({
        success: true,
        data: {
          review_token: 'server-only-archive-bearer',
          expected_revision: 7,
          action: 'ARCHIVE',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          runtime: 'langgraph_court',
        },
        error: null,
      });
    }
    return Response.json({
      success: true,
      data: {
        run_id: 'run-1',
        outbox_id: 'archive-outbox-1',
        revision: 7,
        status: 'QUEUED',
        command_kind: 'COURT_ARCHIVE',
        runtime: 'langgraph_court',
      },
      error: null,
    });
  };

  const response = await POST(
    browserRequest({ idempotency_key: 'archive-123456' }),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );
  const responseText = await response.text();

  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/archive-challenge$/);
  assert.deepEqual(calls[0].body, {
    idempotency_key: 'archive-123456',
  });
  assert.match(calls[1].url, /\/archive$/);
  assert.deepEqual(calls[1].body, {
    review_token: 'server-only-archive-bearer',
    idempotency_key: 'archive-123456',
  });
  assert.equal(calls[0].authorization, 'Bearer browser-session');
  assert.equal(calls[1].authorization, 'Bearer browser-session');
  assert.doesNotMatch(
    responseText,
    /server-only-archive-bearer|review_token|execution_attestation/,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('浏览器夹带服务端权限字段时在接触后端前失败', async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await POST(
    browserRequest({
      idempotency_key: 'archive-123456',
      review_token: 'forged',
      execution_attestation: 'forged',
    }),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test('跨站归档请求在接触后端前失败', async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await POST(
    browserRequest(
      { idempotency_key: 'archive-123456' },
      'https://evil.example',
    ),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );

  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test('错误动作、runtime 或过期 challenge 绝不触发归档兑换', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  for (const challenge of [
    {
      action: 'APPROVE',
      runtime: 'langgraph_court',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    {
      action: 'ARCHIVE',
      runtime: 'canary',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    {
      action: 'ARCHIVE',
      runtime: 'langgraph_court',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    },
  ]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({
        success: true,
        data: {
          review_token: 'server-only',
          expected_revision: 7,
          ...challenge,
        },
        error: null,
      });
    };
    const response = await POST(
      browserRequest({ idempotency_key: `archive-invalid-${calls}` }),
      { params: Promise.resolve({ runId: 'run-1' }) },
    );
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
  }
});

test('上游归档响应夹带 execution attestation 时失败关闭', async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return Response.json({
        success: true,
        data: {
          review_token: 'server-only',
          expected_revision: 7,
          action: 'ARCHIVE',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          runtime: 'langgraph_court',
        },
        error: null,
      });
    }
    return Response.json({
      success: true,
      data: {
        run_id: 'run-1',
        outbox_id: 'archive-outbox-1',
        revision: 7,
        status: 'QUEUED',
        command_kind: 'COURT_ARCHIVE',
        runtime: 'langgraph_court',
        execution_attestation: 'must-not-cross-browser-boundary',
      },
      error: null,
    });
  };

  const response = await POST(
    browserRequest({ idempotency_key: 'archive-extra-field' }),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );
  assert.equal(response.status, 502);
});
