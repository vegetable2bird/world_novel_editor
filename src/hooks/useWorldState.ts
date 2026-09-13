import { useWorkStore, selectCurrentBundle, selectCurrentWorldId } from '../store/workStore';
import type { WorldBundle, Book } from '../store/types';

/** 当前选中的世界 id（可能为 null）。 */
export function useCurrentWorldId(): string | null {
  return useWorkStore(selectCurrentWorldId);
}

/** 当前世界的数据聚合（单一真相来源）。 */
export function useCurrentWorld(): WorldBundle | undefined {
  return useWorkStore(selectCurrentBundle);
}

/** 当前激活的作品（Book）id（可能为 null）。 */
export function useCurrentBookId(): string | null {
  return useWorkStore((s) => s.currentBookId);
}

/** 当前激活的作品（Book）对象（可能为 undefined）。 */
export function useCurrentBook(): Book | undefined {
  return useWorkStore((s) => {
    const wid = s.currentWorldId;
    const bid = s.currentBookId;
    if (!wid || !bid) return undefined;
    return s.worlds[wid]?.books[bid];
  });
}
