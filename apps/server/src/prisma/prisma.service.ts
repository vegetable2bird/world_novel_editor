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
    // 注意：Prisma 的 $executeRawUnsafe 一次只可靠执行一条语句，
    // 故逐条执行（多语句会被静默吞掉，只留下一条 warn 日志）。
    const ddls = [
      `CREATE TABLE IF NOT EXISTS "WorldTemplate" (
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
      )`,
      `CREATE INDEX IF NOT EXISTS "WorldTemplate_userId_idx" ON "WorldTemplate"("userId")`,
      `CREATE INDEX IF NOT EXISTS "WorldTemplate_visibility_idx" ON "WorldTemplate"("visibility")`,
      // 分卷（书 → 卷 → 章）。老库缺此表，必须启动时补齐，否则卷相关查询整体 500。
      `CREATE TABLE IF NOT EXISTS "Volume" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "bookId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Volume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Volume_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "Volume_userId_idx" ON "Volume"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Volume_bookId_idx" ON "Volume"("bookId")`,
    ];
    for (const ddl of ddls) {
      try {
        await this.$executeRawUnsafe(ddl);
      } catch (e) {
        // 建表失败不应阻断启动，记录后继续（表可能已存在由 prisma 管理）
        console.error('[ensureSchema] DDL failed:', (e as Error)?.message);
      }
    }

    // 补列：Chapter.volumeId（SQLite 不支持 ADD COLUMN IF NOT EXISTS，先查 PRAGMA）
    try {
      const cols = await this.$queryRawUnsafe<{ name: string }[]>(
        `PRAGMA table_info("Chapter")`,
      );
      if (Array.isArray(cols) && cols.length > 0 && !cols.some((c) => c.name === 'volumeId')) {
        await this.$executeRawUnsafe(`ALTER TABLE "Chapter" ADD COLUMN "volumeId" TEXT`);
        await this.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "Chapter_volumeId_idx" ON "Chapter"("volumeId")`,
        );
        console.log('[ensureSchema] Chapter.volumeId 已补齐');
      }
    } catch (e) {
      console.error('[ensureSchema] Chapter.volumeId 补列失败:', (e as Error)?.message);
    }
  }
}
