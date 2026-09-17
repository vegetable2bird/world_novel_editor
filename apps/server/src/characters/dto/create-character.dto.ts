import { IsString, IsOptional } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  archetype?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  fields?: Record<string, unknown>;
}
