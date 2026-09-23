import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateVolumeDto {
  @IsString()
  title: string; // 卷名，如「第一卷 · 雪岭篇」

  @IsOptional()
  @IsInt()
  order?: number;
}
