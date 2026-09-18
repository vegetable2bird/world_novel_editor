import { IsString, IsOptional } from 'class-validator';

export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fields?: string;
}
