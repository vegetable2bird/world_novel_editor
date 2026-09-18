import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, worldId: string) {
    return this.prisma.timelineEvent.findMany({
      where: { userId, worldId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(userId: string, id: string) {
    const e = await this.prisma.timelineEvent.findFirst({ where: { id, userId } });
    if (!e) throw new NotFoundException('timeline event not found');
    return e;
  }

  create(userId: string, worldId: string, dto: CreateTimelineDto) {
    return this.prisma.timelineEvent.create({
      data: {
        userId,
        worldId,
        title: dto.title,
        at: dto.at ?? null,
        description: dto.description ?? null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTimelineDto) {
    await this.get(userId, id);
    const data: { title?: string; at?: string | null; description?: string | null } = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.at !== undefined) data.at = dto.at ?? null;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    return this.prisma.timelineEvent.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.timelineEvent.delete({ where: { id } });
  }
}
