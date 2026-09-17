#!/usr/bin/env bash
# 万象 v2 · 服务器一次性初始化脚本（在 154.8.220.104 上以有 sudo 的用户执行）
# 用途：安装 PostgreSQL + Node，准备目录，安装依赖，迁移数据库，构建并后台启动。
set -euo pipefail

APP_DIR="/opt/wanxiang-v2"
REPO="https://github.com/vegetable2bird/world_novel_editor.git"
DB_USER="wanxiang"
DB_PASS="wanxiang"
DB_NAME="wanxiang"

echo "== [1/6] 安装 PostgreSQL =="
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable --now postgresql
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB;"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "PostgreSQL 已存在，跳过。"
fi

echo "== [2/6] 安装 Node.js 20 =="
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm i -g pm2 || true

echo "== [3/6] 拉取代码 =="
if [ -d "$APP_DIR" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  sudo mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi

echo "== [4/6] 安装依赖 =="
cd "$APP_DIR"
npm install

echo "== [5/6] 数据库迁移 =="
cp .env.example .env || true
npm run migrate

echo "== [6/6] 构建并启动 =="
npm run build
pm2 delete wanxiang-server 2>/dev/null || true
pm2 start "npm run start:prod -w apps/server" --name wanxiang-server
pm2 save

echo "完成。前端构建在 apps/web/dist，可由 nginx 托管；后端监听 \${PORT}（默认 8787）。"
echo "如需 nginx 反代 /api 到后端、/ 指向前端 dist，请参考 README。"
