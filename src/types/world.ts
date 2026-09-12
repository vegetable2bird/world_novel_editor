/**
 * 世界观核心数据模型（跨文件契约）。
 * 一个 World 拥有实体、关系、变量、伏笔等；所有实体以 worldId 为归属键。
 */

/** 实体类型：地理/势力/种族/人物/时间线/规则 */
export type EntityType = 'geography' | 'faction' | 'race' | 'character' | 'timeline' | 'rule';

/** 世界（作品根节点） */
export interface World {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/** 世界观实体（通用结构，字段结构化存储于 fields） */
export interface WorldEntity {
  id: string;
  worldId: string;
  type: EntityType;
  name: string;
  summary: string;
  /** 结构化字段（等级/领地/教义…），按实体类型不同而异 */
  fields: Record<string, unknown>;
  /** 富文本描述（Markdown） */
  richText?: string;
  tags: string[];
  /** 是否纳入 AI 上下文（Lorebook 开关） */
  inContext: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 实体间关系（关系图的边） */
export interface EntityRelation {
  id: string;
  worldId: string;
  sourceId: string;
  targetId: string;
  /** 敌对/同盟/从属/亲属… */
  type: string;
  label?: string;
  directed: boolean;
}

/** 世界变量（国力/民心/灵气…） */
export interface Variable {
  id: string;
  worldId: string;
  key: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
}

/** 伏笔（需被回收的叙事钩子） */
export interface Foreshadow {
  id: string;
  worldId: string;
  title: string;
  plantChapterId?: string;
  status: 'planted' | 'active' | 'resolved';
  note?: string;
}

/** 新建实体的输入载荷（可选字段给默认值） */
export interface NewEntityInput {
  type: EntityType;
  name: string;
  summary?: string;
  fields?: Record<string, unknown>;
  tags?: string[];
  inContext?: boolean;
  richText?: string;
}

/** 新建关系的输入载荷 */
export interface NewRelationInput {
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  directed?: boolean;
}

/** 新建变量的输入载荷 */
export interface NewVariableInput {
  key: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
}

/** 新建伏笔的输入载荷 */
export interface NewForeshadowInput {
  title: string;
  status?: 'planted' | 'active' | 'resolved';
  note?: string;
  plantChapterId?: string;
}
