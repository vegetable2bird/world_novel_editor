import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, worldId: string, type?: string) {
    return this.prisma.worldEntity.findMany({
      where: { userId, worldId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(userId: string, id: string) {
    const e = await this.prisma.worldEntity.findFirst({ where: { id, userId } });
    if (!e) throw new NotFoundException('entity not found');
    return e;
  }

  create(userId: string, worldId: string, dto: CreateEntityDto) {
    return this.prisma.worldEntity.create({
      data: { userId, worldId, type: dto.type, name: dto.name, fields: dto.fields ?? null },
    });
  }

  async update(userId: string, id: string, dto: UpdateEntityDto) {
    await this.get(userId, id);
    const data: { type?: string; name?: string; fields?: string | null } = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.fields !== undefined) data.fields = dto.fields ?? null;
    return this.prisma.worldEntity.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    // 级联删除指向该实体的关系，避免孤儿关系
    await this.prisma.entityRelation.deleteMany({
      where: { userId, OR: [{ sourceId: id }, { targetId: id }] },
    });
    return this.prisma.worldEntity.delete({ where: { id } });
  }
}
