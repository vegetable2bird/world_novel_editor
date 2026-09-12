import type { StateCreator } from 'zustand';
import type { WorkStore, WorldSlice, WorldBundle } from './types';
import type {
  World,
  WorldEntity,
  EntityRelation,
  Variable,
  Foreshadow,
} from '../types/world';
import type { StyleConfig } from '../types/style';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';
import { emptyBundle } from './types';
import {
  DEFAULT_VARIABLES,
  defaultFieldsFor,
  defaultSummaryFor,
} from '../constants/worldTemplates';

/**
 * 世界观 Slice：世界、实体、关系、变量、伏笔的增删改。
 * 全部以 worldId 为键收纳于 WorldBundle。
 */
export const createWorldSlice: StateCreator<WorkStore, [], [], WorldSlice> = (set, get) => ({
  createWorld: (name: string, description?: string): string => {
    const id = newId('world');
    const ts = nowISO();
    const world: World = {
      id,
      name: name.trim() || '未命名世界',
      description: description ?? '',
      createdAt: ts,
      updatedAt: ts,
    };

    // 构造空 bundle 并预置默认变量与全局风格配置，使操作台/生成开箱即用。
    const bundle: WorldBundle = emptyBundle(world);

    // 默认变量
    for (const v of DEFAULT_VARIABLES) {
      const vid = newId('var');
      const variable: Variable = {
        id: vid,
        worldId: id,
        key: v.key,
        name: v.name,
        value: v.value,
        min: v.min,
        max: v.max,
      };
      bundle.variables[vid] = variable;
    }
    // 默认全局风格配置
    const sid = newId('style');
    const style: StyleConfig = {
      id: sid,
      worldId: id,
      scope: 'global',
      tone: '史诗奇幻',
      pov: '第三人称限知',
      pacing: '张弛有度',
      rhetoric: '重白描、少堆砌比喻',
      forbiddenWritings: [],
      requiredForeshadows: [],
      extra: {},
    };
    bundle.styleConfigs[sid] = style;

    set((state) => ({
      worlds: { ...state.worlds, [id]: bundle },
      currentWorldId: id,
    }));
    return id;
  },

  updateWorldMeta: (worldId, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        world: { ...b.world, ...patch, updatedAt: nowISO() },
      })),
    );
  },

  deleteWorld: (worldId) => {
    set((state) => {
      const worlds = { ...state.worlds };
      delete worlds[worldId];
      const remaining = Object.keys(worlds);
      const currentWorldId =
        state.currentWorldId === worldId
          ? remaining[0] ?? null
          : state.currentWorldId;
      return { worlds, currentWorldId };
    });
  },

  addEntity: (worldId, input) => {
    const id = newId('ent');
    const ts = nowISO();
    const entity: WorldEntity = {
      id,
      worldId,
      type: input.type,
      name: input.name.trim() || '未命名',
      summary: input.summary ?? defaultSummaryFor(input.type),
      fields: input.fields ?? defaultFieldsFor(input.type),
      richText: input.richText,
      tags: input.tags ?? [],
      inContext: input.inContext ?? true,
      createdAt: ts,
      updatedAt: ts,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        entities: { ...b.entities, [id]: entity },
      })),
    );
    return id;
  },

  updateEntity: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.entities[id];
        if (!old) return b;
        return {
          ...b,
          entities: {
            ...b.entities,
            [id]: { ...old, ...patch, updatedAt: nowISO() },
          },
        };
      }),
    );
  },

  removeEntity: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const entities = { ...b.entities };
        delete entities[id];
        // 清理引用该实体的关系
        const relations = { ...b.relations };
        for (const rid of Object.keys(relations)) {
          const r = relations[rid];
          if (r.sourceId === id || r.targetId === id) delete relations[rid];
        }
        const graphPositions = { ...b.graphPositions };
        delete graphPositions[id];
        return { ...b, entities, relations, graphPositions };
      }),
    );
  },

  addRelation: (worldId, input) => {
    const id = newId('rel');
    const relation: EntityRelation = {
      id,
      worldId,
      sourceId: input.sourceId,
      targetId: input.targetId,
      type: input.type,
      label: input.label,
      directed: input.directed ?? true,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        relations: { ...b.relations, [id]: relation },
      })),
    );
    return id;
  },

  updateRelation: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.relations[id];
        if (!old) return b;
        return {
          ...b,
          relations: { ...b.relations, [id]: { ...old, ...patch } },
        };
      }),
    );
  },

  removeRelation: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const relations = { ...b.relations };
        delete relations[id];
        return { ...b, relations };
      }),
    );
  },

  setEntityPosition: (worldId, id, pos) => {
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        graphPositions: { ...b.graphPositions, [id]: pos },
      })),
    );
  },

  addVariable: (worldId, input) => {
    const id = newId('var');
    const variable: Variable = {
      id,
      worldId,
      key: input.key,
      name: input.name,
      value: input.value,
      min: input.min,
      max: input.max,
      unit: input.unit,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        variables: { ...b.variables, [id]: variable },
      })),
    );
    return id;
  },

  updateVariable: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.variables[id];
        if (!old) return b;
        let value = patch.value ?? old.value;
        if (typeof old.min === 'number') value = Math.max(old.min, value);
        if (typeof old.max === 'number') value = Math.min(old.max, value);
        return {
          ...b,
          variables: {
            ...b.variables,
            [id]: { ...old, ...patch, value },
          },
        };
      }),
    );
  },

  removeVariable: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const variables = { ...b.variables };
        delete variables[id];
        return { ...b, variables };
      }),
    );
  },

  addForeshadow: (worldId, input) => {
    const id = newId('fs');
    const ts = nowISO();
    const foreshadow: Foreshadow = {
      id,
      worldId,
      title: input.title.trim() || '未命名伏笔',
      plantChapterId: input.plantChapterId,
      status: input.status ?? 'planted',
      note: input.note,
      createdAt: ts,
      updatedAt: ts,
    } as Foreshadow;
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        foreshadows: { ...b.foreshadows, [id]: foreshadow },
      })),
    );
    return id;
  },

  updateForeshadow: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.foreshadows[id];
        if (!old) return b;
        return {
          ...b,
          foreshadows: {
            ...b.foreshadows,
            [id]: { ...old, ...patch, updatedAt: nowISO() },
          },
        };
      }),
    );
  },

  removeForeshadow: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const foreshadows = { ...b.foreshadows };
        delete foreshadows[id];
        return { ...b, foreshadows };
      }),
    );
  },
});
