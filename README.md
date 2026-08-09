# 朝堂OS

朝堂OS 是项目主线名称。`chaotang-web-lyt` 是朝堂OS 的前端体验主仓：帮助真实用户用 AI agent 解决实际问题，而不是做一个古风控制台模拟器。

当前只有一个项目整体：**朝堂OS**。前端体验线和后端蜂群线只是同一个项目里的两条工程责任线，不是两个产品，更不是分裂路线。

- 前端体验线：`chaotang-web-lyt`，承载页面、体验、Next.js BFF、浏览器验证和发布门禁。
- 后端蜂群线：`jiqun_ai_fresh`，承载真实蜂群、agent flow、prompt、provider、数据库和重产线执行。

`CourtOS` 永远不作为第三条产品线 / 项目线 / 仓库主线，也不是另一个前端产品名。它已经被吸收为朝堂OS 这个整体项目里的内部决策内核 / 协议名，主要对应 loop、harness、sourceLabel、risk gate、archive learning、`src/core/courtos/**` 和 `/api/court/**`。

```text
用户真实问题
  -> 先知：判断现在最该问什么、做什么、为什么
  -> 导师：拆成行动路径、预算、风险、验收
  -> 三省六部：治理、会审、裁断、归档
  -> 客户自配蜂群：按行业场景执行
  -> 史馆：沉淀证据、复盘、下一次建议
```

当前第一样板是铭硕电池业务，但产品主语不是“铭硕定制系统”。铭硕是 reference implementation，用来证明这套治理框架可以服务真实行业问题。

## 北极星

唯一目标：

```text
让 1 个真实老板，用朝堂真做成 1 件经营决策，并愿意说“这帮我了”。
```

## 当前 V1 产品切口

朝堂OS 当前不以“通用 AI 经营内阁”作为首发商品。V1 唯一切口是：

> 面向 20–300 人新能源设备项目制企业的正式报价准入回奏台；在报价发给客户前，把成本、毛利、BOM、交付、账期与合同责任汇成一页可审计的准奏、补证、驳回或业务例外建议，交由老板最终拍板。

V1 行业范围是新能源设备销售与项目交付；储能设备 / 电池 PACK 只作为候选获客标签，不是永久产品边界。当前只可验证和销售由运营官陪跑的报价准入服务，不宣称客户可自助运行、自动报价、自动外发或生产审批系统。详见：

- `dev/notes/朝堂-产品定义-一页PRD.md`
- `dev/notes/朝堂OS-V1-报价准入试点章程-2026-07-30.md`

当前优先闭环是：

```text
上书房看到真实经营信号
  -> 一键下旨到军机处
  -> 按运行 truth label 调用已放行的部门能力；FALLBACK 不冒充真模型参审
  -> 汇总成一份可读、可裁、可归档的真奏折
  -> 老板采纳 / 打回 / 追问
  -> 史馆留证据链，次日上书房可引用
```

详见：

- `docs/PRODUCT_POSITIONING_ORACLE_MENTOR.md`
- `docs/NORTHSTAR_REAL_LOOP_V1_PRD.md`
- `docs/FINAL_PRODUCT_RESOURCE_HARNESS.md`
- `docs/SELF_EVOLVING_COURT_SYSTEM.md`
- `docs/CODEX_COMMAND_LIBRARY.md`

## 能力边界

不要把演示能力伪装成真实能力。

| 档位 | 含义 | 当前状态 |
|---|---|---|
| LIVE | 真模型 / 真编排 / 真记录 | `/api/chat`、`/api/court/orchestrate*` 已具备核心能力 |
| MIXED | 有真实源，但存在 fallback | 部分 Turso / jiqun BFF 路径 |
| DEMO | 样板数据或静态 mock | 部分部门页、庄园、情报、档案展示 |

顶部导航的“真伪”入口会显示这条边界，演示时优先跑 LIVE 链路。

## 技术栈

- Next.js 16 App Router
- React 19
- Tailwind 4
- TypeScript 5
- Playwright E2E
- Turso / jiqun 后端 / OpenAI-compatible LLM provider

## 端口纪律

| 用途 | 端口 | 命令 |
|---|---:|---|
| Dev HMR | 3002 | `pnpm dev` |
| Production | 3050 | `pnpm start` |
| 禁用 | 3001 | 不要绑定 |

公网 nginx upstream 指向 3050。不要用 dev 进程占 3050，也不要改回 3001。

## 本地运行

```bash
pnpm install
pnpm dev
```

访问：

```text
http://localhost:3002/court-briefing
```

生产构建：

```bash
pnpm build
pnpm start
```

## 环境变量

常用：

```bash
JIQUN_API_URL=http://127.0.0.1:8081
BASE_PATH=/chaotang
```

浏览器只请求同源 `/api/*`，Next.js BFF 仅用 `JIQUN_API_URL` 经 JSON REST 访问
FastAPI。模型/provider 密钥、业务开关与持久化配置全部放在 `backend/`。

## 中文字体

朝堂是中文优先界面。生产环境不能依赖宿主机刚好有中文字体。

已做两层兜底：

- `Dockerfile` runtime 安装 `font-noto-cjk`
- `src/app/globals.css` 支持 `public/fonts/Noto*SC*.woff2` 自托管入口

推荐把精简后的 Noto Sans SC / Noto Serif SC woff2 文件放入 `public/fonts/`，文件名见 `public/fonts/README.md`。

## 验证

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test:e2e
```

视觉类变更需要用 Playwright 截图看核心路由：

- `/court-briefing`
- `/command-center`
- `/overview`
- `/archive`

## 当前最高优先级

1. 按 `docs/FINAL_PRODUCT_RESOURCE_HARNESS.md` 收束资源：PROD / FIX / DEMO / STOP。
2. 跑通 `/api/court/true-chain-health`，确认主 DB、内部 CourtOS 协议层、蜂群 run、LLM、队列哪些是真可用。
3. 先补最终产品第一链路依赖：主 DB、内部 CourtOS health/invoke、至少一个真实 agent run、史馆归档。
4. 把真模型、真数据、fallback、mock 的边界显式化，不能把 DEMO 包装成 LIVE。
5. 按 `docs/SELF_EVOLVING_COURT_SYSTEM.md` 建立自进化研发闭环：协作案归档、相似案召回、严口径验收、下一次 playbook。
