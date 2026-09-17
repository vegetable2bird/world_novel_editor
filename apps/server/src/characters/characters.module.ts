import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';
import { InstancesController } from './instances.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CharactersController, InstancesController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
