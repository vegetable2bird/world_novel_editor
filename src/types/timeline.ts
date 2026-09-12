/**
 * 时间线与世界状态快照数据模型。
 */

/** 时间线事件（世界演进的日志） */
export interface TimelineEvent {
  id: string;
  worldId: string;
  chapterId?: string;
  title: string;
  description: string;
  era?: string;
  year?: number;
  season?: string;
  /** 若该事件由某次操作推演产生，记录其来源操作 id */
  causedByOperationId?: string;
  type: 'operation' | 'system' | 'generation' | 'manual';
  createdAt: string;
}

/** 世界状态快照（用于读档/回溯/分支） */
export interface WorldStateSnapshot {
  id: string;
  worldId: string;
  label: string;
  chapterId?: string;
  /** 当前各变量的值快照 */
  variables: Record<string, number>;
  /** 关系图快照哈希（用于快速比对状态差异） */
  relationsHash: string;
  entitiesCount: number;
  createdAt: string;
}
