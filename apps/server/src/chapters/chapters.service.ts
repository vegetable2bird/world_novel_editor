import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

/**
 * 章节 CRUD。正文存 ChapterVersion（v1 即当前稿）：
 * 为后续 AI 生成版本留好结构，且零 schema 迁移（表已存在）。
 */
@Injectable()
export class ChaptersService {
  constructor(private prisma: PrismaService) {}

  private async assertBook(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) throw new NotFoundException('book not found');
    return book;
  }

  async list(userId: string, bookId: string) {
    await this.assertBook(userId, bookId);
    const chapters = await this.prisma.chapter.findMany({
      where: { userId, bookId },
      orderBy: { order: 'asc' },
      include: { versions: { where: { version: 1 }, select: { content: true } } },
    });
    // 附带 v1 正文字数与片段，便于章节列表预览
    return chapters.map((c) => {
      const content = c.versions[0]?.content ?? '';
      return {
        id: c.id,
        bookId: c.bookId,
        title: c.title,
        order: c.order,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        charCount: content.length,
        snippet: content.slice(0, 60),
      };
    });
  }

  async get(userId: string, id: string) {
    const ch = await this.prisma.chapter.findFirst({
      where: { id, userId },
      include: { versions: { where: { version: 1 }, select: { content: true } } },
    });
    if (!ch) throw new NotFoundException('chapter not found');
    const { versions, ...rest } = ch;
    return { ...rest, content: versions[0]?.content ?? '' };
  }

  async create(userId: string, bookId: string, dto: CreateChapterDto) {
    await this.assertBook(userId, bookId);
    const last = await this.prisma.chapter.findFirst({
      where: { bookId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return this.prisma.chapter.create({
      data: {
        userId,
        bookId,
        title: dto.title,
        order: (last?.order ?? -1) + 1,
        versions: { create: { version: 1, content: dto.content ?? '' } },
      },
      include: { versions: { where: { version: 1 }, select: { content: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateChapterDto) {
    const ch = await this.prisma.chapter.findFirst({ where: { id, userId } });
    if (!ch) throw new NotFoundException('chapter not found');
    if (dto.title !== undefined) {
      await this.prisma.chapter.update({ where: { id }, data: { title: dto.title } });
    }
    if (dto.content !== undefined) {
      const v1 = await this.prisma.chapterVersion.findFirst({
        where: { chapterId: id, version: 1 },
      });
      if (v1) {
        await this.prisma.chapterVersion.update({ where: { id: v1.id }, data: { content: dto.content } });
      } else {
        await this.prisma.chapterVersion.create({ data: { chapterId: id, version: 1, content: dto.content } });
      }
    }
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const ch = await this.prisma.chapter.findFirst({ where: { id, userId } });
    if (!ch) throw new NotFoundException('chapter not found');
    await this.prisma.chapter.delete({ where: { id } });
  }
}
