import { useEffect, useRef } from 'react';
import { useWorkStore } from '../store/workStore';
import { useCurrentWorldId } from './useWorldState';
import { saveWorldNow } from '../services/storage/persistence';

/**
 * 自动保存 Hook：订阅当前世界数据变化，防抖写回 Dexie。
 * 与 persistence.ts 的全局订阅互为冗余保障，确保切换/编辑时数据不丢失。
 */
export function useAutosave(): void {
  const currentWorldId = useCurrentWorldId();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!currentWorldId) return;
    const unsub = useWorkStore.subscribe((state, prev) => {
      if (state.worlds === prev.worlds) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveWorldNow(currentWorldId);
      }, 800);
    });
    return () => unsub();
  }, [currentWorldId]);
}
