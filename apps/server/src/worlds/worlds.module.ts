import { Module } from '@nestjs/common';
import { WorldsService } from './worlds.service';
import { WorldsController } from './worlds.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorldsController],
  providers: [WorldsService],
  exports: [WorldsService],
})
export class WorldsModule {}
