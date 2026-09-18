import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TimelineService } from './timeline.service';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';

// 世界时间线事件 CRUD，按 worldId 隔离
@Controller('worlds')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private svc: TimelineService) {}

  @Get(':worldId/timeline')
  list(@CurrentUser() u: { id: string }, @Param('worldId') worldId: string) {
    return this.svc.list(u.id, worldId);
  }

  @Post(':worldId/timeline')
  create(@CurrentUser() u: { id: string }, @Param('worldId') worldId: string, @Body() dto: CreateTimelineDto) {
    return this.svc.create(u.id, worldId, dto);
  }

  @Put('timeline/:id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateTimelineDto) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete('timeline/:id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
