import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorldsModule } from './worlds/worlds.module';
import { BooksModule } from './books/books.module';
import { ChaptersModule } from './chapters/chapters.module';
import { CharactersModule } from './characters/characters.module';
import { EntitiesModule } from './entities/entities.module';
import { RelationsModule } from './relations/relations.module';
import { TimelineModule } from './timeline/timeline.module';
import { TemplatesModule } from './templates/templates.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorldsModule,
    BooksModule,
    ChaptersModule,
    CharactersModule,
    EntitiesModule,
    RelationsModule,
    TimelineModule,
    TemplatesModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
