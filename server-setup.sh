#!/usr/bin/env bash
# 万象 v2 · 服务器一次性初始化（在 154.8.220.104 上以 root 执行）
# 作用：装 PostgreSQL + pm2 -> 拉代码 -> 写 .env(随机密钥) -> 迁移建表 -> 构建 -> pm2 启动。
# 幂等：可重复执行；已存在 .env 时保留密钥并只做增量部署。
# 注意：本脚本在 :8787 启动新应用，不动 :80 上的旧服务（切换端口另行确认）。
set -euo pipefail

APP_DIR="/opt/wanxiang-v2"
REPO="https://github.com/vegetable2bird/world_novel_editor.git"
DB_USER="wanxiang"
DB_NAME="wanxiang"
NEW_PORT="8787"

echo "== [1/7] PostgreSQL =="
if ! command -v psql >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql

echo "== [2/7] 拉取代码 =="
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
else
  git clone "$REPO" "$APP_DIR"
fi

echo "== [3/7] 数据库与 .env =="
if [ -f "$APP_DIR/.env" ]; then
  echo "已存在 .env，保留现有密钥与连接串（跳过建库）。"
else
  DB_PASS="$(openssl rand -hex 16)"
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB;"
  else
    sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  fi
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_EXPIRES_IN="7d"
PORT="${NEW_PORT}"
NODE_ENV="production"
VITE_API_BASE="/api"
EOF
  chmod 600 "$APP_DIR/.env"
  echo ".env 已生成（随机 JWT_SECRET 与数据库口令）。"
fi

echo "== [4/7] pm2 =="
command -v pm2 >/dev/null 2>&1 || npm i -g pm2

cd "$APP_DIR"
echo "== [5/7] 依赖 / Prisma 生成 / 建表 / 构建 =="
npm install
npm run prisma:generate
npm run db:push
npm run build

echo "== [6/7] 启动（cwd=仓库根，端口 ${NEW_PORT}）=="
pm2 delete wanxiang-server >/dev/null 2>&1 || true
pm2 start "node apps/server/dist/main.js" --name wanxiang-server --cwd "$APP_DIR"
pm2 save

echo "== [7/7] 自检 =="
sleep 2
curl -sS --max-time 5 "http://127.0.0.1:${NEW_PORT}/api/health" || echo "(健康检查尚未就绪，请稍后重试)"
echo
echo "完成 ✅  后端 + 前端同端口托管：http://<server-ip>:${NEW_PORT}/"
