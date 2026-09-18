import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RelationsService } from './relations.service';
import { CreateRelationDto } from './dto/create-relation.dto';

// 实体关系（势力关系网）CRUD，按 worldId 隔离
@Controller('worlds')
@UseGuards(JwtAuthGuard)
export class RelationsController {
  constructor(private svc: RelationsService) {}

  @Get(':worldId/relations')
  list(@CurrentUser() u: { id: string }, @Param('worldId') worldId: string) {
    return this.svc.list(u.id, worldId);
  }

  @Post(':worldId/relations')
  create(@CurrentUser() u: { id: string }, @Param('worldId') worldId: string, @Body() dto: CreateRelationDto) {
    return this.svc.create(u.id, worldId, dto);
  }

  @Delete('relations/:id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
