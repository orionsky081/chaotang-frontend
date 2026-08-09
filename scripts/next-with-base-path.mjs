#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

process.env.BASE_PATH ||= '/chaotang';
process.env.NEXT_PUBLIC_BASE_PATH ||= process.env.BASE_PATH;

// dev/prod .next 目录隔离(2026-07-04·根治"pnpm dev 弄坏正在跑的 prod" 这个已实测发生过一次的
// 8小时故障根因)：dev(3002)与 prod(3050·systemd courtos-web.service)此前共享同一默认 `.next`，
// dev 的增量编译会覆盖/使 prod 依赖的构建产物失效。next.config.ts 早有 NEXT_DIST_DIR 隔离开关，
// 但 `pnpm dev` 从未实际设置它，隔离形同虚设。这里给 `dev` 子命令一个默认隔离目录(可被显式
// NEXT_DIST_DIR 覆盖)，`build`/`start` 不受影响(默认仍是 prod 期望的 `.next`)。
if (process.argv[2] === 'dev') {
  process.env.NEXT_DIST_DIR ||= '.next-dev';
}

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
