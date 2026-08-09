# CourtOS V2 丞相流程 · 落地清单(按 P0–P4)

> 源:`/Users/kv/Desktop/tt/CourtOS-chancellor-flow-wireframes-v2.md` vs 现有代码比对(2026-07-15)。
> 勾选项 = 文档要求 vs 代码实况。`[x]` 已具备,`[~]` 部分/命名不同,`[ ]` 未做。

## P0 · 丞相调度层(核心,最大缺口)

- [~] `routeDepartments()` 确定性关键词路由已存在(`src/lib/swarm/router.ts`)
- [~] 高风险检测已存在(`detectHighRisk` · `core/courtos/harness/human-approval-gate.ts`)
- [x] **单/多部门 mode 分流**(`single_department` vs `grand_council`)—— 本刀已加 `classifyChancellorRoute`
- [ ] 独立 `POST /api/court/shangshufang/chancellor-dispatch` 端点(文档 P0 要求;本刀改为内联进 confirm-edict,未单开端点)
- [ ] `need_clarification`(0 命中 → 追问/派锦衣卫补情报)—— 本刀按用户指令走二分,0 命中仍归 grand_council;待补第三态

## P1 · 改造 confirm-edict

- [x] confirm-edict 先经丞相分流,再决定单部门直办 or 军机处会审(本刀已接)
- [x] 单部门直办跳过强制四部会审(force-multi 仅在 grand_council 触发)
- [x] 高风险单部门 → 升级军机处(本刀:isHighRisk → grand_council,修正旧"高风险单点不升级"漏洞)
- [ ] 单部门时真·直调后端单部门蜂群(当前仍走 unified loop 的本地启发式;真蜂群 dispatch 待接 live-swarm-adapter)

## P2 · 统一单案工作台 `/case/[taskId]`

- [ ] 新建 `/case/[taskId]` 一案到底页(上书房输入→丞相路由→锦衣卫→户部→军机处→裁决→史馆)
- [~] 现状分散在 `governance/[caseId]`、`finance-intel-loop/[taskId]`、`throne/brief/[taskId]`、`scribe/[taskId]`,未统一

## P3 · 其它页面降级为只读投影

- [~] 锦衣卫 `/intel`:主页派发按钮是 UI 空壳(无 fetch),真派发在 `intel/[signalId]`;需明确降级或去掉假按钮
- [~] 户部 `/departments/finance`:仍有真动作(`onRun` POST `/actions`)。**冻结待 P2**——上书房无替代 endpoint,现在改只读会净删「写台账/移交」能力
- [~] 军机处 `/command-center`:**冻结待 P2**(2026-07-15 铁律4 会审后回滚)。曾把 4 个入口改回上书房跳转,但会审查出 `/court-briefing` 根本不消费 `?command=`/`?taskId=` → 下旨文字被静默丢弃、还删了原本能工作的发圣旨。与户部同因:上书房接不住 handoff。**整体 blocked on P2**
- [x] 史馆 `/archive`+`/shiguan`:基本只读(无准奏/驳回按钮)

> **P3 结论(铁律4 沉淀):P3 整体 blocked on P2。** 户部/军机处降级只读的前提是上书房能消费 `?command=`/`?taskId=` handoff——现在不能。先做 P2(上书房 handoff 消费)再降级,否则删的是能工作的能力、换的是假转发。

## P4 · 统一事件与状态

- [ ] 领域状态机(draft→confirmed→evidence_running→…→archived):**前端**现为 11 态通用流水线(`contracts/task.ts`),仅 draft/archived 重合
- [~] per-task 事件流:**前端** CourtOS runtime 无(swarm/三省/军机处 SSE 命名全不同);但**后端 finance-intel-loop 已有干净的生命周期事件链**(见下方蓝本)。P4 不是从零建,是**把前端接到后端这套已有脊椎上**
- [x] 丞相 mode 已随 `chancellor_route` 写进 confirm-edict 响应,可作后续事件流的路由事件源头

### P4 蓝本:后端已落地的上书房事件链(2026-07-16 实跑取证)

