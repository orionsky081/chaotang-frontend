# 前端纯 REST / 后端业务唯一承载设计

**日期：** 2026-07-19  
**状态：** 已获用户批准（“修复吧”）  
**范围：** `frontend/**` 与其调用的 `backend/**` REST 承接层

## 目标

朝堂OS 前端只负责页面、交互状态、契约校验与 BFF 路径适配；后端是业务规则、持久化、模型调用、工具执行和异步任务状态的唯一承载。前后端运行时通信只使用普通 HTTP JSON REST：不使用 WebSocket、Socket.IO、SSE、共享文件、数据库直连或浏览器业务持久化。

## 已确认的现状缺口

1. 活动前端代码已经没有 SQL、数据库驱动、数据库文件或 IndexedDB，但仍有 JSON/JSONL、`localStorage` 业务记录和挂在 Web 容器上的数据库卷。
2. 前端仍含 Socket.IO 与 SSE；部分 BFF 直连 LLM、legal-agent 和旧 CourtOS 上游。
3. 前端仍运行 CourtOS 决策、治理、编排和预算逻辑；若后端不可达，若干路由会回退到本地业务实现。

## 边界定义

### 前端允许

- React/Next 页面渲染、表单状态、动画和可访问性行为。
- 对后端返回值做 Zod/TypeScript 契约校验和展示字段格式化。
- BFF 转发身份、HTTP method、query/body，并将后端错误映射为稳定的前端 envelope。
- 只影响单一浏览器体验的非业务偏好，例如 onboarding 是否看过、折叠状态和临时输入草稿；不得成为共享业务事实源。
- 同源普通 HTTP JSON 请求；长任务采用 `POST → taskId`，再用 `GET status` 轮询。

### 前端禁止

- 任意数据库包、SQL、数据库文件、IndexedDB/WebSQL/OPFS。
- 用 JSON、JSONL、CSV、`localStorage`、`sessionStorage` 或内存 Map 充当业务事实源。
- WebSocket、Socket.IO、SSE、GraphQL subscription、gRPC streaming 等旁路协议。
- 直连 LLM、legal-agent、旧 CourtOS、第三方业务 API或执行本机命令。
- 决策分类、风控门、审批状态机、预算门、审计链、蜂群编排等业务裁决。
- 后端失败时回退到本地 mock/store/business engine；必须诚实返回 502/503 或空态。

### 后端负责

- SQLAlchemy/Alembic 数据模型、租户/用户隔离和全部业务持久化。
- LLM/provider、legal-agent、外部数据源和本机工具的调用。
- 所有业务状态机、决策规则、预算/限流、审计事件和任务编排。
- 同步 REST 结果，以及异步任务的创建、状态查询和最终结果查询。

## 数据设计

剩余低吞吐、JSON 形状差异大的前端记录统一迁到后端两张承重表，避免为每个小型 slice 继续维护文件存储：

- `business_records`：`tenant_id + namespace + record_id` 复合主键，保存 `user_id`、`payload_json`、`revision`、`created_at`、`updated_at`。
- `business_events`：追加式事件，保存 `aggregate_id`、`event_id`、`event_type`、`payload_json`、`prev_hash`、`event_hash`、`created_at`；治理/审计类写入由后端生成哈希链。

域路由仍使用明确资源名（如 `/api/build-ledger`、`/api/hanlin`、`/api/governance`），只有后端 store 复用通用表。客户端不能提交任意 namespace，也不能决定租户或用户归属。

## 通信设计

```text
Browser
  └─ same-origin JSON REST
      └─ Next BFF（薄适配，无业务）
          └─ backendFetch
              └─ FastAPI :8081
                  ├─ domain service
                  ├─ provider / legal / external adapters
                  └─ SQLAlchemy DB
```

- 所有前端服务端出站只能通过 `backendFetch` 指向 `SWARM_BACKEND`。
- 聊天由后端同步返回完整回答；若任务耗时较长，返回 202 + taskId。
- 蜂群进度、通知和任务事件统一使用 REST 轮询；客户端按页面可见性退避，并在终态停止。
- BFF 不自行生成 heartbeat、fallback 事件或模拟成功。

## 迁移策略

1. 先新增会失败的架构边界守门，覆盖文件型存储、浏览器业务存储、非 REST 通道、直连旁路和客户端业务引擎。
2. 建后端通用记录/事件表、迁移、store 和租户隔离测试。
3. 按域迁移文件/localStorage 事实源：build-ledger、petitions、hanlin、governance/lessons、judgments/audit/libu。
4. 删除 Socket.IO/SSE，改为 REST 轮询或同步 JSON。
5. 将前端直连 provider/legacy/legal 与 CourtOS 运行时调用切到后端；无承接点的实验功能 fail-closed，不保留本地业务 fallback。
6. 清理 Web 容器数据库卷和 LLM 配置，把持久卷与 provider 配置归到 backend 服务。
7. 最终运行两侧测试、构建、迁移链、门禁和反向关键词/导入审计。

## 错误与兼容策略

- 后端不可达：BFF 返回 503，包含稳定错误码；不得读本地旧数据冒充成功。
- 后端 4xx/5xx：保留状态语义并清洗错误内容，不吞错改成 200。
- 长任务轮询：404 立即终止；429/5xx 指数退避；成功终态停止；页面隐藏时降低频率。
- 旧本地文件不自动导入：它们无可靠租户身份。若发现需要保留的生产数据，另做显式、可审计的后端导入脚本。

## 验收标准

1. `frontend/package.json` 与 lockfile 无数据库、Socket.IO、SSE 客户端依赖。
2. 活动 `frontend/src/**` 无数据库 API、业务文件写入、业务 `localStorage`、WebSocket/EventSource/SSE。
3. 前端服务端无 LLM/legal/legacy 直连；唯一业务出站入口是 `backendFetch`。
4. 客户端不再调用 CourtOS 决策/编排运行时；BFF 不执行域状态机。
5. 所有迁移域由后端 REST 测试证明租户隔离、写读闭环和失败语义。
6. `pnpm exec tsc --noEmit`、`pnpm build`、前端 guards、后端目标 pytest、`validate_flows.py --skip-quality` 与 `gate_selfcheck.py` 均以新鲜输出通过。

