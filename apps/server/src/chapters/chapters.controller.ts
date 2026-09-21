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
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

// 章节 CRUD：列表/新建挂在书籍下，详情/更新/删除按 id，全部多租户隔离
@Controller()
@UseGuards(JwtAuthGuard)
export class ChaptersController {
  constructor(private svc: ChaptersService) {}

  @Get('books/:bookId/chapters')
  list(@CurrentUser() u: { id: string }, @Param('bookId') bookId: string) {
    return this.svc.list(u.id, bookId);
  }

  @Post('books/:bookId/chapters')
  create(@CurrentUser() u: { id: string }, @Param('bookId') bookId: string, @Body() dto: CreateChapterDto) {
    return this.svc.create(u.id, bookId, dto);
  }

  @Get('chapters/:id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  @Put('chapters/:id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateChapterDto) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete('chapters/:id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
