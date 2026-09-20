import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // 幂等建表引导：部署时现有 SQLite 库不会自动迁移（CI 仅在 runner 生成空 seed 库，
    // 服务器仅在首次部署拷贝 seed）。这里在每次启动时补齐可能缺失的表/索引，零数据风险。
    await this.ensureSchema();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureSchema() {
    const ddl = `
      CREATE TABLE IF NOT EXISTS "WorldTemplate" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "coverColor" TEXT,
        "visibility" TEXT NOT NULL DEFAULT 'private',
        "category" TEXT,
        "content" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "WorldTemplate_userId_idx" ON "WorldTemplate"("userId");
      CREATE INDEX IF NOT EXISTS "WorldTemplate_visibility_idx" ON "WorldTemplate"("visibility");
    `;
    try {
      await this.$executeRawUnsafe(ddl);
    } catch (e) {
      // 建表失败不应阻断启动，记录后继续（表可能已存在由 prisma 管理）
      console.error('[ensureSchema] WorldTemplate bootstrap failed:', (e as Error)?.message);
    }
  }
}
