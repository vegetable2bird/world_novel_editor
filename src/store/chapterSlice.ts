import type { StateCreator } from 'zustand';
import type { WorkStore, ChapterSlice } from './types';
import type { Chapter, ChapterVersion } from '../types/chapter';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';
import { countWords } from '../utils/text';

/**
 * 章节 Slice：章节与版本管理。每次 AI 生成或人工修订都会新建一个 ChapterVersion，
 * chapter.currentVersionId 指向当前生效版本，支持版本回溯。
 */
export const createChapterSlice: StateCreator<WorkStore, [], [], ChapterSlice> = (set, get) => ({
  createChapter: (worldId, input): string => {
    const bundle = get().worlds[worldId];
    if (!bundle) throw new Error('世界不存在，无法创建章节');
    const id = newId('ch');
    const ts = nowISO();
    const index =
      input.index ??
      Object.values(bundle.chapters).reduce((max, c) => Math.max(max, c.index), 0) + 1;

    // 创建空的初始版本，便于编辑器直接打开
    const versionId = newId('ver');
    const initialVersion: ChapterVersion = {
      id: versionId,
      chapterId: id,
      content: '',
      source: 'human',
      wordCount: 0,
      createdAt: ts,
      note: '初始空白版本',
    };

    const chapter: Chapter = {
      id,
      worldId,
      index,
      title: input.title.trim() || `第 ${index} 章`,
      outline: input.outline,
      currentVersionId: versionId,
      status: 'draft',
      createdAt: ts,
      updatedAt: ts,
    };

    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        chapters: { ...b.chapters, [id]: chapter },
        chapterVersions: { ...b.chapterVersions, [versionId]: initialVersion },
      })),
    );
    return id;
  },

  updateChapter: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.chapters[id];
        if (!old) return b;
        return {
          ...b,
          chapters: {
            ...b.chapters,
            [id]: { ...old, ...patch, updatedAt: nowISO() },
          },
        };
      }),
    );
  },

  removeChapter: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const chapters = { ...b.chapters };
        const removed = chapters[id];
        delete chapters[id];
        // 清理该章节相关版本
        const chapterVersions = { ...b.chapterVersions };
        for (const vid of Object.keys(chapterVersions)) {
          if (chapterVersions[vid].chapterId === id) delete chapterVersions[vid];
        }
        // 清理该章节相关的生成记录与事件关联
        const generationRecords = { ...b.generationRecords };
        for (const rid of Object.keys(generationRecords)) {
          if (generationRecords[rid].chapterId === id) delete generationRecords[rid];
        }
        void removed;
        return { ...b, chapters, chapterVersions, generationRecords };
      }),
    );
  },

  saveChapterVersion: (worldId, chapterId, input): string => {
    const bundle = get().worlds[worldId];
    if (!bundle || !bundle.chapters[chapterId]) {
      throw new Error('章节不存在，无法保存版本');
    }
    const id = newId('ver');
    const ts = nowISO();
    const version: ChapterVersion = {
      id,
      chapterId,
      content: input.content,
      source: input.source,
      generationRecordId: input.generationRecordId,
      wordCount: countWords(input.content),
      createdAt: ts,
      note: input.note,
    };

    set((state) =>
      withBundle(state, worldId, (b) => {
        const chapter = b.chapters[chapterId];
        const status: Chapter['status'] =
          input.source === 'human' ? 'revising' : chapter.status;
        return {
          ...b,
          chapterVersions: { ...b.chapterVersions, [id]: version },
          chapters: {
            ...b.chapters,
            [chapterId]: {
              ...chapter,
              currentVersionId: id,
              status,
              updatedAt: ts,
            },
          },
        };
      }),
    );
    return id;
  },

  setCurrentVersion: (worldId, chapterId, versionId) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const chapter = b.chapters[chapterId];
        const version = b.chapterVersions[versionId];
        if (!chapter || !version || version.chapterId !== chapterId) return b;
        return {
          ...b,
          chapters: {
            ...b.chapters,
            [chapterId]: { ...chapter, currentVersionId: versionId, updatedAt: nowISO() },
          },
        };
      }),
    );
  },
});
