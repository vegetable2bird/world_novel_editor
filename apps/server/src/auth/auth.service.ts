import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, password: string, displayName?: string): Promise<AuthUser> {
    const exist = await this.prisma.user.findUnique({ where: { email } });
    if (exist) throw new ConflictException('该邮箱已注册');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
    return this.toAuthUser(user);
  }

  async validate(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('邮箱或密码错误');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('邮箱或密码错误');
    return this.toAuthUser(user);
  }

  login(user: AuthUser): { accessToken: string } {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload) };
  }

  private toAuthUser(u: { id: string; email: string; displayName: string | null }): AuthUser {
    return { id: u.id, email: u.email, displayName: u.displayName };
  }
}
