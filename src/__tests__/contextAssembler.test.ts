import { describe, it, expect } from 'vitest';
import { assembleContext } from '../services/ai/contextAssembler';
import { emptyBundle } from '../store/types';
import type { World } from '../types/world';

function mkWorld(): World {
  return { id: 'w', name: '界', createdAt: 't', updatedAt: 't' };
}

/** 造一个超长世界观：少量 inContext 实体 + 大量 out-of-context 实体（长内容）。 */
function makeHugeBundle(maxOut = 25): ReturnType<typeof emptyBundle> {
  const b = emptyBundle(mkWorld());
  // inContext 实体（短，应被优先保留）
  b.entities['in1'] = { id: 'in1', worldId: 'w', type: 'faction', name: '玄天宗', summary: '正道魁首', fields: {}, tags: [], inContext: true, createdAt: 't', updatedAt: 't' };
  b.entities['in2'] = { id: 'in2', worldId: 'w', type: 'character', name: '叶凡', summary: '主角', fields: {}, tags: [], inContext: true, createdAt: 't', updatedAt: 't' };
  // out-of-context 实体（长内容，用于撑爆上下文预算）
  const longSummary = '背景设定'.repeat(60); // 约 240 字
  for (let i = 0; i < maxOut; i++) {
    const id = `out${i}`;
    b.entities[id] = { id, worldId: 'w', type: 'faction', name: `背景势力${i}`, summary: longSummary, fields: {}, tags: [], inContext: false, createdAt: 't', updatedAt: 't' };
  }
  return b;
}

describe('contextAssembler', () => {
  it('小型上下文不被截断', () => {
    const b = emptyBundle(mkWorld());
    b.entities['in1'] = { id: 'in1', worldId: 'w', type: 'faction', name: '玄天宗', summary: '正道', fields: {}, tags: [], inContext: true, createdAt: 't', updatedAt: 't' };
    b.entities['out1'] = { id: 'out1', worldId: 'w', type: 'faction', name: '魔教', summary: '邪道', fields: {}, tags: [], inContext: false, createdAt: 't', updatedAt: 't' };
    const ctx = assembleContext(b);
    expect(ctx).not.toContain('上下文已截断');
    expect(ctx).toContain('玄天宗');
    expect(ctx).toContain('魔教');
  });

  it('超长上下文被截断且不丢 inContext 实体', () => {
    const b = makeHugeBundle(25);
    const ctx = assembleContext(b, { maxWords: 100 });
    // 1) 已截断（带标记）
    expect(ctx).toContain('上下文已截断');
    // 2) inContext 实体必须保留（相关性最高，排在最前）
    expect(ctx).toContain('玄天宗');
    expect(ctx).toContain('叶凡');
    // 3) inContext 实体排在背景实体之前（优先级）
    expect(ctx.indexOf('玄天宗')).toBeLessThan(ctx.indexOf('背景实体'));
    // 4) 超量部分确实被截断：并非所有 out-of-context 名称都保留
    const outNames = Array.from({ length: 25 }, (_, i) => `背景势力${i}`);
    const presentCount = outNames.filter((n) => ctx.includes(n)).length;
    expect(presentCount).toBeLessThan(outNames.length);
  });

  it('已回收（resolved）伏笔不进入上下文', () => {
    const b = emptyBundle(mkWorld());
    b.foreshadows['f1'] = { id: 'f1', worldId: 'w', title: '伏笔一', status: 'active', createdAt: 't', updatedAt: 't' };
    b.foreshadows['f2'] = { id: 'f2', worldId: 'w', title: '伏笔二', status: 'resolved', createdAt: 't', updatedAt: 't' };
    const ctx = assembleContext(b, { maxWords: 10000 });
    expect(ctx).toContain('伏笔一');
    expect(ctx).not.toContain('伏笔二');
  });

  it('空世界产出不含截断标记', () => {
    const b = emptyBundle(mkWorld());
    const ctx = assembleContext(b);
    expect(ctx).not.toContain('上下文已截断');
  });
});
