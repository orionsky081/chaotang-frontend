import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { assertScanAlive } from '../guards/scan-alive.ts';
import { scanFrontendBoundary } from './rest-backend-boundary-scan.ts';

interface Attack {
  name: string;
  files: Record<string, string>;
  expectedKind: string;
  found: string;
}

/** 已知绕过手法，只增不减。 */
const ATTACKS: Attack[] = [
  {
    name: '用 fs/promises.open 取句柄后追加，避开 writeFile',
    files: {
      'src/app/api/sneaky/route.ts':
        "import { open } from 'node:fs/promises';\nexport async function POST() { const f = await open('/tmp/x', 'a'); await f.appendFile('x'); }\n",
    },
    expectedKind: 'frontend-filesystem-write',
    found: '2026-07-19 红队：只列 writeFile/appendFile import 会漏掉句柄写入',
  },
  {
    name: '用 bracket notation 写 localStorage 业务台账',
    files: {
      'src/features/sneaky/store.ts':
        "export function save(v: string) { localStorage['setItem']('business-ledger', v); }\n",
    },
    expectedKind: 'browser-business-persistence',
    found: '2026-07-19 红队：方法名正则挡不住对象本身的另一种访问语法',
  },
  {
    name: '从本地 barrel 转导出 Socket.IO',
    files: {
      'src/lib/transport/index.ts': "export { io as connect } from 'socket.io-client';\n",
      'src/features/sneaky/client.ts': "import { connect } from '@/lib/transport';\nconnect();\n",
    },
    expectedKind: 'non-rest-transport',
    found: '2026-07-19 红队：只检查组件 import 会漏掉转导出',
  },
  {
    name: '动态拼接 globalThis EventSource',
    files: {
      'src/features/sneaky/sse.ts':
        "const SSE = globalThis['Event' + 'Source'];\nexport const stream = new SSE('/api/events');\n",
    },
    expectedKind: 'non-rest-transport',
    found: '2026-07-19 红队：拆字符串可绕过 EventSource 字面量扫描',
  },
  {
    name: '直接 fetch 外部绝对业务地址',
    files: {
      'src/app/api/sneaky/route.ts':
        "export async function GET() { return fetch('https://provider.example/v1/run'); }\n",
    },
    expectedKind: 'direct-upstream',
    found: '2026-07-19 红队：不用环境变量即可绕过上游变量名单',
  },
  {
    name: '业务代码内直接 authedFetch /api',
    files: {
      'src/features/sneaky/task.ts':
        "export const query = () => authedFetch('/api/frontend/finance/task');\n",
    },
    expectedKind: 'direct-business-http',
    found: '2026-07-19 红队：只允许 API 客户端层发起 /api 请求，业务层绕开网关仍可回归',
  },
  {
    name: '业务代码用模板字面量拼接 /api',
    files: {
      'src/features/sneaky/task.ts':
        "const route = 'frontend/finance/task';\nexport const query = () => fetch(withBasePath(`/api/${route}`));\n",
    },
    expectedKind: 'direct-business-http',
    found: '2026-07-19 红队：字符串拼接会绕过字面量前缀匹配',
  },
  {
    name: "业务代码内直接 fetch(withBasePath('/api/...'))",
    files: {
      'src/features/sneaky/task.ts':
        "export const query = () => fetch(withBasePath('/api/frontend/finance/task'));\n",
    },
    expectedKind: 'direct-business-http',
    found: '2026-07-19 红队：withBasePath 套皮不能作为 API 边界豁免',
  },
  {
    name: '先构造外部 URL 对象再交给 fetch',
    files: {
      'src/app/api/sneaky/route.ts':
        "const endpoint = new URL('https://provider.example/v1/run');\nexport async function POST() { return fetch(endpoint); }\n",
    },
    expectedKind: 'direct-upstream',
    found: '2026-07-19 红队：只匹配 fetch(绝对字符串)会漏掉 URL 变量',
  },
  {
    name: '绕开 fetch 改用 Node http request',
    files: {
      'src/app/api/sneaky/route.ts':
        "import https from 'node:https';\nexport function POST() { return https.request('https://provider.example/v1/run'); }\n",
    },
    expectedKind: 'direct-upstream',
    found: '2026-07-19 红队：网络边界不能只看 fetch API',
  },
  {
    name: '拆串读取已退役上游环境变量',
    files: {
      'src/app/api/sneaky/route.ts':
        "const key = process.env['COURTOS' + '_API_URL'];\nexport const endpoint = key;\n",
    },
    expectedKind: 'direct-upstream',
    found: '2026-07-19 红队：环境变量名可用简单拼接躲字面量扫描',
  },
  {
    name: '经本地 barrel 间接导入 CourtOS 业务运行时',
    files: {
      'src/features/sneaky/runtime.ts':
        "export { runDecisionLoop } from '@/core/courtos/orchestrator/decision-loop';\n",
      'src/features/sneaky/client.ts':
        "'use client';\nimport { runDecisionLoop } from './runtime';\nexport const run = runDecisionLoop;\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：只查 use-client 文件的直接 import 会漏掉本地转导出',
  },
  {
    name: '前端直接 import LLM SDK 包（SDK 内部发请求，绝对URL正则看不见）',
    files: {
      'src/features/sneaky/llm.ts':
        "import OpenAI from 'openai';\nexport const client = new OpenAI();\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-23 架构定调：前端只做 REST 客户端。SDK 包 import 是 core/courtos 之外的第二条 LLM 复长路径，绝对URL fetch 规则看不见（请求在包内部发）',
  },
  {
    name: '动态 import LLM SDK 绕过 from/require',
    files: {
      'src/features/sneaky/lazy-llm.ts':
        "export async function ask() { const { Anthropic } = await import('@anthropic-ai/sdk'); return new Anthropic(); }\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-23 先当攻击者：动态 import 可绕过只认 from|require 的正则（零 DB 守门栽过同一处）',
  },
  {
    name: '子路径导出 LLM SDK 绕过包名精确匹配',
    files: {
      'src/features/sneaky/subpath-llm.ts':
        "import { GoogleGenAI } from '@google/genai/node';\nexport const g = new GoogleGenAI({});\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-23 先当攻击者：SDK 子路径入口（@google/genai/node）会绕过要求引号紧贴包名的匹配（零 DB 会审实测过 @libsql/client/web 同款绕法）',
  },
  {
    name: '把前端业务分类器改名成 projection',
    files: {
      'src/features/sneaky/projection.ts':
        "export function classifySignal(score: number) { return score >= 80 ? 'critical' : score >= 50 ? 'warning' : 'watch'; }\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：只封旧目录名，换成 projection 就能把领域分类重新带回前端',
  },
  {
    name: '把业务事实伪装成 dashboard 静态数据',
    files: {
      'src/features/sneaky/dashboard-data.ts':
        "export const CASES = [{ id: 'case-1', status: 'approved', score: 91, owner: '户部' }];\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：不写函数也不落库，静态数组仍可在浏览器冒充后端业务事实',
  },
  {
    name: '把权重、状态机和裁决藏进 calculator',
    files: {
      'src/features/sneaky/calculator.ts':
        "export const TRANSITIONS = { pending: ['approved', 'rejected'] };\nexport function calculateVerdict(a: number, b: number) { const weightedScore = a * 0.7 + b * 0.3; return weightedScore >= 60 ? 'approve' : 'reject'; }\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：换掉 engine/rules 命名后，前端仍可偷偷执行领域权重与状态转移',
  },
  {
    name: '用超时阈值在浏览器判定业务接管',
    files: {
      'src/app/tasks/page.tsx':
        "const STUCK_THRESHOLD_MS = 30 * 60 * 1000;\nexport function isStuck(updatedAt: string) { return Date.now() - Date.parse(updatedAt) > STUCK_THRESHOLD_MS; }\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：时间阈值没有 classifier/weights 字样，但仍在浏览器产生业务裁决',
  },
  {
    name: '按后端置信度在前端自动选择派单类别',
    files: {
      'src/features/sneaky/dispatch.ts':
        "export const choose = (draft: any) => draft.recommendedCategories.reduce((best: any, cat: any) => cat.confidence >= (best?.confidence ?? 0) ? cat : best);\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：数据来自后端不代表裁决也在后端，argmax 仍是派单业务逻辑',
  },
  {
    name: '排序后取首项绕过 reduce 置信度派单守卫',
    files: {
      'src/features/sneaky/dispatch.ts':
        "export const choose = (draft: any) => draft.recommendedCategories.sort((a: any, b: any) => b.confidence - a.confidence)[0];\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：只封 reduce 时，sort()[0] 仍能在浏览器完成 argmax 派单',
  },
  {
    name: '用不可变 toSorted 后取首项选择派单类别',
    files: {
      'src/features/sneaky/dispatch.ts':
        "export const choose = (draft: any) => draft.recommendedCategories.toSorted((a: any, b: any) => b.confidence - a.confidence)[0];\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：避开原地 sort 仍可偷偷把置信度排序裁决搬回前端',
  },
  {
    name: '用 Math.max 加 map 和 find 选择最高置信度',
    files: {
      'src/features/sneaky/dispatch.ts':
        "export const choose = (draft: any) => { const top = Math.max(...draft.recommendedCategories.map((item: any) => item.confidence)); return draft.recommendedCategories.find((item: any) => item.confidence === top); };\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：不调用 reduce/sort 的 Math.max 组合仍是浏览器派单裁决',
  },
  {
    name: '请求失败也在浏览器推进领域状态',
    files: {
      'src/features/sneaky/review.tsx':
        "export function done(task: any, setTask: any) { setTask({ ...task, status: 'reviewed' }); }\n",
    },
    expectedKind: 'frontend-business-runtime',
    found: '2026-07-19 红队：本地 setState 可伪造后端从未确认的状态迁移',
  },
  {
    name: 'public service worker 偷开 WebSocket',
    files: {
      'public/sw.js': "self.socket = new WebSocket('wss://provider.example/events');\n",
    },
    expectedKind: 'non-rest-transport',
    found: '2026-07-19 红队：public 下脚本会原样发布，但旧守门只扫 src',
  },
  {
    name: '根 instrumentation.ts 直连 provider',
    files: {
      'instrumentation.ts': "export async function register() { await fetch('https://provider.example/register'); }\n",
    },
    expectedKind: 'direct-upstream',
    found: '2026-07-19 红队：Next 根运行时入口不一定放在 src，固定 src 扫描会漏',
  },
  {
    name: 'next.config.mjs 恢复 Socket.IO 旁路',
    files: {
      'next.config.mjs': "export default { async rewrites() { return [{ source: '/socket.io/:path*', destination: 'http://127.0.0.1:8081/socket.io/:path*' }]; } };\n",
    },
    expectedKind: 'non-rest-transport',
    found: '2026-07-19 红队：旧守门只点名 next.config.ts，换扩展名即可绕过',
  },
];

for (const attack of ATTACKS) {
  test(`架构攻击集：${attack.name} —— 必须被拦下`, () => {
    const root = mkdtempSync(join(tmpdir(), 'rest-boundary-attack-'));
    try {
      for (const [file, source] of Object.entries(attack.files)) {
        const full = join(root, file);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, source, 'utf8');
      }
      const { violations } = scanFrontendBoundary(root);
      assert.ok(
        violations.some((item) => item.kind === attack.expectedKind),
        `攻击绕过了边界守门：${attack.name}\n出处：${attack.found}\n` +
          `实际命中：${violations.map((item) => item.kind).join(', ') || '无'}`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('架构攻击集：心跳（攻击资产不得被清空）', () => {
  assertScanAlive('REST 后端边界攻击集', { 已知绕过手法: ATTACKS.length });
});
