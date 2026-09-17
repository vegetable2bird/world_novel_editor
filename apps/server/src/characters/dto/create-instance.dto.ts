import { IsString, IsOptional } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  bookId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  characterId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  originWorldId?: string;
}
