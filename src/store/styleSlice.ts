import type { StateCreator } from 'zustand';
import type { WorkStore, StyleSlice } from './types';
import type { StyleConfig } from '../types/style';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';

/**
 * 风格 Slice：全局/分卷的描写风格配置（文风/视角/节奏/修辞 + 禁用写法 + 必须回收伏笔）。
 */
export const createStyleSlice: StateCreator<WorkStore, [], [], StyleSlice> = (set, get) => ({
  getGlobalStyle: (worldId: string): StyleConfig | undefined => {
    const bundle = get().worlds[worldId];
    if (!bundle) return undefined;
    return Object.values(bundle.styleConfigs).find((s) => s.scope === 'global');
  },

  upsertGlobalStyle: (worldId: string, patch): string => {
    const bundle = get().worlds[worldId];
    if (!bundle) throw new Error('世界不存在，无法配置风格');

    const existing = Object.values(bundle.styleConfigs).find((s) => s.scope === 'global');

    if (existing) {
      set((state) =>
        withBundle(state, worldId, (b) => ({
          ...b,
          styleConfigs: {
            ...b.styleConfigs,
            [existing.id]: { ...existing, ...patch },
          },
        })),
      );
      return existing.id;
    }

    const id = newId('style');
    const style: StyleConfig = {
      id,
      worldId,
      scope: 'global',
      tone: patch.tone ?? '史诗奇幻',
      pov: patch.pov ?? '第三人称限知',
      pacing: patch.pacing ?? '张弛有度',
      rhetoric: patch.rhetoric ?? '重白描、少堆砌比喻',
      forbiddenWritings: patch.forbiddenWritings ?? [],
      requiredForeshadows: patch.requiredForeshadows ?? [],
      extra: patch.extra ?? {},
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        styleConfigs: { ...b.styleConfigs, [id]: style },
      })),
    );
    return id;
  },

  updateStyleConfig: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.styleConfigs[id];
        if (!old) return b;
        return {
          ...b,
          styleConfigs: { ...b.styleConfigs, [id]: { ...old, ...patch } },
        };
      }),
    );
  },
});
