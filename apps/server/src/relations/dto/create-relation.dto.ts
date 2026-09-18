import { IsString } from 'class-validator';

export class CreateRelationDto {
  @IsString()
  sourceId: string;

  @IsString()
  targetId: string;

  // 敌对 | 同盟 | 附庸 | 中立 …
  @IsString()
  kind: string;

  @IsString()
  label?: string;
}
