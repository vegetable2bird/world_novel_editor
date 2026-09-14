import type { EntityType } from '../types/world';
import type { StyleConfig } from '../types/style';

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

/**
 * 世界模板（v2 P5）：新建世界时可套用的"开局预设"。
 * 用于快速起一个调性一致的世界，免去从零配变量/风格/基础实体的重复劳动。
 */

/** 模板中预置实体的精简定义（字段缺省时按实体类型填充）。 */
export interface SeedEntityDef {
  type: EntityType;
  name: string;
  summary?: string;
  fields?: Record<string, unknown>;
}

/** 单个世界模板的完整定义。 */
export interface WorldTemplateDef {
  key: string;
  name: string;
  description: string;
  /** 默认作品（卷）名 */
  bookName: string;
  /** 预置世界变量（覆盖默认国力/民心/灵气） */
  variables: Array<{ key: string; name: string; value: number; min: number; max: number }>;
  /** 预置全局风格（仅取描写相关维度） */
  style: Pick<StyleConfig, 'tone' | 'pov' | 'pacing' | 'rhetoric'>;
  /** 开局预置实体（地理/势力/种族/人物…） */
  seedEntities: SeedEntityDef[];
}

/** 世界模板库：四套常见调性预设。 */
export const WORLD_TEMPLATES: Record<string, WorldTemplateDef> = {
  epicFantasy: {
    key: 'epicFantasy',
    name: '史诗西幻',
    description: '北境霜原与修真宗门，国力/民心/灵气三变量驱动的经典奇幻开局。',
    bookName: '主线',
    variables: [
      { key: 'power', name: '国力', value: 50, min: 0, max: 100 },
      { key: 'morale', name: '民心', value: 50, min: 0, max: 100 },
      { key: 'spirit', name: '灵气', value: 50, min: 0, max: 100 },
    ],
    style: {
      tone: '史诗奇幻',
      pov: '第三人称限知',
      pacing: '张弛有度',
      rhetoric: '重白描、少堆砌比喻',
    },
    seedEntities: [
      { type: 'geography', name: '北境·霜原', summary: '终年飘雪的边陲冻土。' },
      { type: 'faction', name: '玄天宗', summary: '执牛耳的修真大宗。' },
      { type: 'race', name: '精灵', summary: '栖于古林的先天族裔。' },
      { type: 'character', name: '叶凡', summary: '出身寒微的少年修士。' },
    ],
  },
  urban: {
    key: 'urban',
    name: '现代都市',
    description: '流量/口碑/资本驱动的现代都市群像。',
    bookName: '主线',
    variables: [
      { key: 'traffic', name: '流量', value: 50, min: 0, max: 100 },
      { key: 'repute', name: '口碑', value: 50, min: 0, max: 100 },
      { key: 'capital', name: '资本', value: 50, min: 0, max: 100 },
    ],
    style: {
      tone: '现代都市写实',
      pov: '第三人称限知',
      pacing: '明快紧凑',
      rhetoric: '口语化、贴近生活',
    },
    seedEntities: [
      { type: 'geography', name: '临海市', summary: '故事发生的滨海大都市。' },
      { type: 'faction', name: '陈氏集团', summary: '盘踞商界的资本巨头。' },
      { type: 'character', name: '林夏', summary: '初入职场的新媒体编辑。' },
    ],
  },
  scifi: {
    key: 'scifi',
    name: '科幻废土',
    description: '科技/辐射/资源约束下的末世废墟叙事。',
    bookName: '主线',
    variables: [
      { key: 'tech', name: '科技', value: 40, min: 0, max: 100 },
      { key: 'radiation', name: '辐射', value: 30, min: 0, max: 100 },
      { key: 'resource', name: '资源', value: 50, min: 0, max: 100 },
    ],
    style: {
      tone: '冷峻科幻',
      pov: '第三人称全知',
      pacing: '张弛有度',
      rhetoric: '克制、重逻辑与细节',
    },
    seedEntities: [
      { type: 'geography', name: '废土·第七区', summary: '文明崩塌后的辐射禁区。' },
      { type: 'faction', name: '拾荒者联盟', summary: '在废墟中求生的松散共同体。' },
      { type: 'character', name: '凯', summary: '携带旧世界记忆的拾荒者。' },
    ],
  },
  wuxia: {
    key: 'wuxia',
    name: '武侠江湖',
    description: '声望/内力/侠名交织的传统武侠世界。',
    bookName: '主线',
    variables: [
      { key: 'fame', name: '声望', value: 50, min: 0, max: 100 },
      { key: 'inner', name: '内力', value: 50, min: 0, max: 100 },
      { key: 'chivalry', name: '侠名', value: 50, min: 0, max: 100 },
    ],
    style: {
      tone: '古典武侠',
      pov: '第三人称限知',
      pacing: '张弛有度',
      rhetoric: '半文半白、重意境',
    },
    seedEntities: [
      { type: 'geography', name: '江南·听雨楼', summary: '江湖人聚散的酒楼客栈。' },
      { type: 'faction', name: '丐帮', summary: '弟子遍布天下的江湖大帮。' },
      { type: 'character', name: '沈浪', summary: '浪迹天涯的少年侠客。' },
    ],
  },
};

/** 新建世界时的默认模板（无显式选择时套用）。 */
export const DEFAULT_TEMPLATE_KEY = 'epicFantasy';
