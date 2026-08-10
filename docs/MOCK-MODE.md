# 朝堂 OS · Mock 模式运行指南

> 无需后端服务，前端独立运行所有页面。

---

## 快速开始

```bash
# 1. 进入项目目录
cd chaotang-frontend

# 2. 安装依赖（首次）
pnpm install

# 3. 启用 mock 模式（二选一）

# 方式 A：直接启动（推荐）
NEXT_PUBLIC_MOCK=1 pnpm dev

# 方式 B：创建 .env.local 文件
echo "NEXT_PUBLIC_MOCK=1" > .env.local
pnpm dev

# 4. 访问
open http://localhost:3002/chaotang/overview
```

---

## 配置说明

### 环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 启用 mock 模式（所有 API 返回本地 JSON 数据）
NEXT_PUBLIC_MOCK=1

# 后端 API 地址（mock 模式下不会实际请求）
JIQUN_API_URL=http://127.0.0.1:8081

# 基础路径
BASE_PATH=/chaotang
```

### 开关切换

| 状态 | 配置 | 说明 |
|---|---|---|
| **Mock 模式** | `NEXT_PUBLIC_MOCK=1` | 所有 API 返回本地 JSON，无需后端 |
| **真实模式** | `NEXT_PUBLIC_MOCK=0` 或不设置 | 请求真实后端 API |

---

## 可访问的页面

Mock 模式下，以下页面均可正常访问：

| 页面 | 路由 | 说明 |
|---|---|---|
| 大殿 | `/chaotang/overview` | 主页，丞相建议 + 部门状态 |
| 上书房 | `/chaotang/court-briefing` | 三栏布局，拟旨/回奏/裁决 |
| 军机处 | `/chaotang/command-center` | 作战沙盘，会审/立案 |
| 六部 | `/chaotang/departments` | 六部卡片 + Office Rail |
| 庄园 | `/chaotang/manors` | 蜂群执行中心 |
| 锦衣卫 | `/chaotang/intel` | 情报巡察台 |
| 史馆 | `/chaotang/archive` | 档案归档 + 知识飞轮 |
| 拟旨 | `/chaotang/throne/compose` | 圣旨卷轴编辑器 |
| 翰林院 | `/chaotang/hanlin` | 技能研发 |
| 治理 | `/chaotang/governance` | 议案审议 |
| 预测 | `/chaotang/forecast` | 钦天监预测面板 |
| 健康 | `/chaotang/health` | 系统健康状态 |
| 报告 | `/chaotang/reports` | 报告列表 |
| 设置 | `/chaotang/settings` | 系统设置 |

---

## Mock 数据清单

所有 mock 数据位于 `src/lib/api/mock/data/` 目录：

| 文件 | 对应接口 | 说明 |
|---|---|---|
| `study-briefing.json` | `/api/chaotang/study/briefing` | 丞相今日建议（3 条） |
| `intel-board.json` | `/api/frontend/intel/board` | 锦衣卫情报（5 条信号） |
| `shiguan-stats.json` | `/api/frontend/shiguan/stats` | 史馆统计（任务/成案/成功率） |
| `reports.json` | `/api/frontend/reports` | 报告列表（3 份） |
| `build-ledger.json` | `/api/frontend/build-ledger` | 建设台账（2 条） |
| `manor-metrics.json` | `/api/frontend/manor-metrics` | 六部指标（户/吏/兵/礼/刑/工） |
| `health.json` | `/api/health` | 系统健康状态 |
| `health-profile.json` | `/api/frontend/health-profile` | 健康档案详情 |
| `archive.json` | `/api/chaotang/archive` | 归档数据（任务/奏折/决策） |
| `council.json` | `/api/frontend/council` | 会审数据（大臣/风险/蜂群） |
| `tasks.json` | `/api/chaotang/tasks` | 任务列表（3 条） |
| `governance-bills.json` | `/api/frontend/governance/bills` | 治理议案（2 条） |
| `governance-audit.json` | `/api/frontend/governance/audit/summary` | 治理审计摘要 |
| `governance-constitutions.json` | `/api/frontend/governance/constitutions` | 治理宪章（2 条） |
| `hanlin-overview.json` | `/api/frontend/hanlin/overview` | 翰林院概览 |
| `hanlin-contributions.json` | `/api/frontend/hanlin/contributions` | 翰林院贡献（2 条） |
| `libu.json` | `/api/frontend/libu` | 六部/吏部数据 |
| `forecast-board.json` | `/api/frontend/forecast/board` | 预测面板（2 个情景） |
| `court-pulse.json` | `/api/frontend/court-pulse` | 朝堂脉搏事件 |
| `power-status.json` | `/api/frontend/power-status` | 能源状态 |

---

## 自定义 Mock 数据

### 修改现有数据

直接编辑 `src/lib/api/mock/data/` 下的 JSON 文件即可。

### 添加新端点

1. 在 `src/lib/api/mock/data/` 下创建新的 JSON 文件
2. 在 `src/lib/api/mock/interceptor.ts` 中导入并注册：

```typescript
import myNewData from './data/my-new-data.json';

