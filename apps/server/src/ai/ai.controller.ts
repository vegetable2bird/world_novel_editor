import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiService, GenerateBody } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private svc: AiService) {}

  @Post('generate')
  @HttpCode(200)
  generate(@CurrentUser() _u: { id: string }, @Body() body: GenerateBody) {
    return this.svc.generate(body);
  }
}
