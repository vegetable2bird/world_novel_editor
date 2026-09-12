import { nanoid } from 'nanoid';

/**
 * 统一 ID 生成（nanoid 封装）。所有实体/章节/事件唯一 ID 均经此函数。
 * @param prefix 可选前缀，便于调试时辨识对象类型（如 'ent' 'op' 'ch'）
 */
export function newId(prefix = ''): string {
  const id = nanoid(12);
  return prefix ? `${prefix}_${id}` : id;
}

/** 统一 ISO 8601 UTC 时间字符串。 */
export function nowISO(): string {
  return new Date().toISOString();
}
