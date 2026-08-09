#!/usr/bin/env bash
# 防复发·阶段5(2026-07-03 落地)：把 scripts/git-hooks/* 装进 git hooks 目录。
# hooks 目录不入库，装一次就地生效；由 package.json "prepare" 在 pnpm install 时自动跑，
# 也可手动 `bash scripts/install-git-hooks.sh` 重装。不改 git config(不设 core.hooksPath)。
# monorepo(2026-07-10)：.git 在仓库根、本脚本在 frontend/scripts/ —— 路径从脚本自身位置推导，
# hooks 目录用 `git rev-parse --git-path hooks` 定位（普通仓/worktree 都对），不再假设 toplevel==前端根。
set -euo pipefail
cd "$(dirname "$0")/.."

# 非 git 仓库(如打包环境提取源码后跑 pnpm install)静默跳过，不阻断安装。
if ! hooks_dir="$(git rev-parse --git-path hooks 2>/dev/null)"; then
  echo "[install-git-hooks] 非 git 工作区，跳过。"
  exit 0
fi

mkdir -p "$hooks_dir"
for hook in scripts/git-hooks/*; do
  name="$(basename "$hook")"
  cp "$hook" "$hooks_dir/$name"
  chmod +x "$hooks_dir/$name"
done
echo "[install-git-hooks] 已装: $(ls scripts/git-hooks | tr '\n' ' ')→ $hooks_dir"
