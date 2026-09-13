/**
 * 作品（Book）数据模型。
 *
 * Book 是 World 与 Chapter 之间的中间层：一个 World 可包含多部作品（卷/部），
 * 一部作品包含多章。章节经所属作品归属到世界，从而支撑"一书多卷 / 跨书联动"的 v2 结构。
 */

/** 作品（卷 / 部）：World 1-* Book 1-* Chapter */
export interface Book {
  id: string;
  /** 所属世界 id（冗余归属，便于查询；恒等于所属 World.id） */
  worldId: string;
  name: string;
  description?: string;
  /** 多作品排序权重，决定在作品列表中的先后 */
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** 新建作品的输入载荷 */
export interface NewBookInput {
  name: string;
  description?: string;
  /** 可选：指定排序权重，缺省追加到末尾 */
  order?: number;
}
