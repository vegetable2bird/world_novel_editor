/**
 * 跨书联动（Cross-Book Continuity）数据模型（v2 P4）。
 *
 * 多部作品（卷）共享同一世界观时，同一总库角色可在不同卷以独立化身出演。
 * 本模块描述「跨书一致性」的聚合与冲突结构：
 *  - CharacterContinuityRow：某总库角色在各卷的出演聚合（联动矩阵的一行）。
 *  - CrossBookConflict：系统自动扫描出的跨书不一致（角色名 / 状态），供作者核对。
 *  - CrossBookReport：世界级汇总（冲突列表 + 矩阵 + 统计）。
 *
 * 全部以 P3 的 CharacterInstance.registryId 为关联轴；纯函数不依赖 store。
 */

/** 跨书冲突类型 */
export type CrossBookConflictType = 'character_name' | 'character_status';

/** 冲突严重度 */
export type ConflictSeverity = 'info' | 'warning' | 'error';

/** 冲突中某一处取值的出处（用于向作者展示差异来源） */
export interface ConflictOccurrence {
  bookId: string;
  bookName: string;
  /** 该卷内该角色的实际取值（名字或状态文案） */
  value: string;
}

/** 一条跨书冲突记录（确定性 id，便于做 React key 与去重） */
export interface CrossBookConflict {
  /** 形如 `character_name:<registryId>` / `character_status:<registryId>`，稳定可重现 */
  id: string;
  type: CrossBookConflictType;
  severity: ConflictSeverity;
  worldId: string;
  /** 关联的主题 key（总库角色 id） */
  subjectKey: string;
  /** 关联主题的人类可读名称（总库角色名） */
  subjectLabel: string;
  description: string;
  occurrences: ConflictOccurrence[];
  hint: string;
}

/** 某总库角色在某一卷的出演信息（联动矩阵单元格） */
export interface CharacterBookAppearance {
  bookId: string;
  bookName: string;
  /** 该卷内的角色卡 id */
  instanceId: string;
  status: import('./character').CharacterInstance['status'];
  /** 该卷此化身的最新心情（若有） */
  latestMood?: string;
}

/** 跨书角色联动矩阵的一行：某总库角色在全部卷的出演聚合 */
export interface CharacterContinuityRow {
  registryId: string;
  name: string;
  archetype: string;
  /** 该总库角色出演的各卷信息（按卷名排序） */
  appearances: CharacterBookAppearance[];
  /** 是否命中任一冲突（用于矩阵高亮） */
  conflicted: boolean;
}

/** 世界级的跨书联动汇总报告 */
export interface CrossBookReport {
  conflicts: CrossBookConflict[];
  rows: CharacterContinuityRow[];
  /** 世界下作品（卷）总数 */
  bookCount: number;
  /** 总库角色总数 */
  characterCount: number;
  /** 真正「跨书」出演（≥2 部作品）的角色数 */
  crossBookCharacterCount: number;
}
