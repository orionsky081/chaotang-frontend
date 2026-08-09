/**
 * finance-loop-smoke —— 上书房→锦衣卫→户部→史馆 真闭环 integration smoke。
 *
 * 证明"端到端真的闭环归档"(而非各段各自 mock 通过)：POST complete(AAPL, autoDecide)
 * → 断言 stage===archived + 真 memorialId + 真 archiveId。修复前此链死在 hubu_memorial
 * (release_gate_blocked，rowToSignal 硬编码 medium 之病)。
 *
 * 需前端(:3002 走 /chaotang basePath)+ 后端 jiqun(:8081)同时在跑。
 * 任一 DOWN → SKIP + WARN，退出码 0(不阻断 CI，但必须可见)。schema/闭环回归 → 退出码 1。
 *
 * 用法：
 *   FE_URL=http://localhost:3002 node scripts/finance-loop-smoke.mjs
 */

const FE_BASE = (process.env.FE_URL ?? 'http://localhost:3002').replace(/\/$/, '');
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/chaotang';
const API = `${FE_BASE}${BASE_PATH}`;
const JIQUN_BASE = (process.env.JIQUN_API_URL ?? 'http://127.0.0.1:8081').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 180_000);
const USER = process.env.SMOKE_USER ?? 'ops';
const PASS = process.env.SMOKE_PASS ?? 'ops12345';

async function fetchT(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function reachable(url) {
  try {
    const res = await fetchT(url, { method: 'GET' });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function getToken() {
  // 幂等注册(已存在则忽略)再登录取 accessToken(dev 内存账号)。
  await fetchT(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS, email: `${USER}@smoke.local` }),
  }).catch(() => {});
  const res = await fetchT(`${API}/api/auth/local-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const body = await res.json().catch(() => ({}));
  return body?.accessToken ?? null;
}

async function run() {
  console.log(`▶ finance-loop-smoke  fe=${API}  jiqun=${JIQUN_BASE}`);

  const feUp = await reachable(`${API}/api/auth/register`).catch(() => false)
    || await reachable(`${API}/login`);
  const beUp = await reachable(`${JIQUN_BASE}/health`) || await reachable(`${JIQUN_BASE}/api/health`);
  if (!feUp || !beUp) {
    console.warn(`⚠ SKIP —— ${!feUp ? `前端(${API})` : ''}${!feUp && !beUp ? ' 与 ' : ''}${!beUp ? `后端(${JIQUN_BASE})` : ''} 不可达`);
    console.warn('  启动：cd frontend && pnpm dev  ·  cd backend && .venv/bin/python -m uvicorn web.main:app --port 8081');
    return { skipped: true };
  }

  const token = await getToken();
  if (!token) {
    console.warn('⚠ SKIP —— 无法取得登录 token(dev 账号)');
    return { skipped: true };
  }

  const res = await fetchT(`${API}/api/court/shangshufang/finance-intel-loop/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ticker: 'AAPL', autoDecide: true }),
  });
  const payload = await res.json().catch(() => ({}));
  const data = payload?.data ?? {};

  const failures = [];
  if (payload?.success !== true) failures.push(`success!=true (${payload?.error ?? 'unknown'})`);
  if (data.done !== true) failures.push(`done!=true (blockedAt=${data.blockedAt}, error=${data.error})`);
  if (data.stage !== 'archived') failures.push(`stage=${data.stage}, 期望 archived`);
  if (!data.memorialId) failures.push('缺 memorialId(户部奏折未产出)');
  const archiveId = data.archiveId ?? data.archive;
  if (!archiveId) failures.push('缺 archiveId(史馆未归档)');

  if (failures.length) {
    console.error('✖ 闭环未闭合:');
    for (const f of failures) console.error(`   - ${f}`);
    console.error('  timeline:', (data.timeline ?? []).map((t) => `${t.key}:${t.status}`).join(' → '));
    return { skipped: false, ok: false };
  }

  console.log(`✔ 闭环闭合 —— stage=archived  memorialId=${data.memorialId}  archiveId=${archiveId}`);
  console.log('  timeline:', (data.timeline ?? []).map((t) => `${t.key}:${t.status}`).join(' → '));
  return { skipped: false, ok: true };
}

run()
  .then((r) => process.exit(r.skipped ? 0 : r.ok ? 0 : 1))
  .catch((e) => {
    console.error('烟测异常:', e?.message ?? e);
    process.exit(2);
  });
