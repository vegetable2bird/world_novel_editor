import { IsString, IsOptional } from 'class-validator';

export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string; // 正文更新（写入当前版本 v1）

  // @IsOptional 对 null 同样跳过校验，故显式传 null = 移出分卷
  @IsOptional()
  @IsString()
  volumeId?: string | null;
}
