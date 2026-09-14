import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkStore } from '../store/workStore';
import { WORLD_TEMPLATES, DEFAULT_TEMPLATE_KEY } from '../constants/worldTemplates';

describe('世界模板库（v2 P5）', () => {
  beforeEach(() => {
    useWorkStore.setState({ worlds: {}, currentWorldId: null, currentBookId: null });
  });

  it('无模板时 createWorld 回退默认变量/作品名，且不预置实体', () => {
    const id = useWorkStore.getState().createWorld('W-default');
    const b = useWorkStore.getState().worlds[id];
    const varKeys = Object.values(b.variables).map((v) => v.key).sort();
    expect(varKeys).toEqual(['morale', 'power', 'spirit']);
    expect(Object.values(b.books)[0].name).toBe('主线');
    expect(Object.keys(b.entities)).toHaveLength(0);
  });

  it('套用「现代都市」模板：变量/风格/作品名/预置实体全部生效', () => {
    const id = useWorkStore.getState().createWorld('W-urban', undefined, 'urban');
    const b = useWorkStore.getState().worlds[id];
    const tpl = WORLD_TEMPLATES.urban;

    const varKeys = Object.values(b.variables).map((v) => v.key).sort();
    expect(varKeys).toEqual(tpl.variables.map((v) => v.key).sort());
    expect(Object.values(b.styleConfigs)[0].tone).toBe(tpl.style.tone);
    expect(Object.values(b.books)[0].name).toBe(tpl.bookName);
    expect(Object.keys(b.entities)).toHaveLength(tpl.seedEntities.length);
    // 预置实体默认纳入上下文
    expect(Object.values(b.entities).every((e) => e.inContext)).toBe(true);
  });

  it('套用「武侠江湖」模板预置实体名正确', () => {
    const id = useWorkStore.getState().createWorld('W-wuxia', undefined, 'wuxia');
    const b = useWorkStore.getState().worlds[id];
    const names = Object.values(b.entities).map((e) => e.name).sort();
    expect(names).toEqual(WORLD_TEMPLATES.wuxia.seedEntities.map((s) => s.name).sort());
  });

  it('默认模板键存在于模板库中', () => {
    expect(WORLD_TEMPLATES[DEFAULT_TEMPLATE_KEY]).toBeTruthy();
  });
});
