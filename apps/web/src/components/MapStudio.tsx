import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEntities, useCreateEntity, useUpdateEntity, useDeleteEntity } from '../hooks/useEntities';
import type { WorldEntity } from '../api/types';
import { generate, defaultRegionNames, type GenParams } from '../lib/worldgen';

echarts.use([GeoComponent, TooltipComponent, CanvasRenderer]);

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
    return d.v === 2 ? d : null;
  } catch {
    return null;
  }
}

const randSeed = () => Math.floor(Math.random() * 1e9);
const DEFAULT_PARAMS: GenParams = { seed: 42, sea: 0.5, freq: 1.0 };

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

  // 生成 + 渲染（参数变化防抖重绘）
  const gen = useMemo(() => generate(draft.params), [draft.params]);
  const regionNames = useMemo(() => {
    const n = gen.continents.length;
    const names = draft.regionNames.slice(0, n);
    while (names.length < n) names.push('');
    return names.map((x, i) => x || defaultRegionNames(n)[i]);
  }, [gen, draft.regionNames]);

  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    // 全是海洋时不注册空地图，避免 echarts 空 geo 崩溃
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
          silent: false,
        },
        tooltip: {
          show: true,
          formatter: (p: { name?: string }) => nameOf(p.name),
        },
        series: [],
      } as never,
      true,
    );
  }, [gen, regionNames]);

  /* ---------- 操作 ---------- */
  const patchParams = (k: keyof GenParams, v: number) =>
    setDraft((d) => ({ ...d, params: { ...d.params, [k]: v } }));

  const save = async () => {
    const payload = { ...draft, regionNames };
    if (current) {
      await updateEntity.mutateAsync({ id: current.entity.id, name: draft.name, fields: JSON.stringify(payload) });
    } else {
      const e = await createEntity.mutateAsync({ type: 'map', name: draft.name, fields: JSON.stringify(payload) });
      setCurrentId(e.id);
    }
    setSavedTick((t) => t + 1);
  };

  const newMap = () => {
    setCurrentId(null);
    setDraft({ v: 2, name: `界·${maps.length + 1}`, parentId: current?.entity.id ?? null, parentRegion: null, params: { ...DEFAULT_PARAMS, seed: randSeed() }, regionNames: [] });
  };

  const removeMap = async () => {
    if (!current) return;
    if (!window.confirm(`删除地图「${current.data.name}」？其子地图会失去归属。`)) return;
    await deleteEntity.mutateAsync(current.entity.id);
    setCurrentId(null);
  };

  const sliders: { k: keyof GenParams; label: string; min: number; max: number; step: number }[] = [
    { k: 'sea', label: '海平面', min: 0.3, max: 0.6, step: 0.005 },
    { k: 'freq', label: '碎片化', min: 0.5, max: 3, step: 0.05 },
  ];

  return (
    <div className="ms-grid">
      {/* 左：控制台 */}
      <div className="ms-panel">
        <div className="ms-sec">
          <div className="ms-label">地图</div>
          <div className="ms-row">
            <select
              value={currentId ?? ''}
              onChange={(e) => setCurrentId(e.target.value || null)}
            >
              <option value="">＋ 未保存的新图</option>
              {maps.map((m) => (
                <option key={m.entity.id} value={m.entity.id}>
                  {m.data.name}
                </option>
              ))}
            </select>
            <button className="mini-btn" onClick={newMap}>新建</button>
            {current && (
              <button className="mini-btn" style={{ color: 'var(--seal)' }} onClick={removeMap}>删除</button>
            )}
          </div>
          <input
            className="ms-name"
            value={draft.name}
            placeholder="地图名，如 主界 / 上界 / 下界"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div className="ms-sec">
          <div className="ms-label">层级（内嵌地图）</div>
          <select
            value={draft.parentId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value || null, parentRegion: null }))}
          >
            <option value="">无上层 · 顶层界</option>
            {maps.filter((m) => m.entity.id !== currentId).map((m) => (
              <option key={m.entity.id} value={m.entity.id}>属于「{m.data.name}」</option>
            ))}
          </select>
          {parentMap && (
            <select
              value={draft.parentRegion ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, parentRegion: e.target.value || null }))}
            >
              <option value="">落在上层的哪一洲…</option>
              {(parentMap.data.regionNames.length
                ? parentMap.data.regionNames
                : defaultRegionNames(8)
              ).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
          {children.length > 0 && (
            <div className="ms-kids">
              子地图：{children.map((c) => c.data.name).join('、')}
            </div>
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
                value={draft.params[s.k]}
                onChange={(e) => patchParams(s.k, Number(e.target.value))}
              />
              <span className="ms-sv">{(draft.params[s.k] ?? 0).toFixed(2)}</span>
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
          <div className="ms-label">洲（点选区域命名）</div>
          {gen.continents.length === 0 && <div className="ms-kids">全是海洋——试着调低海平面。</div>}
          {gen.continents.map((c, i) => (
            <div key={i} className="ms-slider">
              <span className="ms-sl">第{i + 1}洲</span>
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

      {/* 右：地图 */}
      <div className="ms-stage">
        <div ref={chartRef} className="ms-chart" />
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
