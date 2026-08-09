# 蜂群 REST 集成采样

本目录只保留前端侧的黑盒集成采样与结果展示：脚本向同源 `/api/**` 发 JSON REST 请求，
不连接数据库、不读取模型密钥、不直连模型供应商，也不实现业务判断。

职责分界：

- `brain-check.mjs`：检查通过 BFF 暴露的后端能力是否可用。
- `run-eval.mjs` / `run-eval-chaotang.mjs`：经 REST 发题并保存原始响应。
- `load-probe.mjs`：经 REST 做接口负载采样。
- `scorecard.mjs`：展示已有评分结果，不调用模型。
- `battery.json` / `agents/` / `data/`：测试输入与期望，不是线上业务数据源。

模型裁判、质量基线、真实数据与持久化统一归后端：

```bash
cd backend
python3 scripts/eval_ci.py --dry-run
python3 scripts/score_swarm.py --help
```

前端采样示例：

```bash
cd frontend/tests/swarm-eval
node brain-check.mjs
node run-eval.mjs --dry-run
node scorecard.mjs --dry-run
```

任何新增脚本若需要数据库句柄、供应商 URL 或模型密钥，应放入 `backend/`，不能加回本目录。
