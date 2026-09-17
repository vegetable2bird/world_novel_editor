import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    if (!u) throw new NotFoundException('用户不存在');
    return u;
  }
}
