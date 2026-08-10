/**
 * 朝堂 OS · Mock 拦截器
 *
 * 全局开关：设置环境变量 NEXT_PUBLIC_MOCK=1 或在 .env.local 中添加 NEXT_PUBLIC_MOCK=1
 * 即可启用 mock 模式，所有 API 调用将返回本地 JSON 数据，无需后端。
 *
 * 使用方式：
 *   1. 在 .env.local 中添加 NEXT_PUBLIC_MOCK=1
 *   2. 或启动时 NEXT_PUBLIC_MOCK=1 pnpm dev
 *   3. 所有 API 调用自动走 mock 数据
 */

import studyBriefing from './data/study-briefing.json';
import intelBoard from './data/intel-board.json';
import shiguanStats from './data/shiguan-stats.json';
import reports from './data/reports.json';
import buildLedger from './data/build-ledger.json';
import manorMetrics from './data/manor-metrics.json';
import health from './data/health.json';
import archive from './data/archive.json';
import council from './data/council.json';
import healthProfile from './data/health-profile.json';
import tasks from './data/tasks.json';
import governanceBills from './data/governance-bills.json';
import governanceAudit from './data/governance-audit.json';
import governanceConstitutions from './data/governance-constitutions.json';
import hanlinOverview from './data/hanlin-overview.json';
import hanlinContributions from './data/hanlin-contributions.json';
import libu from './data/libu.json';
import forecastBoard from './data/forecast-board.json';
import courtPulse from './data/court-pulse.json';
import powerStatus from './data/power-status.json';

/** 是否启用 mock 模式 */
export function isMockMode(): boolean {
  if (typeof window !== 'undefined') {
    // 浏览器端：检查 Next.js 注入的环境变量
    return process.env.NEXT_PUBLIC_MOCK === '1';
  }
  // 服务端：检查环境变量
  return process.env.NEXT_PUBLIC_MOCK === '1';
}

/** Mock 数据路由表：path → data */
const MOCK_ROUTES: Record<string, unknown> = {
  // 丞相建议
  '/api/chaotang/study/briefing': studyBriefing,

  // 情报
  '/api/court/intel/signals': intelBoard,
  '/api/frontend/intel/board?limit=50': intelBoard,
  '/api/frontend/intel/board?limit=100': intelBoard,

  // 史馆
  '/api/frontend/shiguan/stats': shiguanStats,
  '/api/frontend/reports': reports,
  '/api/frontend/build-ledger': buildLedger,
  '/api/chaotang/archive': archive,

  // 庄园
  '/api/frontend/manor-metrics': manorMetrics,

  // 健康
  '/api/health': health,
  '/api/frontend/health-profile': healthProfile,

  // 军机处
  '/api/frontend/council?limit=20': council,
  '/api/frontend/council?limit=50': council,
  '/api/frontend/orchestration/run': { taskId: 'task-mock-001', status: 'running' },
  '/api/chaotang/tasks': tasks,

  // 治理
  '/api/frontend/governance/bills': governanceBills,
  '/api/frontend/governance/audit/summary': governanceAudit,
  '/api/frontend/governance/constitutions': governanceConstitutions,
  '/api/frontend/governance/deliberate': { status: 'deliberating' },

  // 翰林院
  '/api/frontend/hanlin/overview': hanlinOverview,
  '/api/frontend/hanlin/contributions': hanlinContributions,

  // 六部
  '/api/frontend/libu': libu,

  // 预测
  '/api/frontend/forecast/board': forecastBoard,

  // 朝堂脉搏
  '/api/frontend/court-pulse': courtPulse,

  // 能源
  '/api/frontend/power-status': powerStatus,

  // 认证
  '/api/auth/local-login': { success: true, token: 'mock-token-xxx' },
  '/api/auth/register': { success: true },
  '/api/auth/verify-invite': { valid: true },
  '/api/v1/auth/bootstrap': { user: { id: 'user-mock', name: '皇帝', role: 'admin' } },

  // 提示
  '/api/prompt/suggest': { suggestions: [] },

  // 观测
  '/api/court/observability/events': { events: [] },

  // 决策
  '/api/court/decision': { status: 'decided' },
  '/api/court/shangshufang/briefs': { briefs: [] },

  // 财务情报
  '/api/court/shangshufang/finance-intel-loop/cases': { cases: [] },

  // 管理
  '/api/admin/users': { users: [] },
  '/api/invite-codes/list': { codes: [] },
};

