import type { StateCreator } from 'zustand';
import type { WorkStore, ConsoleSlice } from './types';
import type { Operation, OperationResult, DirectionOption } from '../types/console';
import type { TimelineEvent, WorldStateSnapshot } from '../types/timeline';
import type { Variable } from '../types/world';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';
import { narrate } from '../services/narrative/narrativeEngine';

const SEASONS = ['春', '夏', '秋', '冬'];

/** 简单字符串哈希（用于关系图快照，避免引入额外依赖）。 */
function hashRelations(relations: Record<string, { type: string; sourceId: string; targetId: string }>): string {
  const s = Object.values(relations)
    .map((r) => `${r.sourceId}>${r.targetId}:${r.type}`)
    .sort()
    .join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/**
 * 操作台 Slice：执行操作 -> 调用叙事引擎推演 -> 落地事件/变量/走向/快照。
 */
export const createConsoleSlice: StateCreator<WorkStore, [], [], ConsoleSlice> = (set, get) => ({
  runOperation: (worldId: string, input): OperationResult => {
    const bundle = get().worlds[worldId];
    if (!bundle) {
      throw new Error('世界不存在，无法执行操作');
    }

    const operation: Operation = {
      id: newId('op'),
      worldId,
      kind: input.kind,
      payload: input.payload,
      label: input.label,
      createdAt: nowISO(),
    };

    const result = narrate(operation, bundle);

    set((state) =>
      withBundle(state, worldId, (b) => {
        // 1) 记录操作
        const operations = { ...b.operations, [operation.id]: operation };

        // 2) 写入推演产生的新事件
        const timelineEvents = { ...b.timelineEvents };
        for (const ev of result.newEvents) {
          timelineEvents[ev.id] = ev;
        }

        // 3) 应用变量变化（含上下限钳制）
        const variables = { ...b.variables };
        for (const [vid, delta] of Object.entries(result.variableDeltas)) {
          const v: Variable | undefined = variables[vid];
          if (v) {
            let next = v.value + delta;
            if (typeof v.min === 'number') next = Math.max(v.min, next);
            if (typeof v.max === 'number') next = Math.min(v.max, next);
            variables[vid] = { ...v, value: next };
          }
        }

        // 4) 推进世界时钟（advanceTime 场景）
        let clock = b.clock;
        if (operation.kind === 'advanceTime') {
          const years = (operation.payload.years as number) || 1;
          const season = (operation.payload.season as string) || '';
          const seasonIdx = SEASONS.indexOf(clock.season);
          const nextSeasonIdx = season
            ? SEASONS.indexOf(season)
            : (seasonIdx + years) % SEASONS.length;
          const advancedYears = season ? clock.year + years : clock.year + years;
          clock = {
            era: clock.era,
            year: advancedYears,
            season: SEASONS[nextSeasonIdx] ?? clock.season,
          };
        }

        // 5) 推荐走向与选定
        const directionOptions: DirectionOption[] = result.proposedDirections;
        const selectedDirectionId = directionOptions[0]?.id;

        // 6) 状态快照（支持回溯/分支，P1 强化）
        const snapshot: WorldStateSnapshot = {
          id: newId('snap'),
          worldId,
          label: `操作后 · ${operation.label}`,
          variables: Object.fromEntries(
            Object.values(variables).map((v) => [v.key, v.value]),
          ),
          relationsHash: hashRelations(b.relations),
          entitiesCount: Object.keys(b.entities).length,
          createdAt: nowISO(),
        };
        const snapshots = { ...b.snapshots, [snapshot.id]: snapshot };

        return {
          ...b,
          clock,
          operations,
          timelineEvents,
          variables,
          directionOptions,
          selectedDirectionId,
          lastOperationResult: result,
          snapshots,
        };
      }),
    );

    return result;
  },

  selectDirection: (worldId: string, directionId: string) => {
    set((state) =>
      withBundle(state, worldId, (b) => ({ ...b, selectedDirectionId: directionId })),
    );
  },

  logEvent: (worldId, event) => {
    const id = newId('ev');
    const bundle = get().worlds[worldId];
    const ev: TimelineEvent = {
      id,
      worldId,
      title: event.title,
      description: event.description,
      type: event.type ?? 'manual',
      causedByOperationId: event.causedByOperationId,
      chapterId: event.chapterId,
      era: bundle?.clock.era,
      year: bundle?.clock.year,
      season: bundle?.clock.season,
      createdAt: nowISO(),
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        timelineEvents: { ...b.timelineEvents, [id]: ev },
      })),
    );
    return id;
  },

  advanceClock: (worldId, years = 1, season) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const seasonIdx = SEASONS.indexOf(b.clock.season);
        const nextIdx = season
          ? SEASONS.indexOf(season)
          : (seasonIdx + years) % SEASONS.length;
        return {
          ...b,
          clock: {
            era: b.clock.era,
            year: b.clock.year + years,
            season: SEASONS[nextIdx] ?? b.clock.season,
          },
        };
      }),
    );
  },
});
