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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private svc: TemplatesService) {}

  @Get()
  list(@CurrentUser() u: { id: string }, @Query('scope') scope?: string) {
    return this.svc.list(u.id, scope);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateTemplateDto) {
    return this.svc.create(u.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }

  @Post(':id/fork')
  fork(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() body?: { name?: string },
  ) {
    return this.svc.fork(u.id, id, body?.name);
  }
}
