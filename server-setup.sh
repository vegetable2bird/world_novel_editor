#!/usr/bin/env bash
# 万象 v2 · 服务器首次预置（在 154.8.220.104 上以 root 执行一次）
#
# 重要：本脚本【不再】安装 PostgreSQL / npm / pm2，也不在服务器上构建。
# 构建与产物分发由 GitHub Actions 完成（见 .github/workflows/deploy.yml）：
#   CI 在 Linux 构建 -> SCP 到 /opt/wanxiang-v2-staging -> SSH 切到 /opt/wanxiang-v2
#   -> prisma db push -> systemd 重启。
# 本脚本只做服务器侧「一次性地基」：建目录、写 systemd 单元、启用。
#
# 前置（需你先完成）：
#   1) 在腾讯云开「TencentDB for PostgreSQL」(ap-beijing)，拿到内网连接串。
#   2) 服务器防火墙放行 22(SSH) 与 80(HTTP)；并设置好 CI 的 SSH 公钥到 ~/.ssh/authorized_keys。
#   3) 在 GitHub Repo Secrets 配置：DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_KEY /
#      DEPLOY_PORT / DATABASE_URL / JWT_SECRET。
set -euo pipefail

APP_DIR="/opt/wanxiang-v2"

echo "== 建目录 =="
mkdir -p "$APP_DIR"

echo "== 写 systemd 单元 =="
cat > /etc/systemd/system/wanxiang-v2.service <<'UNIT'
[Unit]
Description=Wanxiang v2 Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/wanxiang-v2
ExecStart=/usr/bin/env node /opt/wanxiang-v2/apps/server/dist/main.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable wanxiang-v2

echo "完成 ✅  服务器地基就绪。之后每次 push main 即由 GitHub Actions 自动部署。"
echo "手动触发：仓库 Actions 页 -> Deploy to Tencent Cloud Lighthouse -> Run workflow。"
