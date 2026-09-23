import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateVolumeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
