import assert from 'node:assert/strict';
import test from 'node:test';

import { POST } from '@/app/api/court/shangshufang/kernel/runs/[runId]/outcomes/route.ts';

const URL = 'https://court.example/api/court/shangshufang/kernel/runs/run-1/outcomes';

const browserBody = {
  source_artifact_id: 'artifact://erp/quote-42',
  metric: 'gross_margin',
  actual_value: 23.4,
  observed_at: '2026-08-02T10:30:00+08:00',
  idempotency_key: 'outcome-123456',
};

function browserRequest(body: object, origin = 'https://court.example'): Request {
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

test('专用 BFF 固定注入人工验证事实且浏览器只得到 QUEUED 凭据', async (t) => {
  const originalFetch = globalThis.fetch;
  let upstreamBody: Record<string, unknown> | null = null;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/kernel\/runs\/run-1\/outcomes$/);
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer browser-session');
    upstreamBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      success: true,
      data: { run_id: 'run-1', outbox_id: 'outbox-1', status: 'QUEUED' },
      error: null,
    });
  };

  const response = await POST(
    browserRequest(browserBody),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );
  const responseText = await response.text();

  assert.equal(response.status, 200);
  assert.deepEqual(upstreamBody, { ...browserBody, human_validated: true });
  assert.doesNotMatch(
    responseText,
    /human_validated|tenant_id|subject_id|sealed_chain_hash|signature/,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('浏览器夹带权限、身份或签名字段时在接触后端前失败', async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({});
  };

  for (const forbidden of [
    { human_validated: true },
    { tenant_id: 'tenant-forged' },
    { run_id: 'run-forged' },
    { subject_id: 'subject-forged' },
    { provenance_signature: 'forged' },
  ]) {
    const response = await POST(
      browserRequest({ ...browserBody, ...forbidden }),
      { params: Promise.resolve({ runId: 'run-1' }) },
    );
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('跨站结果回填在接触后端前失败', async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await POST(
    browserRequest(browserBody, 'https://evil.example'),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test('上游 QUEUED 响应夹带权威字段时失败关闭', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({
    success: true,
    data: {
      run_id: 'run-1',
      outbox_id: 'outbox-1',
      status: 'QUEUED',
      sealed_chain_hash: 'must-not-cross',
    },
    error: null,
  });

  const response = await POST(
    browserRequest(browserBody),
    { params: Promise.resolve({ runId: 'run-1' }) },
  );
  assert.equal(response.status, 502);
});
