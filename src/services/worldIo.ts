/**
 * 世界导入 / 导出（v2 P5「商业就绪」能力）。
 *
 * - serializeWorld / parseWorld：把整个 WorldBundle 序列化为带导出标记的 JSON，
 *   并在解析时做结构校验，保证导入的是本应用导出的合法世界。
 * - importWorldBundle：解析后**双遍重映射所有 id**（世界/实体/关系/变量/伏笔/事件/
 *   快照/操作/走向/章节/版本/作品/角色总库/角色卡/心情/风格/生成记录/关系图坐标），
 *   并修复全部引用字段，最终以全新 id 落库，避免与现有世界 id 冲突。
 *
 * 设计取舍：导入生成全新 id 而非覆盖，因此同一份导出可反复导入为独立副本，
 * 天然支持「模板分发 / 备份还原 / 世界分享」。
 */
import type { WorldBundle } from '../store/types';
import type {
  WorldEntity,
  EntityRelation,
  Variable,
  Foreshadow,
} from '../types/world';
import type { TimelineEvent, WorldStateSnapshot } from '../types/timeline';
import type { OperationResult, DirectionOption, Operation } from '../types/console';
import type { Chapter, ChapterVersion } from '../types/chapter';
import type { Book } from '../types/book';
import type {
  CharacterRegistryEntry,
  CharacterInstance,
  MoodEntry,
} from '../types/character';
import type { StyleConfig } from '../types/style';
import type { AIGenerationRecord } from '../types/ai';
import { newId } from '../utils/id';
import { downloadText } from '../utils/file';
import { useWorkStore } from '../store/workStore';

const EXPORT_TAG = '__worldNovelEditor__';
const EXPORT_VERSION = 1;

interface ExportEnvelope {
  tag: string;
  version: number;
  exportedAt: string;
  bundle: WorldBundle;
}

/** 序列化世界为带标记的可读 JSON 字符串。 */
export function serializeWorld(bundle: WorldBundle): string {
  const envelope: ExportEnvelope = {
    tag: EXPORT_TAG,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    bundle,
  };
  return JSON.stringify(envelope, null, 2);
}

/** 解析导出 JSON；非法 / 非本应用导出文件时抛出可读错误。 */
export function parseWorld(json: string): WorldBundle {
  let data: Partial<ExportEnvelope>;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('文件不是合法的 JSON。');
  }
  if (!data || data.tag !== EXPORT_TAG || !data.bundle || !data.bundle.world) {
    throw new Error('文件不是「世界小说编辑器」的导出文件（缺少导出标记或 world 字段）。');
  }
  const b = data.bundle;
  if (typeof b.world.id !== 'string' || typeof b.world.name !== 'string') {
    throw new Error('文件结构不完整：缺少 world.id / world.name。');
  }
  return b;
}

/** 把当前世界导出为 JSON 文件下载。 */
export function exportWorldToFile(worldId: string): void {
  const b = useWorkStore.getState().worlds[worldId];
  if (!b) throw new Error('世界不存在，无法导出。');
  const json = serializeWorld(b);
  const safe = b.world.name.replace(/[^\w一-龥-]/g, '_');
  downloadText(`世界_${safe}.json`, json, 'application/json;charset=utf-8');
}

/**
 * 双遍重映射：第一遍为所有 id 生成新值并登记映射；
 * 第二遍重建 bundle 并把引用字段改写为新 id。
 * 这样可避免集合间相互引用导致的顺序依赖（如 chapter<->chapterVersion 双向引用）。
 */
