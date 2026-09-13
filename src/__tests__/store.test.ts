import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkStore } from '../store/workStore';

describe('worldStore slices', () => {
  beforeEach(() => {
    // 清空所有世界与当前激活作品，保证测试隔离
    useWorkStore.setState({ worlds: {}, currentWorldId: null, currentBookId: null });
  });

  it('createWorld 预置 3 个变量（国力/民心/灵气）与全局风格', () => {
    const id = useWorkStore.getState().createWorld('测试世界');
    const bundle = useWorkStore.getState().worlds[id];
    expect(bundle).toBeTruthy();
    const vars = Object.values(bundle!.variables);
    expect(vars).toHaveLength(3);
    const keys = vars.map((v) => v.key).sort();
    expect(keys).toEqual(['morale', 'power', 'spirit']);
    expect(useWorkStore.getState().getGlobalStyle(id)).toBeTruthy();
    expect(useWorkStore.getState().currentWorldId).toBe(id);
  });

  it('addEntity + runOperation(dispatch) 应用变量Δ并写入 TimelineEvent', () => {
    const id = useWorkStore.getState().createWorld('W2');
    const power = Object.values(useWorkStore.getState().worlds[id].variables).find((v) => v.key === 'power')!;
    const morale = Object.values(useWorkStore.getState().worlds[id].variables).find((v) => v.key === 'morale')!;
    const powerBefore = power.value;
    const moraleBefore = morale.value;

    const eid = useWorkStore.getState().addEntity(id, { type: 'faction', name: '玄天宗' });
    useWorkStore.getState().runOperation(id, {
      kind: 'dispatch', payload: { factionId: eid, action: '增兵' }, label: '调',
    });

    const b = useWorkStore.getState().worlds[id];
    // 变量Δ：国力 -3 / 民心 +2
    expect(b.variables[power.id].value).toBe(powerBefore - 3);
    expect(b.variables[morale.id].value).toBe(moraleBefore + 2);
    // 事件已写入
    const events = Object.values(b.timelineEvents);
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'operation')).toBe(true);
    // 推演结果落库
    expect(b.lastOperationResult).toBeTruthy();
    expect(b.directionOptions.length).toBe(3);
    expect(b.selectedDirectionId).toBeTruthy();
  });

  it('runOperation(triggerEvent) 国力 -2 且 affectedEntityIds 落库', () => {
    const id = useWorkStore.getState().createWorld('W4');
    const target = useWorkStore.getState().addEntity(id, { type: 'character', name: '叶凡' });
    const power = Object.values(useWorkStore.getState().worlds[id].variables).find((v) => v.key === 'power')!;
    const before = power.value;
    useWorkStore.getState().runOperation(id, {
      kind: 'triggerEvent', payload: { title: '天裂', description: '苍穹撕裂', affectedEntityIds: [target] }, label: '事件',
    });
    const b = useWorkStore.getState().worlds[id];
    expect(b.variables[power.id].value).toBe(before - 2);
    expect(b.lastOperationResult?.affectedEntityIds).toEqual([target]);
  });

  it('selectDirection 更新选定走向', () => {
    const id = useWorkStore.getState().createWorld('W5');
    useWorkStore.getState().addEntity(id, { type: 'faction', name: '玄天宗' });
    useWorkStore.getState().runOperation(id, { kind: 'dispatch', payload: { action: '增兵' }, label: '调' });
    const b = useWorkStore.getState().worlds[id];
    const second = b.directionOptions[1];
    useWorkStore.getState().selectDirection(id, second.id);
    expect(useWorkStore.getState().worlds[id].selectedDirectionId).toBe(second.id);
  });

  it('generateChapter 离线模式产出非空 Markdown 版本并写生成事件', async () => {
    const id = useWorkStore.getState().createWorld('W3');
    const chapterId = await useWorkStore.getState().generateChapter(id, { targetWords: 800 });
    expect(chapterId).toBeTruthy();
    const bundle = useWorkStore.getState().worlds[id];
    // 无后端 → 离线降级（offlineMode 是 store 顶层状态，非 WorldBundle 字段）
    expect(useWorkStore.getState().offlineMode).toBe(true);
    const ch = bundle.chapters[chapterId!];
    expect(ch.currentVersionId).toBeTruthy();
    const ver = bundle.chapterVersions[ch.currentVersionId];
    expect(ver).toBeTruthy();
    expect(ver.content.length).toBeGreaterThan(0);     // 非空
    expect(ver.content.startsWith('# 第 X 章')).toBe(true); // 离线演示稿 Markdown
    // 生成记录 + 生成类时间线事件
    const genRecords = Object.values(bundle.generationRecords);
    expect(genRecords.length).toBe(1);
    expect(genRecords[0].status).toBe('failed'); // 离线演示记为 failed
    expect(Object.values(bundle.timelineEvents).some((e) => e.type === 'generation')).toBe(true);
  });

  it('generateChapter 复用指定章节并写入版本', async () => {
    const id = useWorkStore.getState().createWorld('W6');
    const cid = useWorkStore.getState().createChapter(id, { title: '第 1 章', index: 1 });
    const returned = await useWorkStore.getState().generateChapter(id, { chapterId: cid, targetWords: 500 });
    expect(returned).toBe(cid);
    const ver = useWorkStore.getState().worlds[id].chapters[cid].currentVersionId;
    expect(useWorkStore.getState().worlds[id].chapterVersions[ver].source).toBe('ai');
  });

  it('createWorld 默认创建一部作品(卷) 并激活 currentBookId', () => {
    const id = useWorkStore.getState().createWorld('W-book');
    const bundle = useWorkStore.getState().worlds[id];
    const books = Object.values(bundle.books);
    expect(books).toHaveLength(1);
    expect(books[0].name).toBe('主线');
    expect(books[0].worldId).toBe(id);
    expect(useWorkStore.getState().currentBookId).toBe(books[0].id);
    expect(bundle.chapters).toEqual({});
  });

  it('createBook / removeBook 创建并级联清理作品下章节', () => {
    const id = useWorkStore.getState().createWorld('W-books');
    const firstBook = Object.values(useWorkStore.getState().worlds[id].books)[0];
    const newBookId = useWorkStore.getState().createBook(id, { name: '外传' });
    let books = Object.values(useWorkStore.getState().worlds[id].books);
    expect(books).toHaveLength(2);

    // 在新作品下建章节
    const cid = useWorkStore.getState().createChapter(id, {
      title: '外传第一章',
      bookId: newBookId,
    });
    const ch = useWorkStore.getState().worlds[id].chapters[cid];
    expect(ch.bookId).toBe(newBookId);

    // 删除新作品，其下章节应被级联清理
    useWorkStore.getState().removeBook(id, newBookId);
    books = Object.values(useWorkStore.getState().worlds[id].books);
    expect(books).toHaveLength(1);
    expect(useWorkStore.getState().worlds[id].chapters[cid]).toBeUndefined();
    // currentBookId 仍为原激活作品（未删除的那个）
    expect(useWorkStore.getState().currentBookId).toBe(firstBook.id);
  });

  it('createChapter 章节序号在所属作品内独立编号', () => {
    const id = useWorkStore.getState().createWorld('W-idx');
    const bookA = Object.values(useWorkStore.getState().worlds[id].books)[0];
    const bookB = useWorkStore.getState().createBook(id, { name: '第二部' });
    const a1 = useWorkStore.getState().createChapter(id, { title: 'A1', bookId: bookA.id });
    const b1 = useWorkStore.getState().createChapter(id, { title: 'B1', bookId: bookB });
    const a2 = useWorkStore.getState().createChapter(id, { title: 'A2', bookId: bookA.id });
    expect(useWorkStore.getState().worlds[id].chapters[a1].index).toBe(1);
    expect(useWorkStore.getState().worlds[id].chapters[a2].index).toBe(2);
    // 第二部作品的编号独立从 1 开始
    expect(useWorkStore.getState().worlds[id].chapters[b1].index).toBe(1);
  });
});
