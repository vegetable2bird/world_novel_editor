import { db } from './db';
import { useWorkStore } from '../../store/workStore';
import type { WorldBundle } from '../../store/types';

/**
 * store <-> Dexie 订阅同步。
 * - loadFromDB：启动时把已持久化的世界载入 store（首个世界设为当前世界）。
 * - initPersistence：订阅 store 变化，防抖写回 Dexie（localStorage 之外的离线持久）。
 */

/** 从 IndexedDB 载入已持久化世界到内存 store。 */
export async function loadFromDB(): Promise<void> {
  try {
    const bundles = await db.worldBundles.toArray();
    if (bundles.length === 0) return;
    const worlds: Record<string, WorldBundle> = {};
    for (const b of bundles) {
      worlds[b.world.id] = b;
    }
    const firstId = bundles[0].world.id;
    useWorkStore.setState({ worlds, currentWorldId: firstId });
  } catch (err) {
    // 持久层失败不应阻塞应用启动
    console.warn('[persistence] 载入本地数据失败：', err);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** 订阅 store，worlds 变化时防抖写回 Dexie。 */
export function initPersistence(): void {
  useWorkStore.subscribe((state, prev) => {
    if (state.worlds === prev.worlds) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const bundles = Object.values(useWorkStore.getState().worlds);
      for (const b of bundles) {
        void db.worldBundles.put(b);
      }
    }, 600);
  });
}

/** 立即把指定世界写回 Dexie（手动保存/导出前调用）。 */
export async function saveWorldNow(worldId: string): Promise<void> {
  const b = useWorkStore.getState().worlds[worldId];
  if (b) await db.worldBundles.put(b);
}
