# 蜂群单 Agent 范式 · 当前边界

本文件只记录跨端职责，不再维护前端自带业务引擎或模型裁判的旧方案。

- 浏览器只访问同源 `/api/**` JSON REST。
- Next.js BFF 只转发、透传认证并拒绝非 JSON 响应。
- Agent 编排、数据检索、确定性计算、模型调用、评测与持久化全部在 `backend/`。
- 前端 `tests/swarm-eval/` 仅做 REST 黑盒采样和结果展示，不持有模型或数据库配置。
- 部门能力契约以 `frontend/src/lib/contracts/` 为跨端 SSOT；业务实现以 FastAPI 后端为准。

后端评测入口：

```bash
cd backend
python3 scripts/eval_ci.py --dry-run
python3 scripts/score_swarm.py --help
```

前端集成采样入口：

```bash
cd frontend/tests/swarm-eval
node brain-check.mjs
node run-eval.mjs --dry-run
```
