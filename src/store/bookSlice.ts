import type { StateCreator } from 'zustand';
import type { WorkStore, BookSlice } from './types';
import type { Book } from '../types/book';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';

/**
 * 作品（Book）Slice：管理 World 与 Chapter 之间的中间层。
 * - 新建作品时若当前无激活作品则自动激活，保证主循环开箱即用；
 * - 删除作品会级联清理其下章节、版本与生成记录；
 * - 删除当前激活作品时自动回退到剩余第一部，避免悬空。
 */
export const createBookSlice: StateCreator<WorkStore, [], [], BookSlice> = (set, get) => ({
  createBook: (worldId, input): string => {
    const bundle = get().worlds[worldId];
    if (!bundle) throw new Error('世界不存在，无法创建作品');
    const id = newId('book');
    const ts = nowISO();
    const order = input.order ?? Object.keys(bundle.books).length;
    const book: Book = {
      id,
      worldId,
      name: input.name.trim() || '未命名作品',
      description: input.description,
      order,
      createdAt: ts,
      updatedAt: ts,
    };
    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        books: { ...b.books, [id]: book },
      })),
    );
    // 若当前没有激活作品（例如删空后重建），自动激活新建作品
    if (!get().currentBookId) set({ currentBookId: id });
    return id;
  },

  updateBook: (worldId, id, patch) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const old = b.books[id];
        if (!old) return b;
        return {
          ...b,
          books: {
            ...b.books,
            [id]: { ...old, ...patch, updatedAt: nowISO() },
          },
        };
      }),
    );
  },

  removeBook: (worldId, id) => {
    set((state) =>
      withBundle(state, worldId, (b) => {
        const books = { ...b.books };
        delete books[id];

        // 级联清理该作品下的章节、版本与生成记录
        const chapters = { ...b.chapters };
        const chapterVersions = { ...b.chapterVersions };
        const generationRecords = { ...b.generationRecords };
        for (const [cid, ch] of Object.entries(chapters)) {
          if (ch.bookId !== id) continue;
          delete chapters[cid];
          for (const vid of Object.keys(chapterVersions)) {
            if (chapterVersions[vid].chapterId === cid) delete chapterVersions[vid];
          }
          for (const rid of Object.keys(generationRecords)) {
            if (generationRecords[rid].chapterId === cid) delete generationRecords[rid];
          }
        }
        return { ...b, books, chapters, chapterVersions, generationRecords };
      }),
    );

    // 若删除的是当前激活作品，回退到剩余第一部（无则置空）
    if (get().currentBookId === id) {
      const remaining = Object.keys(get().worlds[worldId]?.books ?? {});
      set({ currentBookId: remaining[0] ?? null });
    }
  },

  setCurrentBook: (worldId, bookId) => {
    const b = get().worlds[worldId];
    if (!b || !b.books[bookId]) return;
    set({ currentBookId: bookId });
  },
});
