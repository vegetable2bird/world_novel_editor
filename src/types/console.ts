import type { TimelineEvent } from './timeline';

/**
 * 操作台（轻游戏化叙事推演）数据模型。
 */

/** 操作类型：调度势力 / 推进时间 / 触发事件 / 调整变量 / 外交 */
export type OperationKind =
  | 'dispatch'
  | 'advanceTime'
  | 'triggerEvent'
  | 'adjustVariable'
  | 'diplomacy';

/** 一次操作（作者在世界上的"轻操作"） */
export interface Operation {
  id: string;
  worldId: string;
  kind: OperationKind;
  payload: Record<string, unknown>;
  label: string;
  createdAt: string;
}

/** 操作推演结果（喂给 AI 生成） */
export interface OperationResult {
  operationId: string;
  /** 叙事推演摘要 */
  narrativeSummary: string;
  affectedEntityIds: string[];
  /** 本次推演产生的新事件 */
  newEvents: TimelineEvent[];
  /** 变量变化量（按 variableId 索引） */
  variableDeltas: Record<string, number>;
  /** 推荐的后续走向（供作者选择） */
  proposedDirections: DirectionOption[];
}

/** 走向选项 */
export interface DirectionOption {
  id: string;
  label: string;
  description: string;
  /** 若选择该走向，预计会发生的叙事摘要 */
  estimatedSummary: string;
}

/** 新建操作的输入载荷 */
export interface NewOperationInput {
  kind: OperationKind;
  payload: Record<string, unknown>;
  label: string;
}
