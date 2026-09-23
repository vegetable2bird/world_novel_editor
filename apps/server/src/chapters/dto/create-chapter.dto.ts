import { IsString, IsOptional } from 'class-validator';

export class CreateChapterDto {
  @IsString()
  title: string; // 章节标题

  @IsOptional()
  @IsString()
  content?: string; // 初始正文（缺省为空串）

  @IsOptional()
  @IsString()
  volumeId?: string; // 归属分卷（不传 = 未分卷，直接挂在书上）
}
