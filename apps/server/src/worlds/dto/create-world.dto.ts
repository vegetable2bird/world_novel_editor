import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateWorldDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['private', 'public'])
  visibility?: string;

  @IsOptional()
  @IsString()
  coverColor?: string;
}
