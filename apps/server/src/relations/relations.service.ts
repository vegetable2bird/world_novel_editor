import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRelationDto } from './dto/create-relation.dto';

@Injectable()
export class RelationsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, worldId: string) {
    return this.prisma.entityRelation.findMany({
      where: { userId, worldId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(userId: string, id: string) {
    const r = await this.prisma.entityRelation.findFirst({ where: { id, userId } });
    if (!r) throw new NotFoundException('relation not found');
    return r;
  }

  create(userId: string, worldId: string, dto: CreateRelationDto) {
    return this.prisma.entityRelation.create({
      data: {
        userId,
        worldId,
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        kind: dto.kind,
        label: dto.label ?? null,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.entityRelation.delete({ where: { id } });
  }
}
