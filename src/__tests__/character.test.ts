import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkStore } from '../store/workStore';

describe('角色系统 slice（v2 P3）', () => {
  beforeEach(() => {
    // 清空所有世界，保证测试隔离
    useWorkStore.setState({ worlds: {}, currentWorldId: null, currentBookId: null });
  });

  it('creatWorld 预置空的角色集合', () => {
    const id = useWorkStore.getState().createWorld('W-角色');
    const b = useWorkStore.getState().worlds[id];
    expect(b.characterRegistry).toBeDefined();
    expect(b.characterInstances).toBeDefined();
    expect(b.moodEntries).toBeDefined();
    expect(Object.keys(b.characterRegistry).length).toBe(0);
  });

  it('总库 CRUD：创建/更新/删除', () => {
    const id = useWorkStore.getState().createWorld('W-总库');
    const rid = useWorkStore.getState().createRegistryCharacter(id, {
      name: '霜族皇子',
      archetype: '流亡的皇子',
      tags: ['霜族', '皇族'],
    });
    expect(useWorkStore.getState().worlds[id].characterRegistry[rid].name).toBe('霜族皇子');

    useWorkStore.getState().updateRegistryCharacter(id, rid, { archetype: '复国的皇子' });
    expect(useWorkStore.getState().worlds[id].characterRegistry[rid].archetype).toBe('复国的皇子');

    useWorkStore.getState().removeRegistryCharacter(id, rid);
    expect(useWorkStore.getState().worlds[id].characterRegistry[rid]).toBeUndefined();
  });

  it('角色卡可关联总库条目，删除总库仅解除关联不删化身', () => {
    const id = useWorkStore.getState().createWorld('W-关联');
    const bid = useWorkStore.getState().currentBookId!;
    const rid = useWorkStore.getState().createRegistryCharacter(id, { name: '叶凡' });
    const iid = useWorkStore.getState().createCharacterInstance(id, { bookId: bid, registryId: rid });
    expect(useWorkStore.getState().worlds[id].characterInstances[iid].registryId).toBe(rid);

    useWorkStore.getState().removeRegistryCharacter(id, rid);
    const inst = useWorkStore.getState().worlds[id].characterInstances[iid];
    expect(inst).toBeDefined();
    expect(inst.registryId).toBeUndefined();
  });

  it('删除角色卡级联清理其下心情节点', () => {
    const id = useWorkStore.getState().createWorld('W-级联');
    const bid = useWorkStore.getState().currentBookId!;
    const iid = useWorkStore.getState().createCharacterInstance(id, { bookId: bid, name: '小师妹' });
    const m1 = useWorkStore.getState().addMoodEntry(id, { characterInstanceId: iid, mood: '雀跃' });
    const m2 = useWorkStore.getState().addMoodEntry(id, { characterInstanceId: iid, mood: '落寞' });
    expect(Object.keys(useWorkStore.getState().worlds[id].moodEntries).length).toBe(2);

    useWorkStore.getState().removeCharacterInstance(id, iid);
    const mood = useWorkStore.getState().worlds[id].moodEntries;
    expect(mood[m1]).toBeUndefined();
    expect(mood[m2]).toBeUndefined();
  });

  it('心情节点默认取当前世界时钟作 clockLabel', () => {
    const id = useWorkStore.getState().createWorld('W-心情');
    const bid = useWorkStore.getState().currentBookId!;
    const iid = useWorkStore.getState().createCharacterInstance(id, { bookId: bid, name: '甲' });
    const mid = useWorkStore.getState().addMoodEntry(id, { characterInstanceId: iid, mood: '平静' });
    const entry = useWorkStore.getState().worlds[id].moodEntries[mid];
    expect(entry.clockLabel).toContain('启元');
  });

  it('同名总库名在角色卡中可被沿用', () => {
    const id = useWorkStore.getState().createWorld('W-沿用');
    const bid = useWorkStore.getState().currentBookId!;
    const rid = useWorkStore.getState().createRegistryCharacter(id, { name: '' });
    const iid = useWorkStore.getState().createCharacterInstance(id, { bookId: bid, registryId: rid });
    // 总库空名时，角色卡以"未命名角色"兜底
    expect(useWorkStore.getState().worlds[id].characterInstances[iid].name).toBe('未命名角色');
  });
});
