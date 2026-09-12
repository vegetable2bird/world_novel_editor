import { describe, it, expect } from 'vitest';
import { narrate } from '../services/narrative/narrativeEngine';
import { emptyBundle } from '../store/types';
import type { Operation } from '../types/console';
import type { World, WorldEntity, Variable } from '../types/world';

function makeWorld(): World {
  return { id: 'w', name: '测试界', createdAt: 't', updatedAt: 't' };
}

function withBaseVars(b: ReturnType<typeof emptyBundle>): ReturnType<typeof emptyBundle> {
  const power: Variable = { id: 'v_power', worldId: 'w', key: 'power', name: '国力', value: 50, min: 0, max: 100 };
  const morale: Variable = { id: 'v_morale', worldId: 'w', key: 'morale', name: '民心', value: 50, min: 0, max: 100 };
  const spirit: Variable = { id: 'v_spirit', worldId: 'w', key: 'spirit', name: '灵气', value: 50, min: 0, max: 100 };
  b.variables = { v_power: power, v_morale: morale, v_spirit: spirit };
  return b;
}

function addEntity(b: ReturnType<typeof emptyBundle>, id: string, name: string, type: WorldEntity['type'] = 'faction'): void {
  b.entities[id] = {
    id, worldId: 'w', type, name, summary: '摘要', fields: {}, tags: [], inContext: true, createdAt: 't', updatedAt: 't',
  };
}

/** 抽取可确定性比较的内容部分（排除随机生成的 id）。 */
function stableShape(r: ReturnType<typeof narrate>) {
  return {
    narrativeSummary: r.narrativeSummary,
    variableDeltas: r.variableDeltas,
    affectedEntityIds: r.affectedEntityIds,
    proposedDirections: r.proposedDirections.map((d) => ({ label: d.label, description: d.description, estimatedSummary: d.estimatedSummary })),
    newEvents: r.newEvents.map((e) => ({ title: e.title, description: e.description, type: e.type, causedByOperationId: e.causedByOperationId })),
  };
}

describe('narrativeEngine', () => {
  it('dispatch 产生事件、变量变化与推荐走向', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    addEntity(b, 'e1', '玄天宗');
    const op: Operation = {
      id: 'op1', worldId: 'w', kind: 'dispatch',
      payload: { factionId: 'e1', action: '北境增兵' }, label: '调度', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.newEvents.length).toBeGreaterThan(0);
    expect(res.narrativeSummary).toContain('北境增兵');
    expect(Object.keys(res.variableDeltas).length).toBeGreaterThan(0);
    expect(res.proposedDirections.length).toBeGreaterThan(0);
  });

  it('dispatch 正确产出 variableDeltas（国力-3 / 民心+2）与 3 个走向', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    addEntity(b, 'e1', '玄天宗');
    addEntity(b, 'e2', '魔教');
    const op: Operation = {
      id: 'op1', worldId: 'w', kind: 'dispatch',
      payload: { factionId: 'e1', targetId: 'e2', action: '北伐' }, label: '调度', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.variableDeltas).toEqual({ v_power: -3, v_morale: 2 });
    expect(res.proposedDirections).toHaveLength(3);
    expect(res.affectedEntityIds).toEqual(['e1', 'e2']);
    expect(res.newEvents[0].type).toBe('operation');
    expect(res.newEvents[0].causedByOperationId).toBe('op1');
  });

  it('advanceTime 产出时间推进事件，变量随季节变化（秋→灵气+3）', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    const op: Operation = {
      id: 'op2', worldId: 'w', kind: 'advanceTime',
      payload: { years: 2, season: '秋' }, label: '推时间', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.newEvents[0].title).toContain('时间推进');
    expect(res.newEvents[0].type).toBe('system');
    expect(res.variableDeltas).toEqual({ v_morale: 2, v_spirit: 3 });
    expect(res.proposedDirections).toHaveLength(2);
  });

  it('advanceTime 默认季（春）灵气+1', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    const op: Operation = { id: 'op2b', worldId: 'w', kind: 'advanceTime', payload: {}, label: '推时间', createdAt: 't' };
    const res = narrate(op, b);
    expect(res.variableDeltas).toEqual({ v_morale: 2, v_spirit: 1 });
  });

  it('triggerEvent 产出事件且国力-2', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    addEntity(b, 'e3', '主角');
    const op: Operation = {
      id: 'op3', worldId: 'w', kind: 'triggerEvent',
      payload: { title: '天裂', description: '苍穹撕裂', affectedEntityIds: ['e3'] }, label: '事件', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.narrativeSummary).toContain('天裂');
    expect(res.variableDeltas).toEqual({ v_power: -2 });
    expect(res.affectedEntityIds).toEqual(['e3']);
  });

  it('adjustVariable 精确应用 delta', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    const op: Operation = {
      id: 'op4', worldId: 'w', kind: 'adjustVariable',
      payload: { variableId: 'v_morale', delta: -10, reason: '饥荒' }, label: '改', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.variableDeltas).toEqual({ v_morale: -10 });
    expect(res.narrativeSummary).toContain('饥荒');
    expect(res.narrativeSummary).toContain('下降'); // 摘要用绝对值 + 方向词
    expect(res.narrativeSummary).toContain('10');
  });

  it('diplomacy 产出关系变化摘要', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    addEntity(b, 'e1', '玄天宗');
    addEntity(b, 'e2', '魔教');
    const op: Operation = {
      id: 'op5', worldId: 'w', kind: 'diplomacy',
      payload: { sourceId: 'e1', targetId: 'e2', relationType: '同盟' }, label: '外交', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.narrativeSummary).toContain('同盟');
    expect(res.variableDeltas).toEqual({});
  });

  it('确定性：同输入同输出（内容层面，排除随机 id）', () => {
    const make = () => {
      const b = withBaseVars(emptyBundle(makeWorld()));
      addEntity(b, 'e1', '玄天宗');
      return b;
    };
    const op: Operation = {
      id: 'op1', worldId: 'w', kind: 'dispatch',
      payload: { factionId: 'e1', action: '北境增兵' }, label: '调度', createdAt: 't',
    };
    const r1 = stableShape(narrate(op, make()));
    const r2 = stableShape(narrate(op, make()));
    expect(r1).toEqual(r2);
  });

  it('未知操作类型走兜底（空结果）', () => {
    const b = withBaseVars(emptyBundle(makeWorld()));
    const op = {
      id: 'opX', worldId: 'w', kind: 'unknown' as Operation['kind'], payload: {}, label: 'x', createdAt: 't',
    };
    const res = narrate(op, b);
    expect(res.variableDeltas).toEqual({});
    expect(res.proposedDirections).toEqual([]);
    expect(res.narrativeSummary).toContain('x');
  });
});
