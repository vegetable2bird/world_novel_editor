import { IsString, IsOptional } from 'class-validator';

export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string; // 正文更新（写入当前版本 v1）
}
