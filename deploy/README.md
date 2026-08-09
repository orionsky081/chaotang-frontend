# frontend/deploy — Web 层部署模板

本目录只负责朝堂OS Next.js Web 层。后端服务、模型网关、业务密钥与持久化配置统一由
`backend/` 的部署体系管理，不在前端复制第二套模板。

## 文件

- `env.example`：Next.js 公共路径、运行模式与唯一后端 REST 地址。
- `nginx-app.conf.template`：公网入口；所有 `/api/*` 请求先到 Next.js BFF。
- `services/courtos-web.service.template`：固定在 3050 端口启动生产 Web。

## 安装

```bash
cd /opt/chaotang-os/frontend
cp deploy/env.example .env.local
cp deploy/services/courtos-web.service.template ~/.config/systemd/user/courtos-web.service
systemctl --user daemon-reload
systemctl --user enable --now courtos-web
```

若 checkout 不在 `/opt/chaotang-os`，先修改 service 模板中的 `WorkingDirectory`、
`EnvironmentFile` 和日志路径。浏览器只访问同源 `/api/*`；BFF 再用 `JIQUN_API_URL`
经 JSON REST 访问 FastAPI。
