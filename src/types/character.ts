/**
 * 角色系统数据模型（v2 P3）。
 *
 * 三层结构：
 *  - CharacterRegistryEntry：角色总库条目（宏观）。归属于世界，可跨作品（卷）出演；
 *    跨书联动时通过 characterInstance.registryId 关联，并聚合其心情。
 *  - CharacterInstance：角色卡（微观）。归属于某一部作品（卷）的具体化身，
 *    含画像、生平、当前心情基调；原创角色 registryId 为空。
 *  - MoodEntry：心情时间线节点。归属于某角色卡，记录某一时刻的心情与触发来源。
 *
 * 关系：World 1-* CharacterRegistryEntry；Book 1-* CharacterInstance；
 *       CharacterInstance 1-* MoodEntry。
 */

/** 角色总库条目（宏观：跨书出演、聚合心情） */
export interface CharacterRegistryEntry {
  id: string;
  worldId: string;
  name: string;
  /** 一句话设定（种族/身份/核心标签），如「流亡的霜族皇子」 */
  archetype: string;
  summary?: string;
  tags: string[];
  /** 完整设定（Markdown），如世界观定位、核心动机等 */
  richText?: string;
  /** 是否纳入 AI 上下文（Lorebook 开关） */
  inContext: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 新建总库条目的输入载荷 */
export interface NewRegistryCharacterInput {
  name: string;
  archetype?: string;
  summary?: string;
  tags?: string[];
  richText?: string;
  inContext?: boolean;
}

/** 角色卡（微观：某作品中的具体化身，含画像/生平/心情时间线） */
export interface CharacterInstance {
  id: string;
  worldId: string;
  /** 所属作品（卷） */
  bookId: string;
  /** 指向总库条目（若是原创角色则为 undefined） */
  registryId?: string;
  name: string;
  /** 画像：外貌 / 性格 / 口吻等结构化描述 */
  portrait: Record<string, unknown>;
  /** 生平履历（Markdown，按时间线叙述） */
  biography?: string;
  /** 当前心情基调（自由文本，供生成参考） */
  currentMood?: string;
  status: 'active' | 'minor' | 'offstage';
  createdAt: string;
  updatedAt: string;
}

/** 新建角色卡的输入载荷 */
export interface NewCharacterInstanceInput {
  bookId: string;
  /** 若来自总库，则带上 registryId 以建立跨书关联 */
  registryId?: string;
  /** 可省略：省略且带 registryId 时沿用总库名称，否则 fallback 为「未命名角色」 */
  name?: string;
  portrait?: Record<string, unknown>;
  biography?: string;
  currentMood?: string;
  status?: CharacterInstance['status'];
}

/** 心情时间线节点 */
export interface MoodEntry {
  id: string;
  worldId: string;
  /** 所属角色卡 */
  characterInstanceId: string;
  /** 关联章节（可选） */
  chapterId?: string;
  /** 关联时间线事件（可选） */
  eventId?: string;
  /** 记录时点的世界时钟摘要，便于回看 */
  clockLabel: string;
  /** 该节点心情描述 */
  mood: string;
  note?: string;
  createdAt: string;
}

/** 新建心情节点的输入载荷 */
export interface NewMoodEntryInput {
  characterInstanceId: string;
  mood: string;
  chapterId?: string;
  eventId?: string;
  clockLabel?: string;
  note?: string;
}
