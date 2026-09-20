import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

interface TemplateContent {
  entities: { type: string; name: string; fields?: string | null }[];
  relations: { sourceIdx: number; targetIdx: number; kind: string; label?: string | null }[];
  timeline: { at?: string | null; title: string; description?: string | null }[];
}

const LIST_SELECT = {
  id: true,
  userId: true,
  name: true,
  description: true,
  coverColor: true,
  visibility: true,
  category: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, scope?: string) {
    const where =
      scope === 'mine'
        ? { userId }
        : scope === 'public'
          ? { visibility: 'public' }
          : { OR: [{ userId }, { visibility: 'public' }] };
    return this.prisma.worldTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: LIST_SELECT,
    });
  }

  async get(userId: string, id: string) {
    const t = await this.prisma.worldTemplate.findFirst({
      where: { id, OR: [{ userId }, { visibility: 'public' }] },
    });
    if (!t) throw new NotFoundException('template not found');
    return t;
  }

  async create(userId: string, dto: CreateTemplateDto) {
    let content = dto.content ?? null;
    if (dto.worldId) {
      content = JSON.stringify(await this.snapshot(userId, dto.worldId));
    }
    return this.prisma.worldTemplate.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        coverColor: dto.coverColor ?? null,
        visibility: dto.visibility ?? 'private',
        category: dto.category ?? null,
        content,
      },
      select: LIST_SELECT,
    });
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    await this.ensureOwner(userId, id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.coverColor !== undefined) data.coverColor = dto.coverColor;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.category !== undefined) data.category = dto.category;
    return this.prisma.worldTemplate.update({ where: { id }, data, select: LIST_SELECT });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwner(userId, id);
    return this.prisma.worldTemplate.delete({ where: { id } });
  }

  // 用模板内容冷启动一个新世界，并回种初始 entities/relations/timeline
  async fork(userId: string, id: string, newName?: string) {
    const t = await this.get(userId, id);
    const world = await this.prisma.world.create({
      data: {
        userId,
        name: newName?.trim() || t.name,
        description: t.description,
        coverColor: t.coverColor,
        visibility: 'private',
      },
      select: { id: true, name: true },
    });
    let content: TemplateContent = { entities: [], relations: [], timeline: [] };
    try {
      if (t.content) content = JSON.parse(t.content) as TemplateContent;
    } catch {
      /* ignore malformed content */
    }
    const created: { id: string }[] = [];
    for (const e of content.entities ?? []) {
      const c = await this.prisma.worldEntity.create({
        data: { userId, worldId: world.id, type: e.type, name: e.name, fields: e.fields ?? null },
        select: { id: true },
      });
      created.push(c);
    }
    const idxMap = new Map<number, string>(created.map((c, i) => [i, c.id]));
    for (const r of content.relations ?? []) {
      const s = idxMap.get(r.sourceIdx);
      const tg = idxMap.get(r.targetIdx);
      if (s && tg) {
        await this.prisma.entityRelation.create({
          data: { userId, worldId: world.id, sourceId: s, targetId: tg, kind: r.kind, label: r.label ?? r.kind },
        });
      }
    }
    for (const tl of content.timeline ?? []) {
      await this.prisma.timelineEvent.create({
        data: { userId, worldId: world.id, at: tl.at ?? null, title: tl.title, description: tl.description ?? null },
      });
    }
    return { worldId: world.id, name: world.name };
  }

  private async snapshot(userId: string, worldId: string) {
    const [entities, relations, timeline] = await Promise.all([
      this.prisma.worldEntity.findMany({ where: { userId, worldId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.entityRelation.findMany({ where: { userId, worldId } }),
      this.prisma.timelineEvent.findMany({ where: { userId, worldId }, orderBy: { createdAt: 'asc' } }),
    ]);
    const idxById = new Map(entities.map((e, i) => [e.id, i]));
    return {
      entities: entities.map((e) => ({ type: e.type, name: e.name, fields: e.fields })),
      relations: relations
        .filter((r) => idxById.has(r.sourceId) && idxById.has(r.targetId))
        .map((r) => ({
          sourceIdx: idxById.get(r.sourceId)!,
          targetIdx: idxById.get(r.targetId)!,
          kind: r.kind,
          label: r.label,
        })),
      timeline: timeline.map((t) => ({ at: t.at, title: t.title, description: t.description })),
    };
  }

  private async ensureOwner(userId: string, id: string) {
    const t = await this.prisma.worldTemplate.findFirst({ where: { id } });
    if (!t) throw new NotFoundException('template not found');
    if (t.userId !== userId) throw new ForbiddenException('not owner');
  }
}
