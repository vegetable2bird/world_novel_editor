import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverColor?: string;

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: string;

  @IsOptional()
  @IsString()
  category?: string;

  // 若提供 worldId，服务端抓取该世界 entities/relations/timeline 快照进 content
  @IsOptional()
  @IsString()
  worldId?: string;

  // 直接传入的 content（JSON 字符串）；与 worldId 二选一，worldId 优先
  @IsOptional()
  @IsString()
  content?: string;
}
