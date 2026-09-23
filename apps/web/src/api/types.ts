// 前后端共享的领域类型（与 Prisma schema 对齐）

export interface World {
  id: string;
  name: string;
  description?: string | null;
  visibility?: string | null;
  coverColor?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { books: number; characters: number };
}

export interface Book {
  id: string;
  worldId: string;
  name: string;
  description?: string | null;
  order?: number | null;
  runtimeJson?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { chapters: number; instances: number };
}

/** 章节列表项（含 v1 正文字数与片段预览） */
export interface ChapterListItem {
  id: string;
  bookId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  charCount: number;
  snippet: string;
}

/** 章节详情（含正文） */
export interface Chapter extends Omit<ChapterListItem, 'charCount' | 'snippet'> {
  userId: string;
  content: string;
}

export interface CreateChapterInput {
  title: string;
  content?: string;
}

export interface UpdateChapterInput {
  title?: string;
  content?: string;
}

export interface Character {
  id: string;
  name: string;
  archetype?: string | null;
  bio?: string | null;
  fields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: { instances: number; trails: number };
}

export interface CharacterInstance {
  id: string;
  bookId: string;
  name: string;
  characterId?: string | null;
  role?: string | null;
  bio?: string | null;
  originWorldId?: string | null;
  createdAt: string;
  updatedAt: string;
  character?: { id: string; name: string } | null;
}

export interface CreateWorldInput {
  name: string;
  description?: string;
  visibility?: string;
  coverColor?: string;
}
export interface UpdateWorldInput {
  name?: string;
  description?: string;
  visibility?: string;
  coverColor?: string;
}

export interface ForkWorldResult {
  worldId: string;
  name: string;
}

export interface CreateBookInput {
  worldId: string;
  name: string;
  description?: string;
  order?: number;
  runtimeJson?: string;
}
export interface UpdateBookInput {
  name?: string;
  description?: string;
  order?: number;
  runtimeJson?: string;
}

export interface CreateCharacterInput {
  name: string;
  archetype?: string;
  bio?: string;
  fields?: Record<string, unknown>;
}
export interface UpdateCharacterInput {
  name?: string;
  archetype?: string;
  bio?: string;
  fields?: Record<string, unknown>;
}

export interface CreateInstanceInput {
  bookId: string;
  name: string;
  characterId?: string;
  role?: string;
  bio?: string;
  originWorldId?: string;
}
export interface UpdateInstanceInput {
  name?: string;
  characterId?: string;
  role?: string;
  bio?: string;
  originWorldId?: string;
}

// ===== 世界观详情子数据（复用 WorldEntity / EntityRelation / TimelineEvent） =====
export interface WorldEntity {
  id: string;
  userId: string;
  worldId: string;
  type: string; // faction|skill|geography|figure|item|map|rule|race…
  name: string;
  fields?: string | null; // 应用层 JSON 字符串
  createdAt: string;
  updatedAt: string;
}

export interface EntityRelation {
  id: string;
  userId: string;
  worldId: string;
  sourceId: string;
  targetId: string;
  kind: string; // 敌对 | 同盟 | 附庸 | 中立 …
  label?: string | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  userId: string;
  worldId: string;
  title: string;
  at?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface CreateEntityInput {
  type: string;
  name: string;
  fields?: string;
}
export interface CreateRelationInput {
  sourceId: string;
  targetId: string;
  kind: string;
  label?: string;
}
export interface CreateTimelineInput {
  title: string;
  at?: string;
  description?: string;
}
export interface UpdateTimelineInput {
  title?: string;
  at?: string;
  description?: string;
}

// ===== 世界模板库 =====
export interface WorldTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  coverColor?: string | null;
  visibility: string; // private | public
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  content?: string | null; // 仅在按 id 获取时返回：{ entities, relations, timeline }
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  coverColor?: string;
  visibility?: string;
  category?: string;
  worldId?: string; // 服务端按此世界快照内容
  content?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  coverColor?: string;
  visibility?: string;
  category?: string;
}

export interface ForkTemplateResult {
  worldId: string;
  name: string;
}
