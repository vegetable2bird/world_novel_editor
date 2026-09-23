import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVolumeDto } from './dto/create-volume.dto';
import { UpdateVolumeDto } from './dto/update-volume.dto';

/**
 * 分卷 CRUD：作品之下的层级（书 → 卷 → 章）。
 * 铁律：删卷不删章 —— 先把卷内章节的 volumeId 置空，再删卷，正文零丢失。
 */
@Injectable()
export class VolumesService {
  constructor(private prisma: PrismaService) {}

  private async assertBook(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) throw new NotFoundException('book not found');
    return book;
  }

  async list(userId: string, bookId: string) {
    await this.assertBook(userId, bookId);
    return this.prisma.volume.findMany({
      where: { userId, bookId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { chapters: true } } },
    });
  }

  async create(userId: string, bookId: string, dto: CreateVolumeDto) {
    await this.assertBook(userId, bookId);
    const last = await this.prisma.volume.findFirst({
      where: { bookId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return this.prisma.volume.create({
      data: {
        userId,
        bookId,
        title: dto.title,
        order: dto.order ?? (last?.order ?? -1) + 1,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateVolumeDto) {
    const vol = await this.prisma.volume.findFirst({ where: { id, userId } });
    if (!vol) throw new NotFoundException('volume not found');
    return this.prisma.volume.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const vol = await this.prisma.volume.findFirst({ where: { id, userId } });
    if (!vol) throw new NotFoundException('volume not found');
    await this.prisma.$transaction([
      this.prisma.chapter.updateMany({
        where: { volumeId: id, userId },
        data: { volumeId: null },
      }),
      this.prisma.volume.delete({ where: { id } }),
    ]);
  }
}
