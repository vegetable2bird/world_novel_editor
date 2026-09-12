import type { WorkStore, WorldBundle } from './types';

/**
 * 不可变更新某世界数据聚合的纯函数助手。
 * 所有 slice 均通过它来修改 worlds[worldId]，避免重复样板代码。
 *
 * @param state 当前 store 状态
 * @param worldId 目标世界 id
 * @param updater 接收旧 bundle、返回新 bundle 的函数
 * @returns 仅包含更新后 worlds 字段的局部状态（直接传给 zustand 的 set）
 */
export function withBundle(
  state: WorkStore,
  worldId: string,
  updater: (bundle: WorldBundle) => WorldBundle,
): Pick<WorkStore, 'worlds'> {
  const bundle = state.worlds[worldId];
  if (!bundle) return { worlds: state.worlds };
  return {
    worlds: {
      ...state.worlds,
      [worldId]: updater(bundle),
    },
  };
}

/** 获取当前世界聚合（可能为 undefined）。 */
export function getBundle(
  state: WorkStore,
  worldId: string | null | undefined,
): WorldBundle | undefined {
  if (!worldId) return undefined;
  return state.worlds[worldId];
}
