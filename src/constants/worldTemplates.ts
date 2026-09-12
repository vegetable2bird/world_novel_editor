import type { EntityType } from '../types/world';

/**
 * 实体类型默认模板：标签、默认字段、默认摘要。
 * 用于 EntityForm 渲染类型专属字段，以及新建实体时的默认值。
 */

export interface FieldDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'textarea';
  placeholder?: string;
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  geography: '地理',
  faction: '势力',
  race: '种族',
  character: '人物',
  timeline: '时间线',
  rule: '规则',
};

export const ENTITY_TYPE_ORDER: EntityType[] = [
  'geography',
  'faction',
  'race',
  'character',
  'timeline',
  'rule',
];

export const ENTITY_TYPE_FIELDS: Record<EntityType, FieldDef[]> = {
  geography: [
    { key: 'region', label: '区域', kind: 'text', placeholder: '如：北境·霜原' },
    { key: 'climate', label: '气候', kind: 'text', placeholder: '如：终年飘雪' },
    { key: 'landscape', label: '风貌', kind: 'textarea', placeholder: '地理特征描述' },
  ],
  faction: [
    { key: 'rank', label: '等级', kind: 'text', placeholder: '如上三宗 / 王朝' },
    { key: 'territory', label: '领地', kind: 'text', placeholder: '势力范围' },
    { key: 'doctrine', label: '教义 / 宗旨', kind: 'textarea', placeholder: '核心理念' },
  ],
  race: [
    { key: 'traits', label: '特征', kind: 'textarea', placeholder: '种族天赋/外貌' },
    { key: 'lifespan', label: '寿命', kind: 'text', placeholder: '如：千年' },
  ],
  character: [
    { key: 'title', label: '称号', kind: 'text', placeholder: '如：剑痴' },
    { key: 'age', label: '年龄', kind: 'number', placeholder: '0' },
    { key: 'cultivation', label: '修为 / 境界', kind: 'text', placeholder: '如：化神期' },
  ],
  timeline: [
    { key: 'era', label: '纪元', kind: 'text', placeholder: '如：天启' },
    { key: 'year', label: '年份', kind: 'number', placeholder: '0' },
  ],
  rule: [
    { key: 'scope', label: '作用范围', kind: 'text', placeholder: '如：全域' },
    { key: 'effect', label: '效果', kind: 'textarea', placeholder: '规则描述' },
  ],
};

/** 新建实体时的默认结构化字段（按类型填充空值）。 */
export function defaultFieldsFor(type: EntityType): Record<string, unknown> {
  const defs = ENTITY_TYPE_FIELDS[type];
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    out[d.key] = d.kind === 'number' ? 0 : '';
  }
  return out;
}

/** 新建实体时的默认摘要。 */
export function defaultSummaryFor(type: EntityType): string {
  return `（待补充的${ENTITY_TYPE_LABELS[type]}设定）`;
}

/** 新建世界时预置的默认变量（国力/民心/灵气），便于操作台即时可用。 */
export const DEFAULT_VARIABLES: Array<{ key: string; name: string; value: number; min: number; max: number }> = [
  { key: 'power', name: '国力', value: 50, min: 0, max: 100 },
  { key: 'morale', name: '民心', value: 50, min: 0, max: 100 },
  { key: 'spirit', name: '灵气', value: 50, min: 0, max: 100 },
];

/** 关系类型候选（用于关系图下拉与操作台外交）。 */
export const RELATION_TYPE_OPTIONS: string[] = [
  '敌对',
  '同盟',
  '从属',
  '亲属',
  '师徒',
  '爱慕',
  '贸易',
  '中立',
];
