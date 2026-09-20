import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverColor?: string;

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
