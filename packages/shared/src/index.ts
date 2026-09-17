import { z } from 'zod';

// ===== 鉴权 =====
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64),
  displayName: z.string().max(40).optional(),
});
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthResultSchema = z.object({
  accessToken: z.string(),
  user: z.object({ id: z.string(), email: z.string(), displayName: z.string().nullable() }),
});
export type AuthResult = z.infer<typeof AuthResultSchema>;

// ===== 世界 =====
export const WorldCreateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['private', 'public']).default('private'),
  coverColor: z.string().max(16).optional(),
});
export const WorldUpdateSchema = WorldCreateSchema.partial();
export type WorldCreate = z.infer<typeof WorldCreateSchema>;
export type WorldUpdate = z.infer<typeof WorldUpdateSchema>;

// ===== 书籍 =====
export const BookCreateSchema = z.object({
  worldId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
  order: z.number().int().default(0),
});
export type BookCreate = z.infer<typeof BookCreateSchema>;

// ===== 角色（万界 / 本作原生）=====
export const CharacterCreateSchema = z.object({
  name: z.string().min(1).max(80),
  archetype: z.string().max(40).optional(),
  bio: z.string().max(4000).optional(),
  fields: z.record(z.unknown()).optional(),
});
export type CharacterCreate = z.infer<typeof CharacterCreateSchema>;

export const InstanceCreateSchema = z.object({
  bookId: z.string().min(1),
  characterId: z.string().optional(),
  name: z.string().min(1).max(80),
  role: z.string().max(80).optional(),
  bio: z.string().max(4000).optional(),
  originWorldId: z.string().optional(),
});
export type InstanceCreate = z.infer<typeof InstanceCreateSchema>;

// ===== 通用列表查询 =====
export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  sort: z.string().max(32).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ListQuery = z.infer<typeof ListQuerySchema>;
