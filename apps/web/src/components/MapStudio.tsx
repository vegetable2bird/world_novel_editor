import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEntities, useCreateEntity, useUpdateEntity, useDeleteEntity } from '../hooks/useEntities';
import type { WorldEntity } from '../api/types';
import { Confirm } from '../components/Modal';
import { generate, defaultRegionNames, normalizeParams, type GenParams } from '../lib/worldgen';

echarts.use([ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer]);

interface MapV2 {
  v: 2;
  name: string;
  parentId: string | null;
  parentRegion: string | null;
  params: GenParams;
  regionNames: string[];
  /** 每个分块区域的地势描写（水网 / 山脉 / 植被…），与 regionNames 同序 */
  regionDescs?: string[];
  /** @deprecated 旧版「整体地势」描述；新数据改用 regionDescs（按区域） */
  desc?: string;
}

type MapRow = { entity: WorldEntity; data: MapV2 };

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

type FacFields = { mapId?: string; regionIdx?: number; color?: string; kind?: string; desc?: string };
function parseFacFields(f: WorldEntity): FacFields {
  try {
    return JSON.parse(f.fields || '{}') as FacFields;
  } catch {
    return {};
  }
}

/* ---------- 图表 option 构造（展示与弹窗预览共用） ---------- */
const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildOption(
  params: GenParams,
  regionNames: string[],
  pins: { id: string; name: string; color?: string; coord: [number, number] }[],
  regionDescs?: string[],
  selectedIdx?: number | null,
) {
  const gen = generate(params);
  if (!gen.geo.features.length) return null;
  const mapName = 'wxmap_' + params.seed;
  echarts.registerMap(mapName, gen.geo as never);
  const idxOf = (feat: string | undefined) => {
    const i = feat && feat.length > 1 ? Number(feat.slice(1)) : NaN;
    return Number.isFinite(i) ? i : null;
  };
  const nameOf = (feat: string | undefined) => {
    const i = idxOf(feat);
    return i === null ? '' : (regionNames[i] ?? '');
  };
  return {
    gen,
    option: {
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
        // 选中区域高亮（未选中的区域沿用上面的默认样式）
        regions:
          selectedIdx !== null && selectedIdx !== undefined && selectedIdx >= 0
            ? [
                {
                  name: 'r' + selectedIdx,
                  itemStyle: { areaColor: '#f6e3a3', borderColor: '#e3c874', borderWidth: 2 },
                },
              ]
            : [],
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
          formatter: (p: { name?: string }) => {
            const i = idxOf(p.name);
            if (i === null || !regionNames[i]) return '';
            const d = (regionDescs?.[i] ?? '').trim();
            const nm = escHtml(regionNames[i]);
            return d ? `${nm}<br/><span style="opacity:.7">${escHtml(d)}</span>` : nm;
          },
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
  };
}

/* ---------- 区域命名（定长补齐） ---------- */
function resolveNames(genRegions: number, saved: string[]) {
  const names = saved.slice(0, genRegions);
  while (names.length < genRegions) names.push('');
  return names.map((x, i) => x || defaultRegionNames(genRegions)[i]);
}

/* ---------- 区域地势描写（定长补齐，与 regionNames 同序） ---------- */
function resolveDescs(genRegions: number, saved?: string[]) {
  const descs = (saved ?? []).slice(0, genRegions);
  while (descs.length < genRegions) descs.push('');
  return descs;
}

/* ---------- 85% 全屏编辑弹窗 ---------- */
function MapEditorModal({
  worldId,
  maps,
  mapId,
  parentId,
  factions,
  onClose,
}: {
  worldId: string;
  maps: MapRow[];
  mapId: string | null;
  /** 新建时指定上层（子层），null 为顶层 */
  parentId?: string | null;
  factions: WorldEntity[];
  onClose: (newId?: string) => void;
}) {
  const createEntity = useCreateEntity(worldId);
  const updateEntity = useUpdateEntity(worldId);
  const deleteEntity = useDeleteEntity(worldId);
  const existing = maps.find((m) => m.entity.id === mapId) ?? null;

  const [draft, setDraft] = useState<MapV2>(() =>
    existing
      ? (JSON.parse(JSON.stringify(existing.data)) as MapV2)
      : {
          v: 2,
          name: `界·${maps.length + 1}`,
          parentId: parentId ?? null,
          parentRegion: null,
          params: { ...DEFAULT_PARAMS, seed: randSeed() },
          regionNames: [],
        },
  );
  /** 预览里点选的区域下标；null = 未点选（右侧详情面板不渲染） */
  const [selRegion, setSelRegion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof echarts.init> | null>(null);
  const clickRef = useRef<(p: any) => void>(() => {});
  const previewGen = useMemo(() => generate(draft.params), [draft.params]);
  const regionNames = useMemo(
    () => resolveNames(previewGen.regions.length, draft.regionNames),
    [previewGen, draft.regionNames],
  );
  const regionDescs = useMemo(
    () => resolveDescs(previewGen.regions.length, draft.regionDescs),
    [previewGen, draft.regionDescs],
  );
  // 预览里展示“保存后”的落点：新图还没 id，只看已有图上的
  const previewPins = useMemo(() => {
    if (!existing) return [] as { id: string; name: string; color?: string; coord: [number, number] }[];
    return factions
      .map((f) => {
        const ff = parseFacFields(f);
        if (ff.mapId !== existing.entity.id) return null;
        const idx = ff.regionIdx;
        if (idx === undefined || idx < 0 || idx >= previewGen.regions.length) return null;
        return { id: f.id, name: f.name, color: ff.color, coord: previewGen.regions[idx].centroid };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [factions, existing, previewGen]);

  // 弹窗预览图实例
  useEffect(() => {
    if (!chartRef.current) return;
    chart.current = echarts.init(chartRef.current);
    const handler = (p: unknown) => clickRef.current(p);
    chart.current.on('click', handler);
    return () => {
      chart.current?.off('click', handler);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  // 预览渲染（含点选区域高亮）
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    const built = buildOption(draft.params, regionNames, previewPins, regionDescs, selRegion);
    if (!built) {
      c.clear();
      return;
    }
    c.setOption(built.option, true);
  }, [draft.params, regionNames, regionDescs, previewPins, selRegion]);

  // 区域数变少后，已点选的下标可能越界 —— 收起详情面板
  useEffect(() => {
    setSelRegion((v) => (v !== null && v >= previewGen.regions.length ? null : v));
  }, [previewGen]);

  const patchParams = (k: keyof GenParams, v: number) =>
    setDraft((d) => ({ ...d, params: { ...d.params, [k]: v } }));

  // 区域命名 / 地势：改写某一块时，先把数组补齐到与生成区域等长，保证下标对齐
  const setRegionName = (i: number, v: string) =>
    setDraft((d) => {
      const rn = resolveNames(previewGen.regions.length, d.regionNames);
      rn[i] = v;
      return { ...d, regionNames: rn };
    });
  const setRegionDesc = (i: number, v: string) =>
    setDraft((d) => {
      const rd = resolveDescs(previewGen.regions.length, d.regionDescs);
      rd[i] = v;
      return { ...d, regionDescs: rd };
    });

  const save = async () => {
    setSaving(true);
    const payload: MapV2 = {
      ...draft,
      params: { ...draft.params, regions: previewGen.regions.length },
      regionNames,
      regionDescs,
    };
    // 已有按区域的地势描写时，旧的「整体地势」字段即被取代，一并丢弃
    if (regionDescs.some((x) => x.trim())) delete payload.desc;
    try {
      if (existing) {
        await updateEntity.mutateAsync({ id: existing.entity.id, name: draft.name, fields: JSON.stringify(payload) });
        onClose();
      } else {
        const e = await createEntity.mutateAsync({ type: 'map', name: draft.name, fields: JSON.stringify(payload) });
        onClose(e.id);
      }
    } catch (err) {
      setErrMsg('保存失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const removeMap = async () => {
    if (!existing) return;
    await deleteEntity.mutateAsync(existing.entity.id);
    onClose();
  };

  // 点击预览里的区域 → 右侧详情面板开 / 合（再点同一区即收起）
  clickRef.current = (p: unknown) => {
    const evt = p as { componentType?: string; seriesType?: string; name?: string };
    if (evt.componentType === 'series') return; // 图钉不参与区域点选
    if (evt.componentType === 'geo' && typeof evt.name === 'string') {
      const i = Number(evt.name.slice(1));
      if (Number.isFinite(i)) setSelRegion((v) => (v === i ? null : i));
    }
  };

  // 势力落点：一个势力只保留一个落点；regionIdx 传 null 表示移出
  const setFacRegion = (facId: string, regionIdx: number | null) => {
    if (!existing) return;
    const f = factions.find((x) => x.id === facId);
    if (!f) return;
    const merged: FacFields = { ...parseFacFields(f) };
    if (regionIdx === null) {
      delete merged.mapId;
      delete merged.regionIdx;
    } else {
      merged.mapId = existing.entity.id;
      merged.regionIdx = regionIdx;
    }
    void updateEntity
      .mutateAsync({ id: facId, fields: JSON.stringify(merged) })
      .catch((err) => setErrMsg('落点失败：' + (err instanceof Error ? err.message : String(err))));
  };

  // 详情面板用：此区已落点的势力 / 其余势力
  const facsHere = selRegion === null || !existing
    ? []
    : factions.filter((f) => {
        const ff = parseFacFields(f);
        return ff.mapId === existing.entity.id && ff.regionIdx === selRegion;
      });
  const facsElse = selRegion === null || !existing ? [] : factions.filter((f) => !facsHere.includes(f));

  // 上一区 / 下一区（键盘与鼠标都能用，省得在地图上来回找）
  const gotoRegion = (delta: number) => {
    setSelRegion((v) => {
      if (v === null) return v;
      const n = previewGen.regions.length;
      return (v + delta + n) % n;
    });
  };

  const parentMap = maps.find((m) => m.entity.id === draft.parentId) ?? null;
  const sliders: { k: keyof GenParams; label: string; min: number; max: number; step: number; fmt?: (v: number) => string }[] = [
    { k: 'regions', label: '区域数', min: 4, max: 28, step: 1, fmt: (v) => String(Math.round(v)) },
    { k: 'jitter', label: '不规则度', min: 0, max: 1, step: 0.02 },
  ];

  return (
    <div className="ms-mask" onClick={() => onClose()}>
      <div className="ms-modal" role="dialog" aria-modal="true" aria-label={existing ? `编辑${draft.name}` : '生成新地图'} onClick={(e) => e.stopPropagation()}>
        <div className="ms-modal-head">
          <span className="ms-modal-title">{existing ? `编辑「${draft.name}」` : '生成新地图'}</span>
          <button className="ms-layers-x" onClick={() => onClose()}>✕</button>
        </div>

        <div className="ms-modal-body">
          {/* 左：控制台 */}
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
                {existing && (
                  <button className="mini-btn" style={{ color: 'var(--seal)', marginLeft: 'auto' }} onClick={() => setDelOpen(true)}>删除本地图</button>
                )}
              </div>
            </div>

            <div className="ms-sec">
              <div className="ms-label">生成参数 · 种子 {draft.params.seed}</div>
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
              <div className="ms-row" style={{ marginTop: 6 }}>
                <button className="mini-btn" onClick={() => patchParams('seed', randSeed())}>换种子</button>
                <button className="mini-btn" style={{ flex: 1 }} onClick={() => patchParams('seed', randSeed())}>⟳ 重新生成一张</button>
              </div>
            </div>

            <div className="ms-hint">
              点击右侧地图上的任一区域，详情会在右侧浮出 —— 在那里编辑该区
              <b>名称</b>、<b>地势</b>与<b>势力落点</b>；未点选时不占地方。
            </div>

            {parentMap && (
              <div className="ms-sec">
                <div className="ms-label">嵌于上层</div>
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
              </div>
            )}
          </div>

          {/* 右：实时预览 + 按需浮出的区域详情 */}
          <div className="ms-stage">
            <div ref={chartRef} className="ms-chart ms-preview" />

            {selRegion !== null && (
              <section className="ms-rdetail" aria-label={`第 ${selRegion + 1} 区详情`}>
                <div className="ms-rd-head">
                  <span className="ms-rd-idx">第 {selRegion + 1} 区</span>
                  <div className="ms-rd-nav">
                    <button className="ms-rd-navb" onClick={() => gotoRegion(-1)} title="上一区" aria-label="上一区">‹</button>
                    <button className="ms-rd-navb" onClick={() => gotoRegion(1)} title="下一区" aria-label="下一区">›</button>
                    <button className="ms-rd-navb" onClick={() => setSelRegion(null)} title="收起详情" aria-label="收起区域详情">✕</button>
                  </div>
                </div>

                <div className="ms-rd-f">
                  <label className="ms-rd-lab" htmlFor="ms-rd-name">区域名</label>
                  <input
                    id="ms-rd-name"
                    className="ms-name"
                    placeholder="区域名"
                    value={regionNames[selRegion] ?? ''}
                    onChange={(e) => setRegionName(selRegion, e.target.value)}
                  />
                </div>

                <div className="ms-rd-f">
                  <label className="ms-rd-lab" htmlFor="ms-rd-desc">本区地势</label>
                  <textarea
                    id="ms-rd-desc"
                    className="ms-desc-in"
                    rows={4}
                    placeholder="水网 / 山脉 / 植被…"
                    value={regionDescs[selRegion] ?? ''}
                    onChange={(e) => setRegionDesc(selRegion, e.target.value)}
                  />
                </div>

                <div className="ms-rd-f">
                  <div className="ms-rd-lab">势力</div>
                  {!existing ? (
                    <div className="ms-rd-empty">保存本地图后，才能把势力放到区域上。</div>
                  ) : factions.length === 0 ? (
                    <div className="ms-rd-empty">还没有势力 —— 先在「势力组织」里创建。</div>
                  ) : (
                    <>
                      {facsHere.length === 0 && <div className="ms-rd-empty">本区尚无势力。</div>}
                      {facsHere.map((f) => {
                        const ff = parseFacFields(f);
                        return (
                          <div key={f.id} className="ms-fac-row">
                            <i className="ms-dot" style={{ background: ff.color || 'var(--accent)' }} />
                            <span className="ms-facnm" title={f.name}>{f.name}</span>
                            <button className="mini-btn" onClick={() => setFacRegion(f.id, null)}>移出</button>
                          </div>
                        );
                      })}
                      {facsElse.length > 0 && (
                        <details className="ms-rd-add">
                          <summary>＋ 把势力放到此区</summary>
                          {facsElse.map((f) => {
                            const ff = parseFacFields(f);
                            const fromOtherMap =
                              ff.mapId && ff.mapId !== existing.entity.id
                                ? maps.find((m) => m.entity.id === ff.mapId)
                                : null;
                            return (
                              <button key={f.id} className="ms-fac-add" onClick={() => setFacRegion(f.id, selRegion)}>
                                <i className="ms-dot" style={{ background: ff.color || 'var(--accent)' }} />
                                {f.name}
                                <span className="ms-fac-add-s">
                                  {fromOtherMap
                                    ? `从「${fromOtherMap.data.name}」移来`
                                    : ff.regionIdx !== undefined
                                      ? '从其他区域移来'
                                      : '未落点'}
                                </span>
                              </button>
                            );
                          })}
                        </details>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="ms-modal-foot">
          <button className="mini-btn" onClick={() => onClose()}>取消</button>
          <button className="btn-add" style={{ background: 'var(--accent)' }} onClick={save} disabled={saving || createEntity.isPending || updateEntity.isPending}>
            {saving ? '保存中…' : '保存并返回'}
          </button>
        </div>
        {errMsg && (
          <div className="form-err" role="alert">
            {errMsg}
          </div>
        )}
      </div>
      {delOpen && existing && (
        <Confirm
          title="删除地图"
          message={`删除地图「${existing.data.name}」？其子地图会失去归属。`}
          danger
          confirmText="删除"
          onConfirm={async () => {
            setDelOpen(false);
            await removeMap();
          }}
          onClose={() => setDelOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- 展示板（纯展示） ---------- */
export function MapStudio({ worldId, factions, onOpenFac }: { worldId: string; factions: WorldEntity[]; onOpenFac?: (id: string) => void }) {
  const { data: entities } = useEntities(worldId);

  const maps = useMemo(
    () =>
      (entities ?? [])
        .filter((e) => e.type === 'map')
        .map((e) => ({ entity: e, data: parseMap(e) }))
        .filter((x) => x.data !== null) as MapRow[],
    [entities],
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selRegion, setSelRegion] = useState<number | null>(null);
  const [modal, setModal] = useState<{ mapId: string | null; parentId?: string | null } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof echarts.init> | null>(null);
  const clickRef = useRef<(p: any) => void>(() => {});

  // 图表实例只初始化/销毁一次
  useEffect(() => {
    if (!chartRef.current) return;
    chart.current = echarts.init(chartRef.current);
    const handler = (p: unknown) => clickRef.current(p);
    chart.current.on('click', handler);
    return () => {
      chart.current?.off('click', handler);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  const current = maps.find((m) => m.entity.id === currentId) ?? null;

  // 初次进入只自动选中一次（修复：新建时回跳第一张导致“顶替”）
  const autoSelected = useRef(false);
  useEffect(() => {
    if (!autoSelected.current && maps.length && !currentId) {
      autoSelected.current = true;
      setCurrentId(maps[0].entity.id);
    }
  }, [maps, currentId]);

  const boardGen = useMemo(
    () => (current ? generate(current.data.params) : null),
    [current],
  );
  const boardNames = useMemo(
    () => (boardGen && current ? resolveNames(boardGen.regions.length, current.data.regionNames) : []),
    [boardGen, current],
  );
  const boardDescs = useMemo(
    () => (boardGen && current ? resolveDescs(boardGen.regions.length, current.data.regionDescs) : []),
    [boardGen, current],
  );
  const boardPins = useMemo(() => {
    if (!current || !boardGen) return [] as { id: string; name: string; color?: string; coord: [number, number] }[];
    return factions
      .map((f) => {
        const ff = parseFacFields(f);
        if (ff.mapId !== current.entity.id) return null;
        const idx = ff.regionIdx;
        if (idx === undefined || idx < 0 || idx >= boardGen.regions.length) return null;
        return { id: f.id, name: f.name, color: ff.color, coord: boardGen.regions[idx].centroid };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [factions, current, boardGen]);

  // 切图时清空区域选中
  useEffect(() => {
    setSelRegion(null);
  }, [currentId]);

  // 展示渲染
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    if (!current || !boardGen) {
      c.clear();
      return;
    }
    const built = buildOption(current.data.params, boardNames, boardPins, boardDescs, selRegion);
    if (!built) {
      c.clear();
      return;
    }
    c.setOption(built.option, true);
  }, [current, boardGen, boardNames, boardDescs, boardPins, selRegion]);

  // 图钉点击 → 打开势力；区域点击 → 选中查看该区地势
  clickRef.current = (p: { componentType?: string; seriesType?: string; name?: string; data?: { facId?: string } }) => {
    if (p.componentType === 'series' && p.seriesType === 'scatter' && p.data?.facId) {
      onOpenFac?.(p.data.facId);
      return;
    }
    if (p.componentType === 'geo' && typeof p.name === 'string') {
      const i = Number(p.name.slice(1));
      if (Number.isFinite(i)) setSelRegion((v) => (v === i ? null : i));
    }
  };

  /* 图层树 */
  const layerRows = useMemo(() => {
    const ids = new Set(maps.map((m) => m.entity.id));
    const roots = maps.filter((m) => !m.data.parentId || !ids.has(m.data.parentId));
    const rows: { m: MapRow; depth: number }[] = [];
    const walk = (list: MapRow[], depth: number) => {
      for (const m of list) {
        rows.push({ m, depth });
        walk(maps.filter((x) => x.data.parentId === m.entity.id), depth + 1);
      }
    };
    walk(roots, 0);
    return rows;
  }, [maps]);

  return (
    <div className="ms-grid ms-view">
      <div className="ms-stage">
        {maps.length === 0 ? (
          <div className="ms-empty">
            <div className="ms-empty-title">这张世界还没有地图</div>
            <div className="ms-empty-sub">生成一张大陆地图，把势力的疆域铺在上面。</div>
            <button className="btn-add" style={{ background: 'var(--accent)' }} onClick={() => setModal({ mapId: null })}>
              ✦ 生成第一张地图
            </button>
          </div>
        ) : (
          <div ref={chartRef} className="ms-chart" />
        )}

        {maps.length > 0 && (
          <div className="ms-toolbar">
            <button
              className="ms-tbtn"
              onClick={() => current && setModal({ mapId: current.entity.id })}
              title="编辑当前地图"
            >
              编辑地图
            </button>
            <button
              className="ms-tbtn"
              onClick={() => setModal({ mapId: null })}
              title="生成新地图"
              aria-label="生成新地图"
            >
              ＋ 新建
            </button>
            <button
              className={'ms-tbtn' + (layersOpen ? ' active' : '')}
              onClick={() => setLayersOpen((v) => !v)}
              aria-expanded={layersOpen}
              title="图层"
            >
              图层
            </button>
          </div>
        )}

        {layersOpen && maps.length > 0 && (
          <div className="ms-layers">
            <div className="ms-layers-head">
              <span>图层</span>
              <button className="ms-layers-x" onClick={() => setLayersOpen(false)}>✕</button>
            </div>
            <div className="ms-layers-list">
              {layerRows.map(({ m, depth }) => (
                <button
                  key={m.entity.id}
                  className={'ms-lrow' + (m.entity.id === currentId ? ' active' : '')}
                  style={{ paddingLeft: 10 + depth * 16 }}
                  onClick={() => setCurrentId(m.entity.id)}
                >
                  {depth > 0 && <span className="ms-lbranch">└</span>}
                  {m.data.name}
                </button>
              ))}
            </div>
            <div className="ms-layers-foot">
              <button className="mini-btn" style={{ flex: 1 }} onClick={() => setModal({ mapId: null, parentId: current?.data.parentId ?? null })}>＋ 平级层</button>
              <button className="mini-btn" style={{ flex: 1 }} onClick={() => setModal({ mapId: null, parentId: current?.entity.id ?? null })}>＋ 子层</button>
            </div>
          </div>
        )}

        {/* 区域地势：点选某一块区域，读该区的地势描写 */}
        {selRegion !== null && boardNames[selRegion] ? (
          <div className="ms-desc-card">
            <div className="ms-desc-t">{boardNames[selRegion]}</div>
            <div className="ms-desc-b">
              {boardDescs[selRegion]?.trim() || '这一区还没有地势描写。'}
            </div>
          </div>
        ) : boardDescs.some((d) => d.trim()) ? (
          <div className="ms-desc-hint">点击地图上的区域，查看该区地势</div>
        ) : current?.data.desc ? (
          // 旧数据回退：早期版本存的是「整体地势」单条描述
          <div className="ms-desc-card">{current.data.desc}</div>
        ) : null}
      </div>

      {modal && (
        <MapEditorModal
          worldId={worldId}
          maps={maps}
          mapId={modal.mapId}
          parentId={modal.parentId}
          factions={factions}
          onClose={(newId) => {
            setModal(null);
            if (newId) setCurrentId(newId);
          }}
        />
      )}
    </div>
  );
}
