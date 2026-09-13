import { describe, it, expect } from 'vitest';
import { suggestPlotBranches } from '../services/narrative/plotSuggestion';
import { emptyBundle } from '../store/types';
import type { World } from '../types/world';

function mkWorld(): World {
  return { id: 'w', name: '界', createdAt: 't', updatedAt: 't' };
}

describe('suggestPlotBranches (叙事推演引擎)', () => {
  it('空世界（无作品/无变量）也能给出至少一条开篇建议', () => {
    const b = emptyBundle(mkWorld());
    const branches = suggestPlotBranches(b, undefined, { count: 4 });
    expect(branches.length).toBeGreaterThanOrEqual(1);
    expect(branches.every((x) => x.seed === 'progress')).toBe(true);
    expect(branches[0].title).toContain('开篇');
    expect(branches[0].suggestedIndex).toBe(1);
  });

  it('基于作品进度+伏笔+事件+操作走向+变量，产出多来源分支', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = {
      id: 'bk1', worldId: 'w', name: '主线', description: '正道崛起', order: 0,
      createdAt: 't', updatedAt: 't',
    };
    b.chapters['c1'] = {
      id: 'c1', worldId: 'w', bookId: 'bk1', index: 1, title: '第一章', outline: '起',
      currentVersionId: 'v1', status: 'draft', createdAt: 't', updatedAt: 't',
    };
    b.chapterVersions['v1'] = {
      id: 'v1', chapterId: 'c1', content: '苍穹之下，正道初兴。', source: 'human',
      wordCount: 10, createdAt: 't', note: '',
    };
    b.foreshadows['f1'] = {
      id: 'f1', worldId: 'w', title: '上古秘宝', status: 'active', note: '藏于北境',
    };
    b.timelineEvents['e1'] = {
      id: 'e1', worldId: 'w', title: '宗门大比', description: '各派齐聚', type: 'operation',
      createdAt: '2020',
    };
    b.lastOperationResult = {
      operationId: 'op', narrativeSummary: 'x', affectedEntityIds: [], newEvents: [],
      variableDeltas: {},
      proposedDirections: [
        { id: 'd1', label: '乘胜追击', description: '扩大战果', estimatedSummary: '攻势如潮' },
      ],
    };
    b.variables['vp'] = {
      id: 'vp', worldId: 'w', key: 'power', name: '国力', value: 95, min: 0, max: 100,
    };

    const branches = suggestPlotBranches(b, 'bk1', { count: 4 });
    expect(branches.length).toBe(4);

    const seeds = branches.map((x) => x.seed);
    expect(seeds).toContain('direction');
    expect(seeds).toContain('foreshadow');
    expect(seeds).toContain('event');
    expect(seeds).toContain('variable');

    expect(branches[0].title).toContain('走向·乘胜追击'); // 优先级最高
    expect(branches.find((x) => x.seed === 'foreshadow')?.title).toContain('回收伏笔·上古秘宝');
    expect(branches.find((x) => x.seed === 'event')?.title).toContain('余波·宗门大比');
    expect(branches.find((x) => x.seed === 'variable')?.title).toContain('国力');
  });

  it('count 参数受尊重', () => {
    const b = emptyBundle(mkWorld());
    b.foreshadows['f1'] = { id: 'f1', worldId: 'w', title: 'A', status: 'active' };
    b.foreshadows['f2'] = { id: 'f2', worldId: 'w', title: 'B', status: 'active' };
    b.foreshadows['f3'] = { id: 'f3', worldId: 'w', title: 'C', status: 'active' };

    expect(suggestPlotBranches(b, undefined, { count: 2 }).length).toBe(2);
  });

  it('相同标题的分支会被去重', () => {
    const b = emptyBundle(mkWorld());
    // 两次事件标题相同，应只保留一条
    b.timelineEvents['e1'] = {
      id: 'e1', worldId: 'w', title: '宗门大比', description: 'a', type: 'operation', createdAt: '1',
    };
    b.timelineEvents['e2'] = {
      id: 'e2', worldId: 'w', title: '宗门大比', description: 'b', type: 'operation', createdAt: '2',
    };
    const branches = suggestPlotBranches(b, undefined, { count: 10 });
    const titles = branches.map((x) => x.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
