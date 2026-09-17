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
import { WorldsService } from './worlds.service';
import { CreateWorldDto } from './dto/create-world.dto';
import { UpdateWorldDto } from './dto/update-world.dto';

@Controller('worlds')
@UseGuards(JwtAuthGuard)
export class WorldsController {
  constructor(private svc: WorldsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) {
    return this.svc.list(u.id);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateWorldDto) {
    return this.svc.create(u.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateWorldDto,
  ) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
