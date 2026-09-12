import { z } from 'zod';

/**
 * 世界观实体 Zod 运行时校验（共享知识落地）。
 * 在写入 store / 持久化前对实体进行结构校验，避免脏数据。
 */

export const EntityTypeSchema = z.enum([
  'geography',
  'faction',
  'race',
  'character',
  'timeline',
  'rule',
]);

export const WorldEntitySchema = z.object({
  id: z.string(),
  worldId: z.string(),
  type: EntityTypeSchema,
  name: z.string().min(1, '实体名称不能为空'),
  summary: z.string().default(''),
  fields: z.record(z.unknown()).default({}),
  richText: z.string().optional(),
  tags: z.array(z.string()).default([]),
  inContext: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EntityRelationSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string().min(1),
  label: z.string().optional(),
  directed: z.boolean().default(true),
});

export const VariableSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  key: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
});

export const ForeshadowSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  title: z.string().min(1),
  plantChapterId: z.string().optional(),
  status: z.enum(['planted', 'active', 'resolved']).default('planted'),
  note: z.string().optional(),
});

/** 校验实体，失败时抛出带中文信息的错误。 */
export function assertWorldEntity(data: unknown): void {
  const res = WorldEntitySchema.safeParse(data);
  if (!res.success) {
    throw new Error(`实体数据校验失败：${res.error.issues.map((i) => i.message).join('; ')}`);
  }
}
