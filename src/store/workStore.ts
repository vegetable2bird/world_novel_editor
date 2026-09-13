import { create } from 'zustand';
import { createWorldSlice } from './worldSlice';
import { createConsoleSlice } from './consoleSlice';
import { createChapterSlice } from './chapterSlice';
import { createBookSlice } from './bookSlice';
import { createCharacterSlice } from './characterSlice';
import { createStyleSlice } from './styleSlice';
import { createGenerationSlice } from './generationSlice';
import type { WorkStore } from './types';

/**
 * 复合 store（单一真相来源）。
 * 由 7 个 slice（world / console / chapter / book / character / style / generation）组合而成，
 * 所有世界数据以 worldId 为键收纳于 worlds[worldId]（WorldBundle）。
 *
 * 视图层只经 useWorkStore 读写，禁止组件内私藏世界状态。
 */
export const useWorkStore = create<WorkStore>()((...a) => ({
  // 基础状态
  currentWorldId: null,
  currentBookId: null,
  worlds: {},
  // 七个 slice
  ...createWorldSlice(...a),
  ...createConsoleSlice(...a),
  ...createChapterSlice(...a),
  ...createBookSlice(...a),
  ...createCharacterSlice(...a),
  ...createStyleSlice(...a),
  ...createGenerationSlice(...a),
}));

/** 便捷选择器：当前世界 id。 */
export const selectCurrentWorldId = (s: WorkStore): string | null => s.currentWorldId;

/** 便捷选择器：当前世界数据聚合。 */
export const selectCurrentBundle = (s: WorkStore) =>
  s.currentWorldId ? s.worlds[s.currentWorldId] : undefined;
