import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorldsModule } from './worlds/worlds.module';
import { BooksModule } from './books/books.module';
import { CharactersModule } from './characters/characters.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorldsModule,
    BooksModule,
    CharactersModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
