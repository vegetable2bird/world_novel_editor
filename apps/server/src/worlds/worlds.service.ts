import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorldDto } from './dto/create-world.dto';
import { UpdateWorldDto } from './dto/update-world.dto';

@Injectable()
export class WorldsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.world.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { books: true, entities: true } } },
    });
  }

  async get(userId: string, id: string) {
    const w = await this.prisma.world.findFirst({ where: { id, userId } });
    if (!w) throw new NotFoundException('world not found');
    return w;
  }

  create(userId: string, dto: CreateWorldDto) {
    return this.prisma.world.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateWorldDto) {
    await this.get(userId, id);
    return this.prisma.world.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.world.delete({ where: { id } });
  }

  /**
   * Git 式克隆：以某个世界为源，复制其世界观子数据（实体 / 关系 / 时间线）
   * 派生出一个全新的、独立拥有的世界。关系按实体 id 重新映射，避免孤儿引用。
   */
  async forkWorld(userId: string, sourceId: string, newName?: string) {
    const src = await this.get(userId, sourceId);
    const world = await this.prisma.world.create({
      data: {
        userId,
        name: newName?.trim() || `${src.name}（副本）`,
        description: src.description,
        coverColor: src.coverColor,
        visibility: 'private',
      },
      select: { id: true, name: true },
    });

    const [entities, relations, timeline] = await Promise.all([
      this.prisma.worldEntity.findMany({ where: { userId, worldId: sourceId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.entityRelation.findMany({ where: { userId, worldId: sourceId } }),
      this.prisma.timelineEvent.findMany({ where: { userId, worldId: sourceId }, orderBy: { createdAt: 'asc' } }),
    ]);

    const created: { id: string }[] = [];
    for (const e of entities) {
      const c = await this.prisma.worldEntity.create({
        data: { userId, worldId: world.id, type: e.type, name: e.name, fields: e.fields },
        select: { id: true },
      });
      created.push(c);
    }
    const idMap = new Map<string, string>(entities.map((e, i) => [e.id, created[i].id]));

    for (const r of relations) {
      const s = idMap.get(r.sourceId);
      const tg = idMap.get(r.targetId);
      if (s && tg) {
        await this.prisma.entityRelation.create({
          data: { userId, worldId: world.id, sourceId: s, targetId: tg, kind: r.kind, label: r.label ?? r.kind },
        });
      }
    }
    for (const tl of timeline) {
      await this.prisma.timelineEvent.create({
        data: { userId, worldId: world.id, at: tl.at ?? null, title: tl.title, description: tl.description ?? null },
      });
    }
    return { worldId: world.id, name: world.name };
  }
}
