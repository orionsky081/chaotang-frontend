#!/usr/bin/env bash
# 朝堂御史台：只读巡查 Web 可用性与前后端架构边界。
# 默认跑确定性架构门；CENSOR_RUN_GATES=1 时再跑 tsc + 全部前端 nodetest。

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 2

HEARTBEAT_PATH="${CHAOTANG_CENSOR_HEARTBEAT:-/tmp/chaotang-censor-heartbeat}"
RED=0
YELLOW=0
declare -a FINDINGS=()

red() {
  RED=$((RED + 1))
  FINDINGS+=("$1")
  printf '🔴 %s\n' "$1"
}

yellow() {
  YELLOW=$((YELLOW + 1))
  printf '🟡 %s\n' "$1"
}

green() { printf '🟢 %s\n' "$1"; }
section() { printf '\n── %s ──\n' "$1"; }

port_up() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -tln 2>/dev/null | grep -q ":$1[[:space:]]"
  else
    return 1
  fi
}

http_code() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 4 --noproxy 127.0.0.1,localhost "$1" 2>/dev/null || printf '000'
}

printf '════════════════════════════════════════════\n'
printf '  朝堂御史朝报 · %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
printf '════════════════════════════════════════════\n'

section "服务健康"
if port_up 8081; then
  backend_code="$(http_code 'http://127.0.0.1:8081/api/health')"
  if [[ "$backend_code" =~ ^(200|401|403|404)$ ]]; then
    green "FastAPI :8081 可达（HTTP $backend_code）"
  else
    red "FastAPI :8081 监听中但 HTTP 异常（$backend_code）"
  fi
else
  red "FastAPI :8081 未监听"
fi

if port_up 3002; then green "Next dev :3002 在岗"; else yellow "Next dev :3002 未启动"; fi
if port_up 3050; then
  web_code="$(http_code 'http://127.0.0.1:3050/chaotang')"
  [[ "$web_code" =~ ^(200|301|302|307|308|401)$ ]] \
    && green "Next prod :3050 可达（HTTP $web_code）" \
    || red "Next prod :3050 监听中但 HTTP 异常（$web_code）"
elif [ "${CENSOR_PROD_EXPECTED:-0}" = "1" ]; then
  red "Next prod :3050 未监听"
else
  yellow "Next prod :3050 未启动"
fi

section "发布态"
branch="$(git branch --show-current 2>/dev/null || printf '?')"
dirty="$(git status --porcelain 2>/dev/null | grep -vcE 'dock-snapshot|\.playwright-mcp|\.next-buildcheck|settings\.local' || true)"
green "分支 $branch"
[ "${dirty:-0}" = "0" ] && green "工作树干净" || yellow "工作树有 $dirty 处未提交改动"

section "架构边界"
if pnpm test:guards; then
  green "零 DB、JSON REST/BFF、后端业务边界与 harness 自省全绿"
else
  red "架构守门失败"
fi

if [ "${CENSOR_RUN_GATES:-0}" = "1" ]; then
  section "前端回归"
  if pnpm exec tsc --noEmit; then green "tsc 全绿"; else red "tsc 失败"; fi
  if pnpm test:node; then green "frontend nodetest 全绿"; else red "frontend nodetest 失败"; fi
fi

date +%s > "$HEARTBEAT_PATH" 2>/dev/null || true

section "御史裁断"
if [ "$RED" -gt 0 ]; then
  printf '🔴 今日有恙：%s 红 / %s 黄\n' "$RED" "$YELLOW"
  printf '  • %s\n' "${FINDINGS[@]}"
  exit 1
fi
if [ "$YELLOW" -gt 0 ]; then
  printf '🟡 今日小恙：%s 黄（无红）\n' "$YELLOW"
  exit 0
fi
printf '🟢 今日无恙\n'