/** 带 query 参数的路径匹配 */
function matchMockPath(path: string): unknown | undefined {
  // 精确匹配
  if (path in MOCK_ROUTES) return MOCK_ROUTES[path];

  // 去掉 query 参数再匹配
  const basePath = path.split('?')[0];
  if (basePath in MOCK_ROUTES) return MOCK_ROUTES[basePath];

  // 动态路径匹配：/api/frontend/reports/:id
  if (basePath.startsWith('/api/frontend/reports/') && basePath !== '/api/frontend/reports') {
    const id = basePath.split('/').pop();
    const report = (reports as Array<{ id: string }>).find((r) => r.id === id);
    return report ?? { error: 'Report not found' };
  }

  // 动态路径匹配：/api/chaotang/tasks/:id
  if (basePath.startsWith('/api/chaotang/tasks/') && basePath !== '/api/chaotang/tasks') {
    const id = basePath.split('/').pop();
    const task = (tasks as { tasks: Array<{ taskId: string }> }).tasks.find((t) => t.taskId === id);
    return task ?? { error: 'Task not found' };
  }

  // 动态路径匹配：/api/frontend/forecast/scenarios/:id
  if (basePath.startsWith('/api/frontend/forecast/scenarios/')) {
    const id = basePath.split('/').pop();
    const scenario = (forecastBoard as { scenarios: Array<{ id: string }> }).scenarios.find((s) => s.id === id);
    return scenario ?? { error: 'Scenario not found' };
  }

  // 动态路径匹配：/api/frontend/governance/bills/:id
  if (basePath.startsWith('/api/frontend/governance/bills/') && basePath !== '/api/frontend/governance/bills') {
    const id = basePath.split('/').pop();
    const bill = (governanceBills as { items: Array<{ id: string }> }).items.find((b) => b.id === id);
    return bill ?? { error: 'Bill not found' };
  }

  // shangshufang loop 动态路径
  if (basePath.includes('/tasks/') && basePath.endsWith('/status')) {
    return {
      task: {
        task_id: 'task-mock-001',
        status: 'completed',
        raw_question: '铭硕电池Q3报价准入',
        source_label: 'LIVE',
        updated_at: '2026-08-10T10:30:00+08:00',
        draft_edict: null,
        missing_evidence: [],
      },
      review: {
        memorial: {
          title: '铭硕电池Q3报价准入回奏',
          verdict: '经丞相会审，建议准奏。',
          summary: '毛利率28.5%，符合准入标准。',
          source_label: 'LIVE',
          quality_gate: { status: 'passed', reasons: [], human_signoff_required: false },
          ministry_outputs: [
            { department: '户部', opinion: 'BOM成本核验通过' },
            { department: '工部', opinion: '交付周期30天确认' },
          ],
          evidence_chain: [],
          evidence_gaps: [],
          risk_flags: [],
          risk_register: [],
          horizontal_reviews: [],
          recommended_next_action: '准奏后归档',
          decision_options: [
            { action: 'approve', enabled: true },
            { action: 'reject', enabled: true },
            { action: 'request_evidence', enabled: true },
          ],
        },
        routing_plan: { route_reason: '报价准入需户部、工部、刑部联合审价' },
      },
    };
  }

  if (basePath.includes('/tasks/') && basePath.endsWith('/decision')) {
    return { status: 'decided', action: 'approve' };
  }

  if (basePath.includes('/tasks/') && basePath.endsWith('/archive')) {
    return {
      snapshot_hash: 'mock-hash-001',
      chain_hash: 'mock-chain-001',
      prediction_snapshot: {
        decision_as_of: '2026-08-10T10:30:00+08:00',
        predictions: [
          {
            prediction_type: 'gross_margin',
            status: 'available',
            expected_value: 0.285,
            unit: 'ratio',
            scenarios: {
              base: { expected_value: 0.285, unit: 'ratio', assumptions: [] },
              optimistic: { expected_value: 0.32, unit: 'ratio', assumptions: ['碳酸锂价格继续下跌'] },
              pessimistic: { expected_value: 0.25, unit: 'ratio', assumptions: ['原材料价格上涨'] },
            },
            versions: { model: { version: 'mock-v1' }, prompt: { version: 'mock-v1' }, data: { version: 'mock-v1' }, rule: { version: 'mock-v1' } },
          },
        ],
        qintian_role: { description: '钦天监仅提供预测预警，不直接形成硬否决。' },
      },
    };
  }

  if (basePath.includes('/tasks/') && basePath.endsWith('/telemetry')) {
    return {
      effect_coverage: { status: 'complete', reason: null },
      measurements: {
        draft_to_memorial_elapsed: { value: 45000, unit: 'ms' },
        cost: { value: 2.5, unit: 'CNY' },
        external_reads: { value: 3, unit: 'count' },
        external_mutations: { value: 0, unit: 'count' },
      },
      gates: {
        time_20_minutes: { status: 'passed' },
        cost_15_cny: { status: 'passed', reason: '成本2.5元，远低于15元门' },
        external_mutations_zero: { status: 'passed' },
        overall: { status: 'passed' },
      },
    };
  }

  if (basePath.includes('/tasks/') && basePath.endsWith('/deviation-card')) {
    return { deviations: [] };
  }

  if (basePath.includes('/tasks/') && basePath.endsWith('/outcomes')) {
    return { status: 'recorded' };
  }

  // readiness
  if (basePath.includes('/readiness') || basePath.endsWith('/readiness')) {
    return {
      state: 'ready',
      serviceBlockers: [],
      formalPilotBlockers: [],
      headline: '内部试用可开始',
      description: '所有运行时守门已通过。',
      formalPilotLabel: '正式试点：未启用',
    };
  }

  // signoff challenge
  if (basePath.includes('/signoff-challenge')) {
    return {
      challenge: {
        task_id: 'task-mock-001',
        action: 'approve',
        context_digest: 'mock-digest-001',
        nonce: 'mock-nonce-001',
        expires_at: '2026-08-10T19:00:00+08:00',
      },
    };
  }

  // intake / draft-edict / confirm-edict
  if (basePath.endsWith('/kernel/intake') || basePath.endsWith('/draft-edict') || basePath.endsWith('/confirm-edict')) {
    return {
      run_id: 'task-mock-001',
      status: 'running',
      source_label: 'LIVE',
    };
  }

  return undefined;
}

/**
 * Mock 拦截器：如果 mock 模式开启，返回 mock 数据；否则返回 undefined 让正常请求继续。
 */
export function interceptMock<T>(path: string, method: string = 'GET'): T | undefined {
  if (!isMockMode()) return undefined;

  const data = matchMockPath(path);
  if (data !== undefined) {
    console.log(`[MOCK] ${method} ${path}`);
    return data as T;
  }

  // 对于未匹配的 POST 请求，返回通用成功
  if (method === 'POST') {
    console.log(`[MOCK] ${method} ${path} → generic success`);
    return { success: true, status: 'ok' } as T;
  }

  console.warn(`[MOCK] No mock data for: ${method} ${path}`);
  return undefined;
}