function remapBundleIds(b: WorldBundle): WorldBundle {
  const idMap: Record<string, string> = {};
  const register = (oldId: string | undefined, prefix: string): string => {
    const nid = newId(prefix);
    if (oldId) idMap[oldId] = nid;
    return nid;
  };
  const map = (oldId: string | undefined): string | undefined =>
    oldId ? idMap[oldId] ?? oldId : oldId;

  // —— 第一遍：登记所有 id ——
  const newWorldId = register(b.world.id, 'world');
  for (const e of Object.keys(b.entities)) register(e, 'ent');
  for (const e of Object.keys(b.relations)) register(e, 'rel');
  for (const e of Object.keys(b.variables)) register(e, 'var');
  for (const e of Object.keys(b.foreshadows)) register(e, 'fs');
  for (const e of Object.keys(b.timelineEvents)) register(e, 'ev');
  for (const e of Object.keys(b.snapshots)) register(e, 'snap');
  for (const e of Object.keys(b.operations)) register(e, 'op');
  for (const d of b.directionOptions) register(d.id, 'dir');
  for (const e of Object.keys(b.chapters)) register(e, 'ch');
  for (const e of Object.keys(b.chapterVersions)) register(e, 'ver');
  for (const e of Object.keys(b.books)) register(e, 'book');
  for (const e of Object.keys(b.characterRegistry)) register(e, 'chr');
  for (const e of Object.keys(b.characterInstances)) register(e, 'ci');
  for (const e of Object.keys(b.moodEntries)) register(e, 'mood');
  for (const e of Object.keys(b.styleConfigs)) register(e, 'style');
  for (const e of Object.keys(b.generationRecords)) register(e, 'gen');
  if (b.lastOperationResult) {
    register(b.lastOperationResult.operationId, 'op');
    for (const d of b.lastOperationResult.proposedDirections) register(d.id, 'dir');
    for (const ev of b.lastOperationResult.newEvents) register(ev.id, 'ev');
  }

  // —— 第二遍：重建引用 ——
  const entities: Record<string, WorldEntity> = {};
  for (const [oid, e] of Object.entries(b.entities)) {
    entities[idMap[oid]] = { ...e, id: idMap[oid], worldId: newWorldId };
  }
  const relations: Record<string, EntityRelation> = {};
  for (const [oid, r] of Object.entries(b.relations)) {
    relations[idMap[oid]] = {
      ...r,
      id: idMap[oid],
      worldId: newWorldId,
      sourceId: map(r.sourceId) ?? r.sourceId,
      targetId: map(r.targetId) ?? r.targetId,
    };
  }
  const variables: Record<string, Variable> = {};
  for (const [oid, v] of Object.entries(b.variables)) {
    variables[idMap[oid]] = { ...v, id: idMap[oid], worldId: newWorldId };
  }
  const foreshadows: Record<string, Foreshadow> = {};
  for (const [oid, f] of Object.entries(b.foreshadows)) {
    foreshadows[idMap[oid]] = {
      ...f,
      id: idMap[oid],
      worldId: newWorldId,
      plantChapterId: map(f.plantChapterId),
    };
  }
  const timelineEvents: Record<string, TimelineEvent> = {};
  for (const [oid, e] of Object.entries(b.timelineEvents)) {
    timelineEvents[idMap[oid]] = {
      ...e,
      id: idMap[oid],
      worldId: newWorldId,
      chapterId: map(e.chapterId),
      causedByOperationId: map(e.causedByOperationId),
    };
  }
  const snapshots: Record<string, WorldStateSnapshot> = {};
  for (const [oid, s] of Object.entries(b.snapshots)) {
    const vars: Record<string, number> = {};
    for (const [vid, val] of Object.entries(s.variables)) vars[map(vid) ?? vid] = val;
    snapshots[idMap[oid]] = {
      ...s,
      id: idMap[oid],
      worldId: newWorldId,
      variables: vars,
    };
  }
  const operations: Record<string, Operation> = {};
  for (const [oid, o] of Object.entries(b.operations)) {
    operations[idMap[oid]] = { ...o, id: idMap[oid], worldId: newWorldId };
  }
  const directionOptions: DirectionOption[] = b.directionOptions.map((d) => ({
    ...d,
    id: idMap[d.id],
  }));
  const chapters: Record<string, Chapter> = {};
  for (const [oid, c] of Object.entries(b.chapters)) {
    chapters[idMap[oid]] = {
      ...c,
      id: idMap[oid],
      worldId: newWorldId,
      bookId: map(c.bookId) ?? c.bookId,
      currentVersionId: map(c.currentVersionId) ?? c.currentVersionId,
    };
  }
  const chapterVersions: Record<string, ChapterVersion> = {};
  for (const [oid, v] of Object.entries(b.chapterVersions)) {
    chapterVersions[idMap[oid]] = {
      ...v,
      id: idMap[oid],
      chapterId: map(v.chapterId) ?? v.chapterId,
    };
  }
  const books: Record<string, Book> = {};
  for (const [oid, bk] of Object.entries(b.books)) {
    books[idMap[oid]] = { ...bk, id: idMap[oid], worldId: newWorldId };
  }
  const characterRegistry: Record<string, CharacterRegistryEntry> = {};
  for (const [oid, e] of Object.entries(b.characterRegistry)) {
    characterRegistry[idMap[oid]] = { ...e, id: idMap[oid], worldId: newWorldId };
  }
  const characterInstances: Record<string, CharacterInstance> = {};
  for (const [oid, c] of Object.entries(b.characterInstances)) {
    characterInstances[idMap[oid]] = {
      ...c,
      id: idMap[oid],
      worldId: newWorldId,
      bookId: map(c.bookId) ?? c.bookId,
      registryId: map(c.registryId),
    };
  }
  const moodEntries: Record<string, MoodEntry> = {};
  for (const [oid, m] of Object.entries(b.moodEntries)) {
    moodEntries[idMap[oid]] = {
      ...m,
      id: idMap[oid],
      worldId: newWorldId,
      characterInstanceId: map(m.characterInstanceId) ?? m.characterInstanceId,
      chapterId: map(m.chapterId),
      eventId: map(m.eventId),
    };
  }
  const styleConfigs: Record<string, StyleConfig> = {};
  for (const [oid, s] of Object.entries(b.styleConfigs)) {
    styleConfigs[idMap[oid]] = { ...s, id: idMap[oid], worldId: newWorldId };
  }
  const generationRecords: Record<string, AIGenerationRecord> = {};
  for (const [oid, g] of Object.entries(b.generationRecords)) {
    generationRecords[idMap[oid]] = {
      ...g,
      id: idMap[oid],
      worldId: newWorldId,
      chapterId: map(g.chapterId) ?? g.chapterId,
    };
  }
  const graphPositions: Record<string, { x: number; y: number }> = {};
  for (const [eid, pos] of Object.entries(b.graphPositions)) {
    graphPositions[map(eid) ?? eid] = pos;
  }

  let lastOperationResult: OperationResult | undefined;
  if (b.lastOperationResult) {
    const r = b.lastOperationResult;
    lastOperationResult = {
      ...r,
      operationId: map(r.operationId) ?? r.operationId,
      affectedEntityIds: r.affectedEntityIds.map((id) => map(id) ?? id),
      variableDeltas: Object.fromEntries(
        Object.entries(r.variableDeltas).map(([k, v]) => [map(k) ?? k, v]),
      ),
      newEvents: r.newEvents.map((ev) => ({
        ...ev,
        id: idMap[ev.id] ?? ev.id,
        chapterId: map(ev.chapterId),
      })),
      proposedDirections: r.proposedDirections.map((d) => ({
        ...d,
        id: idMap[d.id] ?? d.id,
      })),
    };
  }

  return {
    world: { ...b.world, id: newWorldId },
    clock: { ...b.clock },
    entities,
    relations,
    variables,
    foreshadows,
    timelineEvents,
    snapshots,
    operations,
    directionOptions,
    lastOperationResult,
    selectedDirectionId: map(b.selectedDirectionId),
    chapters,
    chapterVersions,
    books,
    characterRegistry,
    characterInstances,
    moodEntries,
    styleConfigs,
    generationRecords,
    graphPositions,
  };
}

/** 解析并导入一个世界（以全新 id 落库），返回新世界 id。导入后自动切换至该世界。 */
export function importWorldBundle(json: string): string {
  const b = parseWorld(json);
  const newBundle = remapBundleIds(b);
  const newWorldId = newBundle.world.id;
  const firstBook = Object.keys(newBundle.books)[0] ?? null;
  useWorkStore.setState((s) => ({
    worlds: { ...s.worlds, [newWorldId]: newBundle },
    currentWorldId: newWorldId,
    currentBookId: firstBook,
  }));
  return newWorldId;
}
