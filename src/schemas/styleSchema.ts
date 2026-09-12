import { z } from 'zod';

/**
 * 描写风格配置 Zod 校验（架构文档 7.4 节）。
 */
export const StyleConfigSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  scope: z.enum(['global', 'volume']),
  volumeId: z.string().optional(),
  tone: z.string().default(''),
  pov: z.string().default(''),
  pacing: z.string().default(''),
  rhetoric: z.string().default(''),
  forbiddenWritings: z.array(z.string()).default([]),
  requiredForeshadows: z.array(z.string()).default([]),
  extra: z.record(z.unknown()).default({}),
});

/** 校验风格配置，失败时抛出错误。 */
export function assertStyleConfig(data: unknown): void {
  const res = StyleConfigSchema.safeParse(data);
  if (!res.success) {
    throw new Error(`风格配置校验失败：${res.error.issues.map((i) => i.message).join('; ')}`);
  }
}
