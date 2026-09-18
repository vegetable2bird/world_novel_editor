import { IsString, IsOptional } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  type: string; // faction|skill|geography|figure|item|map…

  @IsString()
  name: string;

  // 应用层 JSON 字符串（与 Prisma String? 字段对齐）
  @IsOptional()
  @IsString()
  fields?: string;
}