const MOCK_ROUTES: Record<string, unknown> = {
  // ... 现有路由
  '/api/my/new/endpoint': myNewData,
};
```

### 动态路径匹配

对于带参数的路径（如 `/api/frontend/reports/:id`），在 `matchMockPath()` 函数中添加匹配逻辑：

```typescript
// 动态路径匹配：/api/my/resource/:id
if (basePath.startsWith('/api/my/resource/') && basePath !== '/api/my/resource') {
  const id = basePath.split('/').pop();
  const item = (myData as Array<{ id: string }>).find((r) => r.id === id);
  return item ?? { error: 'Not found' };
}
```

---

## 架构说明

### 拦截点

Mock 拦截器在 5 个 API 层注入：

```
┌─────────────────────────────────────────────────────────┐
│                      页面 / 组件                          │
│   useSWR / chaotang.* / shangshufangLoop.* / reportsApi  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Mock 拦截器                             │
│   interceptMock<T>(path, method)                         │
│   ┌─────────────┐                                        │
│   │ NEXT_PUBLIC  │  → 返回 mock 数据                      │
│   │ _MOCK === 1  │                                        │
│   └─────────────┘                                        │
│   ┌─────────────┐                                        │
│   │ NEXT_PUBLIC  │  → 继续请求真实后端                     │
│   │ _MOCK !== 1  │                                        │
│   └─────────────┘                                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    API 客户端层                            │
│  gateway.ts · index.ts · chaotang.ts                     │
│  shangshufang-loop.ts · reports.ts                       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js BFF / 后端                      │
│              /api/* → jiqun_ai_fresh :8081               │
└─────────────────────────────────────────────────────────┘
```

### 请求流程

```
页面发起 API 请求
  ↓
interceptor.ts 检查 NEXT_PUBLIC_MOCK
  ├─ MOCK=1 → 匹配 MOCK_ROUTES → 返回 JSON 数据
  └─ MOCK=0 → fetch() → Next.js BFF → 后端 API
```

---

## 常见问题

### Q: 启动后页面空白？

检查 `.env.local` 中是否设置了 `NEXT_PUBLIC_MOCK=1`。Next.js 需要重启才能读取新的环境变量。

### Q: 某个页面报错 "Cannot read properties of undefined"？

可能是某个 API 端点没有 mock 数据。检查浏览器控制台的 `[MOCK]` 日志，找到缺失的端点并在 `interceptor.ts` 中添加。

### Q: 如何查看哪些请求走了 mock？

启用 mock 模式后，浏览器控制台会打印所有被拦截的请求：

```
[MOCK] GET /api/chaotang/study/briefing
[MOCK] GET /api/frontend/intel/board?limit=50
```

### Q: 如何部分页面用 mock，部分用真实后端？

当前设计是全局开关。如需细粒度控制，可以修改 `interceptor.ts` 中的 `isMockMode()` 函数，按路径判断。

### Q: mock 数据会影响生产构建吗？

不会。`.env.local` 已在 `.gitignore` 中，默认不提交。生产构建时不设置 `NEXT_PUBLIC_MOCK=1` 即可。

---

## 文件结构

```
chaotang-frontend/
├── .env.local                    # 本地环境配置（已 gitignore）
├── .env.mock.example             # Mock 配置示例
├── src/lib/api/
│   ├── gateway.ts                # API 网关（已集成 mock 拦截）
│   ├── index.ts                  # SWR fetcher（已集成 mock 拦截）
│   ├── clients/
│   │   ├── chaotang.ts           # 朝堂 API（已集成 mock 拦截）
│   │   ├── shangshufang-loop.ts  # 上书房回路（已集成 mock 拦截）
│   │   └── reports.ts            # 报告 API（已集成 mock 拦截）
│   └── mock/
│       ├── interceptor.ts        # Mock 拦截器（核心）
│       └── data/                 # 20 个 JSON mock 数据文件
│           ├── study-briefing.json
│           ├── intel-board.json
│           ├── ...
│           └── power-status.json
└── docs/
    └── MOCK-MODE.md              # 本文档
```
