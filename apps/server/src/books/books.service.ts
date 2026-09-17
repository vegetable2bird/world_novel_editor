import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, worldId?: string) {
    return this.prisma.book.findMany({
      where: worldId ? { userId, worldId } : { userId },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      include: { _count: { select: { chapters: true, instances: true } } },
    });
  }

  async get(userId: string, id: string) {
    const b = await this.prisma.book.findFirst({ where: { id, userId } });
    if (!b) throw new NotFoundException('book not found');
    return b;
  }

  async create(userId: string, dto: CreateBookDto) {
    const world = await this.prisma.world.findFirst({
      where: { id: dto.worldId, userId },
    });
    if (!world) throw new NotFoundException('world not found');
    return this.prisma.book.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateBookDto) {
    await this.get(userId, id);
    return this.prisma.book.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.book.delete({ where: { id } });
  }
}
