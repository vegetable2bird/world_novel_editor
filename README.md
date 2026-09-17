# 万象 v2 · 世界小说编辑器

全栈 TypeScript 小说编辑器（世界观操作系统型）。以 `v2_prototype_万象.html` 为产品蓝本，重架构实现。

## 技术栈
- 前端：`apps/web` — Vite + React 18 + TypeScript + Tailwind（墨金主题 + 多主题）+ Zustand + React Router + React Query + React Flow
- 后端：`apps/server` — NestJS + Prisma + PostgreSQL + JWT（完整多租户）
- 共享：`packages/shared` — Zod schema（前后端共用类型）
- 部署：腾讯云轻量 154.8.220.104（PostgreSQL + NestJS + 前端静态），GitHub Actions 自动部署

## 目录
```
wanxiang-v2/
├── apps/web/      # 前端
├── apps/server/   # 后端（NestJS）
├── packages/shared/ # 共享 Zod schema
├── prisma/        # Prisma schema + 迁移
├── docker-compose.yml  # 本地 PG
├── server-setup.sh     # 服务器一键初始化
└── .github/workflows/deploy.yml  # 自动部署
```

## 本地开发（可选，本机也可跑；用户选择把环境放服务器）
```bash
docker compose up -d          # 起 PostgreSQL
cp .env.example .env
npm install
npm run migrate
npm run dev:server            # :8787
npm run dev:web               # :5173
```

## 服务器部署（环境在云上，本机只 push）
1. 在服务器跑一次 `bash server-setup.sh`（装 PG + Node + 依赖 + 迁移 + 构建 + 启动）。
2. GitHub 仓库 Settings → Secrets 加：`DEPLOY_HOST`(154.8.220.104)、`DEPLOY_USER`、`DEPLOY_SSH_KEY`(私钥)、`DEPLOY_PORT`(22)。
3. 之后 `git push` 到 main，GitHub Actions 自动拉取/迁移/构建/重启。

## 数据模型
见 `prisma/schema.prisma`：User / World / Book / Chapter(+Version) / WorldEntity / EntityRelation /
Variable / Foreshadow / TimelineEvent / Character(万界) / CharacterInstance(本作原生) /
ActivityTrail / ConsoleOperation，全部带 `userId` 多租户隔离。

## 产品约束
- 界面文案禁「库 / 数据 / 数据库」等词，统称「万界」；「信息 / 导出全部 / 存储」。
- 双线世界：设定态（本界正典）/ 运行态（本书副本，不回写）。
