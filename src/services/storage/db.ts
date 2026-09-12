import Dexie, { type Table } from 'dexie';
import type { WorldBundle } from '../../store/types';

/**
 * Dexie（IndexedDB）持久化层。
 * 以"世界聚合 WorldBundle"为最小存储单元，按 world.id 作主键，支持离线优先与大世界观。
 */
export class WorldNovelDB extends Dexie {
  worldBundles!: Table<WorldBundle, string>;

  constructor() {
    super('world_novel_editor');
    // 主键路径为 world.id；额外索引 world.name 便于检索
    this.version(1).stores({
      worldBundles: 'world.id, world.name',
    });
  }
}

export const db = new WorldNovelDB();
