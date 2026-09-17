import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsString()
  runtimeJson?: string;
}
