import { IsString, IsOptional } from 'class-validator';

export class CreateTimelineDto {
  @IsString()
  title: string; // 事件名

  @IsOptional()
  @IsString()
  at?: string; // 时间线锚点（纪元/年份）

  @IsOptional()
  @IsString()
  description?: string;
}
