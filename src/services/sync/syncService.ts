import type { WorldBundle } from '../../store/types';

/**
 * 云同步服务（P1 实现，v1 留桩）。
 *
 * 本地以 worldId 为根、Dexie 存全量；此处预留 push/pull 接口，
 * P1 接入云端后实现"最后写入优先 + 快照可回溯"的冲突策略。
 */
export interface SyncPatch {
  worldId: string;
  bundle: WorldBundle;
  updatedAt: string;
}

export interface SyncService {
  push(patch: SyncPatch): Promise<void>;
  pull(since: string): Promise<SyncPatch[]>;
  isEnabled(): boolean;
}

class StubSyncService implements SyncService {
  isEnabled(): boolean {
    return false;
  }
  async push(_patch: SyncPatch): Promise<void> {
    // v1 不实现云同步：仅记录意图，不抛错。
    console.info('[sync] stub: push 已调用，但未启用云同步（P1 接入）');
  }
  async pull(_since: string): Promise<SyncPatch[]> {
    return [];
  }
}

export const syncService: SyncService = new StubSyncService();
