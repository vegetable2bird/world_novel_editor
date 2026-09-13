import type {
  World,
  WorldEntity,
  EntityRelation,
  Variable,
  Foreshadow,
} from '../types/world';
import type { TimelineEvent, WorldStateSnapshot } from '../types/timeline';
import type { Operation, OperationResult, DirectionOption } from '../types/console';
import type { Book } from '../types/book';
import type { Chapter, ChapterVersion } from '../types/chapter';
import type { StyleConfig } from '../types/style';
import type { AIGenerationRecord } from '../types/ai';
import type {
  CharacterRegistryEntry,
  CharacterInstance,
  MoodEntry,
} from '../types/character';
// 重新导出 Book 等类型，便于其他模块从 store/types 统一引用
export type { Book } from '../types/book';
export type {
  CharacterRegistryEntry,
  CharacterInstance,
  MoodEntry,
} from '../types/character';

/** 关系图节点坐标（内部使用，不参与对外契约）。 */
export interface XYPosition {
  x: number;
  y: number;
}

/** 世界"时钟"（操作台推进时间的累积状态，内部状态）。 */
export interface WorldClock {
  era: string;
  year: number;
  season: string;
}

/**
 * 单个世界的完整数据聚合（单一真相来源）。
 * 所有域（实体/关系/变量/章节/风格/生成记录…）都以该 worldId 为键收纳于此。
 * 视图层只经 useWorkStore 读写此结构，禁止组件内私藏世界状态。
 */
export interface WorldBundle {
  world: World;
  clock: WorldClock;
  entities: Record<string, WorldEntity>;
  relations: Record<string, EntityRelation>;
  variables: Record<string, Variable>;
  foreshadows: Record<string, Foreshadow>;
  timelineEvents: Record<string, TimelineEvent>;
  snapshots: Record<string, WorldStateSnapshot>;
  operations: Record<string, Operation>;
  /** 最近一次操作推演结果（供生成链路组装 operationBlock） */
  lastOperationResult?: OperationResult;
  /** 最近一次推演推荐的走向选项 */
  directionOptions: DirectionOption[];
  /** 作者选定的走向 id */
  selectedDirectionId?: string;
  chapters: Record<string, Chapter>;
  chapterVersions: Record<string, ChapterVersion>;
  /** 作品（卷）：World 与 Chapter 之间的中间层，一部作品归属一个世界 */
  books: Record<string, Book>;
  /** 角色总库（宏观）：跨书出演的角色条目，归属世界 */
  characterRegistry: Record<string, CharacterRegistryEntry>;
  /** 角色卡（微观）：某一作品内的具体化身，归属作品（卷） */
  characterInstances: Record<string, CharacterInstance>;
  /** 心情时间线节点，归属角色卡 */
  moodEntries: Record<string, MoodEntry>;
  styleConfigs: Record<string, StyleConfig>;
  generationRecords: Record<string, AIGenerationRecord>;
  /** 关系图节点坐标缓存 */
  graphPositions: Record<string, XYPosition>;
}

/** 构造一个空的世界数据聚合。 */
export function emptyBundle(world: World): WorldBundle {
  return {
    world,
    clock: { era: '启元', year: 1, season: '春' },
    entities: {},
    relations: {},
    variables: {},
    foreshadows: {},
    timelineEvents: {},
    snapshots: {},
    operations: {},
    directionOptions: [],
    chapters: {},
    chapterVersions: {},
    books: {},
    characterRegistry: {},
    characterInstances: {},
    moodEntries: {},
    styleConfigs: {},
    generationRecords: {},
    graphPositions: {},
  };
}

/** 全局 store 的基础状态。 */
export interface WorkState {
  currentWorldId: string | null;
  /** 当前激活的作品（Book）id；同一时刻仅一部作品承接章节操作与生成 */
  currentBookId: string | null;
  worlds: Record<string, WorldBundle>;
}

