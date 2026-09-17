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
}
