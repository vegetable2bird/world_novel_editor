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
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(private svc: BooksService) {}

  @Get()
  list(
    @CurrentUser() u: { id: string },
    @Query('worldId') worldId?: string,
  ) {
    return this.svc.list(u.id, worldId);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateBookDto) {
    return this.svc.create(u.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
