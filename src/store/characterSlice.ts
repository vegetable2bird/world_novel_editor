import type { StateCreator } from 'zustand';
import type { WorkStore, CharacterSlice } from './types';
import type {
  CharacterRegistryEntry,
  CharacterInstance,
  MoodEntry,
} from '../types/character';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';

/**
 * 角色系统 Slice（v2 P3）。
 * 涵盖：角色总库（跨书）、角色卡（本卷化身）、心情时间线三层。
 * 全部以 worldId 为键收纳于 WorldBundle。
 *
 * 级联关系：
 *  - 删除角色卡 -> 清理其下心情节点；若其关联某个总库条目，仅解除关联、不删总库。
 *  - 删除总库条目 -> 仅解除各角色卡的 registryId 关联（保留已写就的本卷化身与心情）。
 */
export const createCharacterSlice: StateCreator<
  WorkStore,
  [],
  [],
  CharacterSlice
> = (set, get) => ({
  createRegistryCharacter: (worldId, input): string => {
    const id = newId('chr');
    const ts = nowISO();
    const entry: CharacterRegistryEntry = {
      id,
      worldId,
      name: input.name.trim() || '未命名角色',
      archetype: input.archetype?.trim() || '待设定',
      summary: input.summary,
      tags: input.tags ?? [],
      richText: input.richText,
      inContext: input.inContext ?? true,
      createdAt: ts,
      updatedAt: ts,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        characterRegistry: { ...b.characterRegistry, [id]: entry },
      })),
    );
    return id;
  },

  updateRegistryCharacter: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.characterRegistry[id];
        if (!old) return b;
        return {
          ...b,
          characterRegistry: {
            ...b.characterRegistry,
            [id]: { ...old, ...patch, updatedAt: nowISO() },
          },
        };
      }),
    );
  },

  removeRegistryCharacter: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const characterRegistry = { ...b.characterRegistry };
        delete characterRegistry[id];
        // 解除各角色卡对该总库条目的关联（保留本卷化身与心情）
        const characterInstances = { ...b.characterInstances };
        for (const iid of Object.keys(characterInstances)) {
          if (characterInstances[iid].registryId === id) {
            characterInstances[iid] = {
              ...characterInstances[iid],
              registryId: undefined,
            };
          }
        }
        return { ...b, characterRegistry, characterInstances };
      }),
    );
  },

  createCharacterInstance: (worldId, input): string => {
    const id = newId('ci');
    const ts = nowISO();
    // 若来自总库且未显式命名，沿用总库名称
    const provided = input.name?.trim() ?? '';
    let name = provided;
    if (!name && input.registryId) {
      name = get().worlds[worldId]?.characterRegistry[input.registryId]?.name ?? '';
    }
    const inst: CharacterInstance = {
      id,
      worldId,
      bookId: input.bookId,
      registryId: input.registryId,
      name: name || '未命名角色',
      portrait: input.portrait ?? {},
      biography: input.biography,
      currentMood: input.currentMood,
      status: input.status ?? 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        characterInstances: { ...b.characterInstances, [id]: inst },
      })),
    );
    return id;
  },

  updateCharacterInstance: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.characterInstances[id];
        if (!old) return b;
        return {
          ...b,
          characterInstances: {
            ...b.characterInstances,
            [id]: { ...old, ...patch, updatedAt: nowISO() },
          },
        };
      }),
    );
  },

  removeCharacterInstance: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const characterInstances = { ...b.characterInstances };
        delete characterInstances[id];
        // 级联清理该角色卡下的心情节点
        const moodEntries = { ...b.moodEntries };
        for (const mid of Object.keys(moodEntries)) {
          if (moodEntries[mid].characterInstanceId === id) delete moodEntries[mid];
        }
        return { ...b, characterInstances, moodEntries };
      }),
    );
  },

  addMoodEntry: (worldId, input): string => {
    const id = newId('mood');
    const ts = nowISO();
    const world = get().worlds[worldId];
    // 缺省时钟摘要取当前世界时钟
    const clockLabel =
      input.clockLabel ??
      (world ? `${world.clock.era}${world.clock.year}年·${world.clock.season}` : '');
    const entry: MoodEntry = {
      id,
      worldId,
      characterInstanceId: input.characterInstanceId,
      chapterId: input.chapterId,
      eventId: input.eventId,
      clockLabel,
      mood: input.mood.trim() || '平静',
      note: input.note,
      createdAt: ts,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        moodEntries: { ...b.moodEntries, [id]: entry },
      })),
    );
    return id;
  },

  updateMoodEntry: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.moodEntries[id];
        if (!old) return b;
        return {
          ...b,
          moodEntries: {
            ...b.moodEntries,
            [id]: { ...old, ...patch },
          },
        };
      }),
    );
  },

  removeMoodEntry: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const moodEntries = { ...b.moodEntries };
        delete moodEntries[id];
        return { ...b, moodEntries };
      }),
    );
  },
});
