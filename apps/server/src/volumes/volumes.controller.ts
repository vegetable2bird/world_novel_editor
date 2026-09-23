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
import { VolumesService } from './volumes.service';
import { CreateVolumeDto } from './dto/create-volume.dto';
import { UpdateVolumeDto } from './dto/update-volume.dto';

// 分卷 CRUD：列表/新建挂在书籍下，改名/删除按 id，全部多租户隔离
@Controller()
@UseGuards(JwtAuthGuard)
export class VolumesController {
  constructor(private svc: VolumesService) {}

  @Get('books/:bookId/volumes')
  list(@CurrentUser() u: { id: string }, @Param('bookId') bookId: string) {
    return this.svc.list(u.id, bookId);
  }

  @Post('books/:bookId/volumes')
  create(
    @CurrentUser() u: { id: string },
    @Param('bookId') bookId: string,
    @Body() dto: CreateVolumeDto,
  ) {
    return this.svc.create(u.id, bookId, dto);
  }

  @Put('volumes/:id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateVolumeDto) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete('volumes/:id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
