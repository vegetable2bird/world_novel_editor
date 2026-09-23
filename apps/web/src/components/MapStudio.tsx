import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEntities, useCreateEntity, useUpdateEntity, useDeleteEntity } from '../hooks/useEntities';
import type { WorldEntity } from '../api/types';
import { generate, defaultRegionNames, normalizeParams, type GenParams } from '../lib/worldgen';

echarts.use([ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer]);

interface MapV2 {
  v: 2;
  name: string;
  parentId: string | null;
  parentRegion: string | null;
  params: GenParams;
  regionNames: string[];
  /** 详细地势描述（水网 / 山脉 / 植被等文字设定） */
  desc?: string;
}

function parseMap(e: WorldEntity): MapV2 | null {
  try {
    const d = JSON.parse(e.fields || '{}') as MapV2;
    if (d.v !== 2) return null;
    return { ...d, params: normalizeParams(d.params) };
  } catch {
    return null;
  }
}

const randSeed = () => Math.floor(Math.random() * 1e9);
const DEFAULT_PARAMS: GenParams = { seed: 42, regions: 12, jitter: 0.6 };

type Mode = 'view' | 'edit';

export function MapStudio({ worldId, factions, onOpenFac }: { worldId: string; factions: WorldEntity[]; onOpenFac?: (id: string) => void }) {
  const { data: entities } = useEntities(worldId);
  const createEntity = useCreateEntity(worldId);
  const updateEntity = useUpdateEntity(worldId);
  const deleteEntity = useDeleteEntity(worldId);

  const maps = useMemo(
    () =>
      (entities ?? [])
        .filter((e) => e.type === 'map')
        .map((e) => ({ entity: e, data: parseMap(e) }))
        .filter((x) => x.data !== null) as { entity: WorldEntity; data: MapV2 }[],
    [entities],
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [layersOpen, setLayersOpen] = useState(false);
  const [draft, setDraft] = useState<MapV2>({
    v: 2,
    name: '主界',
    parentId: null,
    parentRegion: null,
    params: { ...DEFAULT_PARAMS },
    regionNames: [],
  });
  const [savedTick, setSavedTick] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof echarts.init> | null>(null);

  // 图表实例只初始化/销毁一次
  useEffect(() => {
    if (!chartRef.current) return;
    chart.current = echarts.init(chartRef.current);
    return () => {
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  const current = maps.find((m) => m.entity.id === currentId) ?? null;
  const parentMap = maps.find((m) => m.entity.id === draft.parentId) ?? null;
  const children = maps.filter((m) => m.data.parentId === (current?.entity.id ?? currentId));

  // 初次进入：选第一张地图，否则创建默认
  useEffect(() => {
    if (maps.length && !currentId) setCurrentId(maps[0].entity.id);
  }, [maps, currentId]);

  // 载入当前地图到草稿
  useEffect(() => {
    if (current) {
      setDraft(JSON.parse(JSON.stringify(current.data)) as MapV2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, savedTick]);

  // 生成 + 渲染
  const gen = useMemo(() => generate(draft.params), [draft.params]);
  const regionNames = useMemo(() => {
    const n = gen.regions.length;
    const names = draft.regionNames.slice(0, n);
    while (names.length < n) names.push('');
    return names.map((x, i) => x || defaultRegionNames(n)[i]);
  }, [gen, draft.regionNames]);

  /* ---------- 势力落点 ---------- */
  const [pinning, setPinning] = useState<string | null>(null);
  const facFields = useMemo(() => {
    const m = new Map<string, { mapId?: string; regionIdx?: number; color?: string }>();
    for (const f of factions) {
      try {
        m.set(f.id, JSON.parse(f.fields || '{}'));
      } catch {
        m.set(f.id, {});
      }
    }
    return m;
  }, [factions]);

  const pins = useMemo(() => {
    if (!current) return [] as { id: string; name: string; color?: string; coord: [number, number]; regionIdx: number }[];
    return factions
      .map((f) => {
        const ff = facFields.get(f.id) ?? {};
        if (ff.mapId !== current.entity.id) return null;
        const idx = ff.regionIdx;
        if (idx === undefined || idx < 0 || idx >= gen.regions.length) return null;
        return { id: f.id, name: f.name, color: ff.color, coord: gen.regions[idx].centroid, regionIdx: idx };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [factions, facFields, current, gen]);

  const placePin = async (facId: string, regionIdx: number) => {
    const f = factions.find((x) => x.id === facId);
    if (!f) return;
    const merged = { ...(facFields.get(facId) ?? {}), mapId: current?.entity.id, regionIdx };
    await updateEntity.mutateAsync({ id: facId, fields: JSON.stringify(merged) });
    setPinning(null);
  };

  const clearPin = async (facId: string) => {
    const f = factions.find((x) => x.id === facId);
    if (!f) return;
    const merged = { ...(facFields.get(facId) ?? {}) };
    delete merged.mapId;
    delete merged.regionIdx;
    await updateEntity.mutateAsync({ id: facId, fields: JSON.stringify(merged) });
  };

  // 图表点击：图钉 → 打开势力；编辑落点中 → 放置到区域
  type ClickEvt = { componentType?: string; seriesType?: string; name?: string; data?: { facId?: string } };
  const clickRef = useRef<(p: ClickEvt) => void>(() => {});
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    const handler = (p: unknown) => clickRef.current(p as ClickEvt);
    c.on('click', handler);
    return () => {
      c.off('click', handler);
    };
  }, []);
  clickRef.current = (p) => {
    if (p.componentType === 'series' && p.seriesType === 'scatter' && p.data?.facId) {
      onOpenFac?.(p.data.facId);
      return;
    }
    if (mode === 'edit' && pinning && p.componentType === 'geo' && p.name) {
      const idx = Number(p.name.slice(1));
      if (Number.isFinite(idx)) void placePin(pinning, idx);
    }
  };

  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    if (!gen.geo.features.length) {
      c.clear();
      return;
    }
    const mapName = 'wxmap_' + draft.params.seed;
    echarts.registerMap(mapName, gen.geo as never);
    const nameOf = (feat: string | undefined) => {
      const i = feat && feat.length > 1 ? Number(feat.slice(1)) : NaN;
      return Number.isFinite(i) ? (regionNames[i] ?? '') : '';
    };
    c.setOption(
      {
        geo: {
          map: mapName,
          roam: true,
          layoutCenter: ['50%', '50%'],
          layoutSize: '100%',
          itemStyle: {
            areaColor: '#edebf6',
            borderColor: 'rgba(255,255,255,0.95)',
            borderWidth: 1.6,
            shadowBlur: 10,
            shadowColor: 'rgba(70,55,130,0.10)',
          },
          label: {
            show: true,
            formatter: (p: { name?: string }) => nameOf(p.name),
            fontSize: 12.5,
            color: '#57507a',
            fontFamily: 'Songti SC, STSong, SimSun, serif',
            letterSpacing: 2,
          },
          emphasis: {
            label: { color: '#262040', fontWeight: 600 },
            itemStyle: { areaColor: '#f6e3a3' },
          },
          tooltip: {
            show: true,
            formatter: (p: { name?: string }) => nameOf(p.name),
          },
          silent: false,
        },
        series: [
          {
            type: 'scatter',
            coordinateSystem: 'geo',
            symbol: 'pin',
            symbolSize: 30,
            itemStyle: {
              color: '#6d4fd0',
              borderColor: '#fff',
              borderWidth: 1.5,
              shadowBlur: 8,
              shadowColor: 'rgba(70,55,130,0.3)',
            },
            label: {
              show: true,
              position: 'bottom',
              distance: 4,
              formatter: (p: { data: { name?: string } }) => p.data.name ?? '',
              fontSize: 11,
              color: '#3a3157',
              letterSpacing: 1,
            },
            emphasis: { scale: 1.15 },
            data: pins.map((pn) => ({
              name: pn.name,
              facId: pn.id,
              value: pn.coord,
              itemStyle: pn.color ? { color: pn.color } : undefined,
            })),
            z: 20,
          },
        ],
      } as never,
      true,
    );
  }, [gen, regionNames, pins]);

  /* ---------- 图层树 ---------- */
  const depthOf = (m: { data: MapV2 }) => {
    let d = 0;
    let cur = m.data.parentId;
    const guard = new Set<string>();
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      d++;
      cur = maps.find((x) => x.entity.id === cur)?.data.parentId ?? null;
    }
    return d;
  };
  const layerRows = useMemo(() => {
    const ids = new Set(maps.map((m) => m.entity.id));
    const roots = maps.filter((m) => !m.data.parentId || !ids.has(m.data.parentId));
    const rows: { m: (typeof maps)[number]; depth: number }[] = [];
    const walk = (list: typeof maps, depth: number) => {
      for (const m of list) {
        rows.push({ m, depth });
        walk(maps.filter((x) => x.data.parentId === m.entity.id), depth + 1);
      }
    };
    walk(roots, 0);
    return rows;
  }, [maps]);

  /* ---------- 操作 ---------- */
  const patchParams = (k: keyof GenParams, v: number) =>
    setDraft((d) => ({ ...d, params: { ...d.params, [k]: v } }));

  const save = async () => {
    const payload = { ...draft, params: { ...draft.params, regions: gen.regions.length }, regionNames };
    try {
      if (current) {
        await updateEntity.mutateAsync({ id: current.entity.id, name: draft.name, fields: JSON.stringify(payload) });
      } else {
        const e = await createEntity.mutateAsync({ type: 'map', name: draft.name, fields: JSON.stringify(payload) });
        setCurrentId(e.id);
      }
      setSavedTick((t) => t + 1);
    } catch (err) {
      window.alert('保存失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const newMap = (asChild: boolean) => {
    const parent = asChild ? (current?.entity.id ?? null) : (current?.data.parentId ?? null);
    setCurrentId(null);
    setDraft({
      v: 2,
      name: `界·${maps.length + 1}`,
      parentId: parent,
      parentRegion: null,
      params: { ...DEFAULT_PARAMS, seed: randSeed() },
      regionNames: [],
    });
    setMode('edit');
  };

  const removeMap = async () => {
    if (!current) return;
    if (!window.confirm(`删除地图「${current.data.name}」？其子地图会失去归属。`)) return;
    await deleteEntity.mutateAsync(current.entity.id);
    setCurrentId(null);
  };

  const sliders: { k: keyof GenParams; label: string; min: number; max: number; step: number; fmt?: (v: number) => string }[] = [
    { k: 'regions', label: '区域数', min: 4, max: 28, step: 1, fmt: (v) => String(Math.round(v)) },
    { k: 'jitter', label: '不规则度', min: 0, max: 1, step: 0.02 },
  ];

  return (
    <div className={'ms-grid' + (mode === 'view' ? ' ms-view' : '')}>
      {/* 左：编辑控制台（仅编辑模式） */}
      {mode === 'edit' && (
        <div className="ms-panel">
          <div className="ms-sec">
            <div className="ms-label">地图</div>
            <input
              className="ms-name"
              value={draft.name}
              placeholder="地图名，如 主界 / 上界 / 下界"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <div className="ms-row">
              {current && (
                <button className="mini-btn" style={{ color: 'var(--seal)', marginLeft: 'auto' }} onClick={removeMap}>删除本地图</button>
              )}
            </div>
          </div>

          <div className="ms-sec">
            <div className="ms-label">层级（内嵌地图）</div>
            {parentMap ? (
              <select
                value={draft.parentRegion ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, parentRegion: e.target.value || null }))}
              >
                <option value="">嵌于「{parentMap.data.name}」· 选择所在区域…</option>
                {(parentMap.data.regionNames.length
                  ? parentMap.data.regionNames
                  : defaultRegionNames(parentMap.data.params.regions || 12)
                ).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : (
              <div className="ms-kids">顶层界 · 无上层（用右侧「＋子层」创建内嵌地图）</div>
            )}
            {children.length > 0 && (
              <div className="ms-kids">
                子地图：{children.map((c) => c.data.name).join('、')}
              </div>
            )}
          </div>

          <div className="ms-sec">
            <div className="ms-label">势力落点</div>
            {!current && <div className="ms-kids">保存本地图后，才能把势力放到区域上。</div>}
            {current && factions.length === 0 && <div className="ms-kids">暂无势力——先在「势力组织」里创建。</div>}
            {current &&
              factions.map((f) => {
                const ff = facFields.get(f.id) ?? {};
                const idx = ff.regionIdx;
                const pinned = ff.mapId === current.entity.id && idx !== undefined && idx >= 0 && idx < gen.regions.length;
                return (
                  <div key={f.id} className="ms-slider">
                    <i className="ms-dot" style={{ background: ff.color || 'var(--accent)' }} />
                    <span className="ms-facnm" title={f.name}>{f.name}</span>
                    {pinned ? (
                      <>
                        <span className="ms-pinat">{regionNames[idx]}</span>
                        <button className="mini-btn" onClick={() => clearPin(f.id)}>清除</button>
                      </>
                    ) : (
                      <button
                        className={'mini-btn' + (pinning === f.id ? ' on' : '')}
                        style={{ marginLeft: 'auto' }}
                        onClick={() => setPinning((v) => (v === f.id ? null : f.id))}
                      >
                        {pinning === f.id ? '取消' : '落点'}
                      </button>
                    )}
                  </div>
                );
              })}
            {pinning && current && (
              <div className="ms-kids">点击地图上的区域，放置「{factions.find((x) => x.id === pinning)?.name}」…</div>
            )}
          </div>

          <div className="ms-sec">
            <div className="ms-label">生成参数</div>
            {sliders.map((s) => (
              <div key={s.k} className="ms-slider">
                <span className="ms-sl">{s.label}</span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={draft.params[s.k] ?? 0}
                  onChange={(e) => patchParams(s.k, Number(e.target.value))}
                />
                <span className="ms-sv">{s.fmt ? s.fmt(draft.params[s.k] ?? 0) : (draft.params[s.k] ?? 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="ms-row" style={{ marginTop: 8 }}>
              <span className="ms-sl">种子 {draft.params.seed}</span>
              <button className="mini-btn" onClick={() => patchParams('seed', randSeed())}>🎲 换种子</button>
            </div>
            <div className="ms-row">
              <button className="btn-add" style={{ flex: 1 }} onClick={() => patchParams('seed', randSeed())}>
                ⟳ 重新生成（换一张）
              </button>
            </div>
            <div className="ms-row">
              <button className="btn-add" style={{ flex: 1, background: 'var(--accent)' }} onClick={save} disabled={createEntity.isPending || updateEntity.isPending}>
                💾 保存这张地图
              </button>
            </div>
          </div>

          <div className="ms-sec">
            <div className="ms-label">区域命名</div>
            {gen.regions.map((_, i) => (
              <div key={i} className="ms-slider">
                <span className="ms-sl">第{i + 1}区</span>
                <input
                  className="ms-name"
                  style={{ flex: 1 }}
                  value={regionNames[i]}
                  onChange={(e) =>
                    setDraft((d) => {
                      const rn = regionNames.slice();
                      rn[i] = e.target.value;
                      return { ...d, regionNames: rn };
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="ms-sec">
            <div className="ms-label">地势描述</div>
            <textarea
              className="ms-desc"
              rows={4}
              placeholder="例如：北境雪峰连绵，中部平原开阔，东南多湖泽；灵脉自西北向东南汇聚……"
              value={draft.desc ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* 右：画布 + 工具条 + 图层面板 */}
      <div className="ms-stage">
        <div ref={chartRef} className="ms-chart" />

        <div className="ms-toolbar">
          <button
            className={'ms-tbtn' + (mode === 'edit' ? ' active' : '')}
            title={mode === 'edit' ? '回到预览' : '编辑这张地图'}
            onClick={() => setMode((m) => (m === 'edit' ? 'view' : 'edit'))}
          >
            {mode === 'edit' ? '👁' : '✏️'}
          </button>
          <button
            className={'ms-tbtn' + (layersOpen ? ' active' : '')}
            title="图层"
            onClick={() => setLayersOpen((v) => !v)}
          >
            🗺
          </button>
        </div>

        {layersOpen && (
          <div className="ms-layers">
            <div className="ms-layers-head">
              <span>图层</span>
              <button className="ms-layers-x" onClick={() => setLayersOpen(false)}>✕</button>
            </div>
            <div className="ms-layers-list">
              {layerRows.length === 0 && <div className="ms-kids" style={{ padding: '4px 6px' }}>还没有图层</div>}
              {layerRows.map(({ m, depth }) => (
                <button
                  key={m.entity.id}
                  className={'ms-lrow' + (m.entity.id === currentId ? ' active' : '')}
                  style={{ paddingLeft: 10 + depth * 16 }}
                  onClick={() => setCurrentId(m.entity.id)}
                  title={m.data.parentRegion ? `嵌于 ${m.data.parentRegion}` : depth ? `嵌于上层 · 第 ${depth} 层` : '顶层界'}
                >
                  {depth > 0 && <span className="ms-lbranch">└</span>}
                  {m.data.name}
                </button>
              ))}
            </div>
            <div className="ms-layers-foot">
              <button className="mini-btn" style={{ flex: 1 }} onClick={() => newMap(false)}>＋ 平级层</button>
              <button className="mini-btn" style={{ flex: 1 }} onClick={() => newMap(true)}>＋ 子层</button>
            </div>
          </div>
        )}

        {factions.length > 0 && (
          <div className="ms-fac">
            势力：
            {factions.map((f) => (
              <button key={f.id} className="ms-fac-chip" onClick={() => onOpenFac?.(f.id)}>
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
