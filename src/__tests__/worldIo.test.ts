import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkStore } from '../store/workStore';
import {
  serializeWorld,
  parseWorld,
  importWorldBundle,
} from '../services/worldIo';

describe('世界导入 / 导出（v2 P5）', () => {
  beforeEach(() => {
    useWorkStore.setState({
      worlds: {},
      currentWorldId: null,
      currentBookId: null,
      offlineMode: false,
    });
  });

  async function buildRichWorld(): Promise<{ worldId: string; ids: Record<string, string> }> {
    const s = useWorkStore.getState();
    const worldId = s.createWorld('IO-World', undefined, 'urban');
    const e1 = s.addEntity(worldId, { type: 'geography', name: 'E1_GEO' });
    const e2 = s.addEntity(worldId, { type: 'faction', name: 'E2_FAC' });
    s.addRelation(worldId, { sourceId: e1, targetId: e2, type: '敌对' });
    const book2 = s.createBook(worldId, { name: '外传' });
    const c1 = s.createChapter(worldId, { title: '章一', bookId: book2 });
    s.saveChapterVersion(worldId, c1, { content: 'CUSTOM_V1', source: 'human' });
    const c2 = s.createChapter(worldId, { title: '章二', bookId: book2 });
    s.saveChapterVersion(worldId, c2, { content: 'CUSTOM_V2', source: 'human' });
    const r1 = s.createRegistryCharacter(worldId, { name: 'REG_NAME' });
    const i1 = s.createCharacterInstance(worldId, { bookId: book2, registryId: r1, name: 'INST_NAME' });
    s.addMoodEntry(worldId, { characterInstanceId: i1, chapterId: c1, mood: '雀跃' });
    s.setEntityPosition(worldId, e1, { x: 3, y: 4 });
    // 触发一次生成（离线mock）以产生生成记录，便于校验其章节引用重映射
    await s.generateChapter(worldId, { chapterId: c1, targetWords: 50 });
    return { worldId, ids: { e1, e2, book2, c1, c2, r1, i1 } };
  }

  it('序列化 -> 导入：生成全新 id 且所有引用正确重映射', async () => {
    const { worldId, ids } = await buildRichWorld();
    const json = serializeWorld(useWorkStore.getState().worlds[worldId]);

    const newId = importWorldBundle(json);
    expect(newId).not.toBe(worldId);

    const nb = useWorkStore.getState().worlds[newId];
    const old = useWorkStore.getState().worlds[worldId];

    // 数量守恒
    expect(Object.keys(nb.entities)).toHaveLength(Object.keys(old.entities).length);
    expect(Object.keys(nb.books)).toHaveLength(Object.keys(old.books).length);
    expect(Object.keys(nb.chapters)).toHaveLength(Object.keys(old.chapters).length);

    // 按稳定字段定位新 id
    const newE1 = Object.values(nb.entities).find((e) => e.name === 'E1_GEO')!;
    const newE2 = Object.values(nb.entities).find((e) => e.name === 'E2_FAC')!;
    const newBook2 = Object.values(nb.books).find((b) => b.name === '外传')!;
    const newC1 = Object.values(nb.chapters).find((c) => c.title === '章一')!;
    const newR1 = Object.values(nb.characterRegistry).find((r) => r.name === 'REG_NAME')!;
    const newI1 = Object.values(nb.characterInstances).find((c) => c.name === 'INST_NAME')!;

    // 关系引用重映射
    const rel = Object.values(nb.relations).find(
      (r) => r.sourceId === newE1.id && r.targetId === newE2.id,
    );
    expect(rel).toBeTruthy();

    // 章节 <-> 版本 双向引用重映射 + 内容保持
    const newC2 = Object.values(nb.chapters).find((c) => c.title === '章二')!;
    const v2 = nb.chapterVersions[newC2.currentVersionId];
    expect(v2.chapterId).toBe(newC2.id);
    expect(v2.content).toBe('CUSTOM_V2');

    // 角色卡 bookId / registryId 重映射
    expect(newI1.bookId).toBe(newBook2.id);
    expect(newI1.registryId).toBe(newR1.id);

    // 心情引用重映射
    const mood = Object.values(nb.moodEntries).find((m) => m.mood === '雀跃')!;
    expect(mood.characterInstanceId).toBe(newI1.id);
    expect(mood.chapterId).toBe(newC1.id);

    // 关系图坐标键重映射
    expect(nb.graphPositions[newE1.id]).toEqual({ x: 3, y: 4 });
  });

  it('序列化 -> 导入：生成记录章节引用重映射', async () => {
    const { worldId, ids } = await buildRichWorld();
    const json = serializeWorld(useWorkStore.getState().worlds[worldId]);

    const newId = importWorldBundle(json);
    const nb = useWorkStore.getState().worlds[newId];
    const newC1 = Object.values(nb.chapters).find((c) => c.title === '章一')!;

    const gen = Object.values(nb.generationRecords).find((g) => g.chapterId === newC1.id);
    expect(gen).toBeTruthy();
  });

  it('parseWorld 对非法输入抛错', () => {
    expect(() => parseWorld('这不是 json')).toThrow();
    expect(() => parseWorld(JSON.stringify({ foo: 1 }))).toThrow();
    // 缺 world.name 视为结构不完整
    expect(() =>
      parseWorld(JSON.stringify({ tag: '__worldNovelEditor__', bundle: { world: { id: 'x' } } })),
    ).toThrow();
  });
});
