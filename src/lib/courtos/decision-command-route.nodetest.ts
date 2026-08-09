import assert from 'node:assert/strict';
import test from 'node:test';

import { POST } from '@/app/api/court/shangshufang/kernel/runs/[runId]/decision-command/route.ts';

const URL = 'https://court.example/api/court/shangshufang/kernel/runs/run-1/decision-command';

function browserRequest(body: object, origin = 'https://court.example'): Request {
  return new Request(URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer browser-session',
      'Content-Type': 'application/json',
      Origin: origin,
      'Sec-Fetch-Site': origin === 'https://court.example' ? 'same-origin' : 'cross-site',
    },
    body: JSON.stringify(body),
  });
}

test('BFF 在服务端兑换 challenge 且绝不把 bearer 返回浏览器', async (t) => {
  const calls: Array<{ url: string; body: Record<string, unknown>; authorization: string | null }> = [];
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
          review_token: 'server-only-bearer',
          expected_revision: 7,
          action: 'APPROVE',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      });
    }
    return Response.json({
      success: true,
      data: {
        run_id: 'run-1',
        outbox_id: 'outbox-1',
        revision: 7,
        status: 'QUEUED',
        command_kind: 'COURT_DECISION',
        runtime: 'langgraph_court',
      },
      error: null,
    });
  };

  const response = await POST(
    browserRequest({
      action: 'APPROVE',
      reason: '利润与交付边界均已复核',
      idempotency_key: 'decision-123456',
    }),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );
  const responseText = await response.text();

  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/decision-challenge$/);
  assert.deepEqual(calls[0].body, {
    action: 'APPROVE',
    reason: '利润与交付边界均已复核',
    idempotency_key: 'decision-123456',
  });
  assert.match(calls[1].url, /\/decision$/);
  assert.deepEqual(calls[1].body, {
    action: 'APPROVE',
    reason: '利润与交付边界均已复核',
    idempotency_key: 'decision-123456',
    expected_revision: 7,
    review_token: 'server-only-bearer',
  });
  assert.equal(calls[0].body.reason, calls[1].body.reason);
  assert.equal(calls[0].authorization, 'Bearer browser-session');
  assert.equal(calls[1].authorization, 'Bearer browser-session');
  assert.doesNotMatch(responseText, /server-only-bearer|review_token/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('跨站请求在接触后端前即被拒绝', async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await POST(
    browserRequest({
      action: 'REJECT',
      reason: '证据不足',
      idempotency_key: 'decision-654321',
    }, 'https://evil.example'),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );

  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test('商业例外两阶段传递同一结构且浏览器不能自称最终批准人', async (t) => {
  const calls: Array<Record<string, unknown>> = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_input, init) => {
    calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (calls.length === 1) {
      return Response.json({
        success: true,
        data: {
          review_token: 'exception-review-token',
          expected_revision: 7,
          action: 'APPROVE',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
      });
    }
    return Response.json({
      success: true,
      data: {
        run_id: 'run-1', outbox_id: 'outbox-exception', revision: 7,
        status: 'QUEUED', command_kind: 'COURT_DECISION', runtime: 'langgraph_court',
      },
    });
  };
  const exception = {
    reason: '战略客户首单',
    risk_exposure: '预计毛利损失 10 万元',
    owner: '销售总监',
    remediation: '验收节点回收折扣',
    review_date: '2026-09-01',
  };
  const response = await POST(browserRequest({
    action: 'APPROVE', reason: '承担首单风险',
    idempotency_key: 'business-exception-1', business_exception: exception,
  }), { params: Promise.resolve({ runId: 'run-1' }) });

  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].business_exception, exception);
  assert.deepEqual(calls[1].business_exception, exception);

  const forged = await POST(browserRequest({
    action: 'APPROVE', reason: '伪造批准人',
    idempotency_key: 'business-exception-2',
    business_exception: { ...exception, final_approver: 'attacker' },
  }), { params: Promise.resolve({ runId: 'run-1' }) });
  assert.equal(forged.status, 400);
  assert.equal(calls.length, 2);
});
