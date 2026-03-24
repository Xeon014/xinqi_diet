#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/2] 运行后端测试"
(
  cd "$REPO_ROOT/backend"
  mvn -q test
)

echo "[2/2] 运行小程序文件校验"
(
  cd "$REPO_ROOT/miniprogram"
  node scripts/verify-miniprogram-files.js
)

echo "项目校验通过"
