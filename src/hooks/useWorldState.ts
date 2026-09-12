import { useWorkStore, selectCurrentBundle, selectCurrentWorldId } from '../store/workStore';
import type { WorldBundle } from '../store/types';

/** 当前选中的世界 id（可能为 null）。 */
export function useCurrentWorldId(): string | null {
  return useWorkStore(selectCurrentWorldId);
}

/** 当前世界的数据聚合（单一真相来源）。 */
export function useCurrentWorld(): WorldBundle | undefined {
  return useWorkStore(selectCurrentBundle);
}
