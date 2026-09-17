import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  // ===== 万界角色（跨世界共享，归用户） =====
  listCharacters(userId: string) {
    return this.prisma.character.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { instances: true, trails: true } } },
    });
  }

  async getCharacter(userId: string, id: string) {
    const c = await this.prisma.character.findFirst({ where: { id, userId } });
    if (!c) throw new NotFoundException('character not found');
    return c;
  }

  createCharacter(userId: string, dto: CreateCharacterDto) {
    return this.prisma.character.create({
      data: { ...dto, userId } as Prisma.CharacterUncheckedCreateInput,
    });
  }

  async updateCharacter(userId: string, id: string, dto: UpdateCharacterDto) {
    await this.getCharacter(userId, id);
    return this.prisma.character.update({
      where: { id },
      data: dto as Prisma.CharacterUpdateInput,
    });
  }

  async removeCharacter(userId: string, id: string) {
    await this.getCharacter(userId, id);
    return this.prisma.character.delete({ where: { id } });
  }

  // ===== 本作原生角色（挂在具体书） =====
  listInstances(userId: string, bookId?: string) {
    return this.prisma.characterInstance.findMany({
      where: bookId ? { userId, bookId } : { userId },
      orderBy: { updatedAt: 'desc' },
      include: { character: { select: { id: true, name: true } } },
    });
  }

  async getInstance(userId: string, id: string) {
    const i = await this.prisma.characterInstance.findFirst({ where: { id, userId } });
    if (!i) throw new NotFoundException('instance not found');
    return i;
  }

  async createInstance(userId: string, dto: CreateInstanceDto) {
    const book = await this.prisma.book.findFirst({
      where: { id: dto.bookId, userId },
    });
    if (!book) throw new NotFoundException('book not found');
    return this.prisma.characterInstance.create({
      data: { ...dto, userId } as Prisma.CharacterInstanceUncheckedCreateInput,
    });
  }

  async updateInstance(userId: string, id: string, dto: UpdateInstanceDto) {
    await this.getInstance(userId, id);
    return this.prisma.characterInstance.update({
      where: { id },
      data: dto as Prisma.CharacterInstanceUpdateInput,
    });
  }

  async removeInstance(userId: string, id: string) {
    await this.getInstance(userId, id);
    return this.prisma.characterInstance.delete({ where: { id } });
  }
}