> 取证会话 `20260716_160135_2cc3b0`(输入=锦衣卫情报信号「MSFT 财报来源核证」)。**确定性引擎、0 次 LLM、秒级 completed**——不会幻觉,与被中断的 pack_rd(LLM 脑补硬件规格)成天壤对比。这就是"真实/不可逆的事别交给会脑补的 LLM"(铁律9)的活样板。

**6 蜂群事件驱动链(每步 emit topic 触发下一步,`triggered_by` 前一步事件):**

| 序 | swarm | 事件 topic | final_output 契约(关键字段) |
|---|---|---|---|
| 1 | `shangshufang` | `shangshufang.case.created` | `{stage:shangshufang_case, taskId, taskStatus, edictMode, visibility}` |
| 2 | `jinyiwei` | `jinyiwei.evidence.completed` | `{stage:jinyiwei_evidence, ticker, sourceUrls[], missingEvidence[], evidenceRefs[]}` —— 真 SEC EDGAR 官方来源 |
| 3 | `finance`(户部) | `finance.completed` | `{stage:hubu_memorial, memorial:{verdict, recommendation, riskLevel, summary}}` —— **不直接给投资建议**,verdict=`valuation_requires_authorized_review` |
| 4 | `shangshufang` | `shangshufang.adjudication.completed` | `{stage:shangshufang_adjudication, decision, confirmationRequired:true, allowedActions[], blockedReason}` —— **高风险人工确认门** |
| 5 | `execution` | `execution.report.completed` | `{stage:execution_report, executedActions[], sideEffects:internal_only, externalCommitments:[]}` —— **零对外承诺** |
| 6 | `shiguan`(史馆) | `shiguan.archive.completed` | `{stage:shiguan_archive, status:archived, archivePath, replayApiPath}` |

**QA 布尔门(非数值分,quality_score 诚实为 None)**:`source_urls_present / missing_evidence_clear / non_advice_disclaimer / execution_disabled / forbidden_outputs_preserved` 全 pass。

**接线待办(前端接后端脊椎)**:
- [ ] 前端订阅这 6 个 topic(replay: `GET /api/swarm/sessions/{id}`),把领域态从后端事件流投影出来,替掉前端自维护的 11 态流水线
- [ ] 事件 topic 命名对齐:文档早先提的 `emperor.decision.ready`/`archive.created` 收敛到后端真名 `shangshufang.adjudication.completed`/`shiguan.archive.completed`(SSOT 用后端的,别在前端另起一套)
- [ ] 把这条链的护栏(人工确认门 `confirmationRequired`、`externalCommitments:[]`、非建议免责)作为前端呈现的硬约束,不在前端二次判定

## 飞轮 / sourceLabel(2026-07-15 大神视角「方案A」+ 铁律4 会审沉淀)

> 飞轮=归档→召回复利,是唯一「越用越聪明」的护城河,也是唯一没监控、命门靠人肉注释守的东西。

- [x] **sourceLabel 收敛 SSOT**(`finalizeDecisionSource` · commit 2791f08):归档判 `synthetic` 不再用恒 FALLBACK 的 `draft_edict.source_label`,改用点火后 memorial 真源;≥5 处手工穿线(archive builder / summary / status route / decision route 4 处)收敛
- [x] **飞轮真命门:backend 采纳路补写召回池**(commit 61a94e3):稳态(jiqun up)采纳走 backend 路,此前只 patch jiqun JSON、**从不写 `court_archives`** → 采纳 LIVE 案永远召不回。已补 `saveShiguanArchiveRecordV1`。**这是 SSOT 之外真正让飞轮转起来的那一刀**(会审揪出,自评+纯函数心跳都漏了)
- [ ] **端到端 write→recall 集成断言(test 债)**:现只有纯函数心跳(证明 synthetic 算对),**没有**「真写 court_archives → 真召回查得回」的集成测试。需 route+db+jiqun harness。改归档/召回闭环前必补——纯函数断言证明不了闭环通(见 memory `test-pixels-not-return-values` 2026-07-15 复现)
- [ ] 召回条件收窄的两个残留:`hasIntel` shingle 假阳性、DB 宕机 `degraded` 被吞(见缺证门残留)

## 导航修正(顺手记,非文档 P 项)

- [ ] 锦衣卫 nav 错指 `/departments`,应指 `/intel`(`features/shangshufang/constants.ts`)
- [ ] 太医院 nav 同样错指 `/departments`
