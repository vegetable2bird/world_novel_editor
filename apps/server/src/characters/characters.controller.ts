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
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

// 万界角色
@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private svc: CharactersService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) {
    return this.svc.listCharacters(u.id);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.getCharacter(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateCharacterDto) {
    return this.svc.createCharacter(u.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.svc.updateCharacter(u.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.removeCharacter(u.id, id);
  }
}
