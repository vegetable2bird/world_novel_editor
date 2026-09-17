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
import { CharactersService } from './characters.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';

// 本作原生角色
@Controller('instances')
@UseGuards(JwtAuthGuard)
export class InstancesController {
  constructor(private svc: CharactersService) {}

  @Get()
  list(
    @CurrentUser() u: { id: string },
    @Query('bookId') bookId?: string,
  ) {
    return this.svc.listInstances(u.id, bookId);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.getInstance(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateInstanceDto) {
    return this.svc.createInstance(u.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateInstanceDto,
  ) {
    return this.svc.updateInstance(u.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.removeInstance(u.id, id);
  }
}