// 各 slice 接口在对应 slice 文件中定义，这里仅做前向类型声明以避免循环依赖问题。
// 实际 WorkStore 类型在 workStore.ts 中由 5 个 slice 组合而成。
export interface WorldSlice {
  createWorld: (name: string, description?: string) => string;
  updateWorldMeta: (
    worldId: string,
    patch: Partial<Pick<World, 'name' | 'description'>>,
  ) => void;
  deleteWorld: (worldId: string) => void;
  addEntity: (worldId: string, input: import('../types/world').NewEntityInput) => string;
  updateEntity: (
    worldId: string,
    id: string,
    patch: Partial<WorldEntity>,
  ) => void;
  removeEntity: (worldId: string, id: string) => void;
  addRelation: (
    worldId: string,
    input: import('../types/world').NewRelationInput,
  ) => string;
  updateRelation: (
    worldId: string,
    id: string,
    patch: Partial<EntityRelation>,
  ) => void;
  removeRelation: (worldId: string, id: string) => void;
  setEntityPosition: (
    worldId: string,
    id: string,
    pos: XYPosition,
  ) => void;
  addVariable: (
    worldId: string,
    input: import('../types/world').NewVariableInput,
  ) => string;
  updateVariable: (
    worldId: string,
    id: string,
    patch: Partial<Variable>,
  ) => void;
  removeVariable: (worldId: string, id: string) => void;
  addForeshadow: (
    worldId: string,
    input: import('../types/world').NewForeshadowInput,
  ) => string;
  updateForeshadow: (
    worldId: string,
    id: string,
    patch: Partial<Foreshadow>,
  ) => void;
  removeForeshadow: (worldId: string, id: string) => void;
}

export interface ConsoleSlice {
  runOperation: (
    worldId: string,
    input: import('../types/console').NewOperationInput,
  ) => OperationResult;
  selectDirection: (worldId: string, directionId: string) => void;
  logEvent: (
    worldId: string,
    event: {
      title: string;
      description: string;
      type?: TimelineEvent['type'];
      causedByOperationId?: string;
      chapterId?: string;
    },
  ) => string;
  advanceClock: (worldId: string, years?: number, season?: string) => void;
}

export interface ChapterSlice {
  createChapter: (
    worldId: string,
    input: import('../types/chapter').NewChapterInput,
  ) => string;
  updateChapter: (
    worldId: string,
    id: string,
    patch: Partial<Chapter>,
  ) => void;
  removeChapter: (worldId: string, id: string) => void;
  saveChapterVersion: (
    worldId: string,
    chapterId: string,
    input: {
      content: string;
      source: ChapterVersion['source'];
      note?: string;
      generationRecordId?: string;
    },
  ) => string;
  setCurrentVersion: (
    worldId: string,
    chapterId: string,
    versionId: string,
  ) => void;
}

export interface BookSlice {
  /** 在世界下新建一部作品（卷） */
  createBook: (
    worldId: string,
    input: import('../types/book').NewBookInput,
  ) => string;
  /** 更新作品元数据（名称/描述/排序） */
  updateBook: (
    worldId: string,
    id: string,
    patch: Partial<Book>,
  ) => void;
  /** 删除作品，并级联清理其下的章节、版本与生成记录 */
  removeBook: (worldId: string, id: string) => void;
  /** 切换当前激活作品（仅当其属于该世界时生效） */
  setCurrentBook: (worldId: string, bookId: string) => void;
}

export interface StyleSlice {
  getGlobalStyle: (worldId: string) => StyleConfig | undefined;
  upsertGlobalStyle: (
    worldId: string,
    patch: Partial<StyleConfig>,
  ) => string;
  updateStyleConfig: (
    worldId: string,
    id: string,
    patch: Partial<StyleConfig>,
  ) => void;
}

export interface CharacterSlice {
  /** 在总库新建角色条目（跨书） */
  createRegistryCharacter: (
    worldId: string,
    input: import('../types/character').NewRegistryCharacterInput,
  ) => string;
  updateRegistryCharacter: (
    worldId: string,
    id: string,
    patch: Partial<CharacterRegistryEntry>,
  ) => void;
  removeRegistryCharacter: (worldId: string, id: string) => void;

  /** 在指定作品（卷）新建角色卡（可关联总库条目实现跨书出演） */
  createCharacterInstance: (
    worldId: string,
    input: import('../types/character').NewCharacterInstanceInput,
  ) => string;
  updateCharacterInstance: (
    worldId: string,
    id: string,
    patch: Partial<CharacterInstance>,
  ) => void;
  removeCharacterInstance: (worldId: string, id: string) => void;

  /** 为角色卡新增一条心情时间线节点 */
  addMoodEntry: (
    worldId: string,
    input: import('../types/character').NewMoodEntryInput,
  ) => string;
  updateMoodEntry: (
    worldId: string,
    id: string,
    patch: Partial<MoodEntry>,
  ) => void;
  removeMoodEntry: (worldId: string, id: string) => void;
}

export interface GenerationSlice {
  generating: boolean;
  offlineMode: boolean;
  lastGenerationError?: string;
  generateChapter: (
    worldId: string,
    opts?: import('../types/ai').GenerateChapterOptions,
  ) => Promise<string | null>;
  clearOfflineMode: () => void;
  clearGenerationError: () => void;
}

export type WorkStore = WorkState &
  WorldSlice &
  ConsoleSlice &
  ChapterSlice &
  BookSlice &
  CharacterSlice &
  StyleSlice &
  GenerationSlice;
