import { IsString, IsOptional } from 'class-validator';

export class UpdateTimelineDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  at?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
