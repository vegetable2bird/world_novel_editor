import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

// 世界实体（势力/技能/地理/人物…）CRUD，按 worldId 隔离
@Controller('worlds')
@UseGuards(JwtAuthGuard)
export class EntitiesController {
  constructor(private svc: EntitiesService) {}

  @Get(':worldId/entities')
  list(@CurrentUser() u: { id: string }, @Param('worldId') worldId: string, @Query('type') type?: string) {
    return this.svc.list(u.id, worldId, type);
  }

  @Post(':worldId/entities')
  create(@CurrentUser() u: { id: string }, @Param('worldId') worldId: string, @Body() dto: CreateEntityDto) {
    return this.svc.create(u.id, worldId, dto);
  }

  @Put('entities/:id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateEntityDto) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete('entities/:id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
