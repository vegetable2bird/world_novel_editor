import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorlds, useUpdateWorld } from '../hooks/useWorlds';
import { useCreateTemplate } from '../hooks/useTemplates';
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useRelations,
  useCreateRelation,
  useDeleteRelation,
  useTimeline,
  useCreateTimeline,
  useUpdateTimeline,
  useDeleteTimeline,
} from '../hooks/useEntities';
import { Modal, Field } from '../components/Modal';
import type { WorldEntity, EntityRelation, TimelineEvent } from '../api/types';

// ===== 常量 =====
const FAC_COLORS = ['#c8453a', '#d4af37', '#3a6ec8', '#5f9e6f', '#9b59b6', '#c77d3a'];
const TERRAIN = [
  { label: '平原', color: '#1d2740' },
  { label: '丘陵', color: '#243353' },
  { label: '山地', color: '#2f456b' },
  { label: '高地', color: '#3a5a86' },
  { label: '雪峰', color: '#557aa8' },
];
const FAC_KINDS = ['国家', '组织', '门派', '商会'];
const REL_KINDS = ['中立', '同盟', '附庸', '敌对'];
const ENTITY_TYPES = ['人物', '地点', '组织', '物品', '地理', '种族', '规则'];

interface FFac {
  kind: string;
  desc: string;
  color: string;
  x: number;
  y: number;
}
interface FSkill {
  desc: string;
  level: number;
}
interface FEnt {
  desc: string;
}
interface FMap {
  w: number;
  h: number;
  terrain: number[];
}
interface FDev {
  dims: Record<string, number>;
}

function parse<T>(s: string | null | undefined, fb: T): T {
  if (!s) return fb;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fb;
  }
}
const j = (v: unknown) => JSON.stringify(v);

function relColor(kind: string): string {
  if (kind === '敌对' || kind === '战争') return 'var(--seal)';
  if (kind === '同盟' || kind === '附庸') return '#5f9e6f';
  return 'var(--border)';
}

export function WorldDetail() {
  const { worldId = '' } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { data: worlds, isLoading: worldsLoading } = useWorlds();
  const world = worlds?.find((w) => w.id === worldId);
  const updateWorld = useUpdateWorld();
  const createTpl = useCreateTemplate();

  const { data: entities, isLoading: entLoading } = useEntities(worldId);
  const { data: relations } = useRelations(worldId);
  const { data: timeline } = useTimeline(worldId);

  const factions = useMemo(() => (entities ?? []).filter((e) => e.type === 'faction'), [entities]);
  const skills = useMemo(() => (entities ?? []).filter((e) => e.type === 'skill'), [entities]);
  const genEntities = useMemo(
    () => (entities ?? []).filter((e) => !['faction', 'skill', 'map', 'dev'].includes(e.type)),
    [entities],
  );
  const mapEntity = entities?.find((e) => e.type === 'map');
  const devEntity = entities?.find((e) => e.type === 'dev');

  const [tab, setTab] = useState('overview');

  // 实体 mutations
  const createEntity = useCreateEntity(worldId);
  const updateEntity = useUpdateEntity(worldId);
  const deleteEntity = useDeleteEntity(worldId);
  const createRelation = useCreateRelation(worldId);
  const deleteRelation = useDeleteRelation(worldId);
  const createTimeline = useCreateTimeline(worldId);
  const updateTimeline = useUpdateTimeline(worldId);
  const deleteTimeline = useDeleteTimeline(worldId);

  // 模态状态
  const [facModal, setFacModal] = useState<{ id?: string; x?: number; y?: number } | null>(null);
  const [skillModal, setSkillModal] = useState<{ id?: string } | null>(null);
  const [entModal, setEntModal] = useState<{ id?: string } | null>(null);
  const [tlModal, setTlModal] = useState<{ id?: string } | null>(null);
  const [relModal, setRelModal] = useState<string | null>(null);
  const [introModal, setIntroModal] = useState(false);
  const [devModal, setDevModal] = useState(false);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState<{ name: string; description: string; coverColor: string; category: string; visibility: string }>({
    name: '',
    description: '',
    coverColor: '#d4af37',
    category: '',
    visibility: 'private',
  });

  // 地图
  const [map, setMap] = useState<FMap>({ w: 7, h: 5, terrain: Array(35).fill(0) });
  const [placing, setPlacing] = useState(false);
  useEffect(() => {
    if (mapEntity) setMap(parse<FMap>(mapEntity.fields, { w: 7, h: 5, terrain: Array(35).fill(0) }));
  }, [mapEntity]);

  // 表单草稿
  const [facForm, setFacForm] = useState<{ name: string; kind: string; desc: string; color: string }>({
    name: '',
    kind: '国家',
    desc: '',
    color: FAC_COLORS[0],
  });
  const [skillForm, setSkillForm] = useState<{ name: string; desc: string; level: number }>({
    name: '',
    desc: '',
    level: 3,
  });
  const [entForm, setEntForm] = useState<{ name: string; type: string; desc: string }>({
    name: '',
    type: '人物',
    desc: '',
  });
  const [tlForm, setTlForm] = useState<{ at: string; title: string; description: string }>({
    at: '',
    title: '',
    description: '',
  });
  const [introForm, setIntroForm] = useState('');
  const [devDims, setDevDims] = useState<Record<string, number>>({});
  const [relTargets, setRelTargets] = useState<{ id: string; name: string; kind: string }[]>([]);

  function openFac(id?: string, x?: number, y?: number) {
    const e = id ? entities?.find((v) => v.id === id) : null;
    const f = e ? parse<FFac>(e.fields, { kind: '国家', desc: '', color: FAC_COLORS[0], x: 0, y: 0 }) : null;
    setFacForm({
      name: e?.name ?? '',
      kind: f?.kind ?? '国家',
      desc: f?.desc ?? '',
      color: f?.color ?? FAC_COLORS[factions.length % FAC_COLORS.length] ?? FAC_COLORS[0],
    });
    setFacModal({ id, x, y });
  }
  function openSkill(id?: string) {
    const e = id ? entities?.find((v) => v.id === id) : null;
    const f = e ? parse<FSkill>(e.fields, { desc: '', level: 3 }) : null;
    setSkillForm({ name: e?.name ?? '', desc: f?.desc ?? '', level: f?.level ?? 3 });
    setSkillModal({ id });
  }
  function openEnt(id?: string) {
    const e = id ? entities?.find((v) => v.id === id) : null;
    const f = e ? parse<FEnt>(e.fields, { desc: '' }) : null;
    setEntForm({ name: e?.name ?? '', type: e?.type ?? '人物', desc: f?.desc ?? '' });
    setEntModal({ id });
  }
  function openTl(id?: string) {
    const e = id ? timeline?.find((v) => v.id === id) : null;
    setTlForm({ at: e?.at ?? '', title: e?.title ?? '', description: e?.description ?? '' });
    setTlModal({ id });
  }
  function openRel(fid: string) {
    const others = factions.filter((f) => f.id !== fid);
    const existing = (relations ?? []).filter((r) => r.sourceId === fid);
    setRelTargets(
      others.map((o) => {
        const rel = existing.find((r) => r.targetId === o.id);
        return { id: o.id, name: o.name, kind: rel?.kind ?? '中立' };
      }),
    );
    setRelModal(fid);
  }
  function openDev() {
    setDevDims(devEntity ? parse<FDev>(devEntity.fields, { dims: {} }).dims : {});
    setDevModal(true);
  }

  function cycleCell(x: number, y: number) {
    setMap((m) => {
      const terrain = [...m.terrain];
      const i = y * m.w + x;
      terrain[i] = (terrain[i] + 1) % 5;
      return { ...m, terrain };
    });
  }
  async function saveMap() {
    if (mapEntity) await updateEntity.mutateAsync({ id: mapEntity.id, fields: j(map) });
    else await createEntity.mutateAsync({ type: 'map', name: '__map__', fields: j(map) });
  }
  function onCellClick(x: number, y: number) {
    if (placing) {
      const occ = factions.some((f) => {
        const ff = parse<FFac>(f.fields, { x: 0, y: 0 } as FFac);
        return ff.x === x && ff.y === y;
      });
      if (occ) {
        alert('该格已有势力');
        return;
      }
      setPlacing(false);
      openFac(undefined, x, y);
    } else {
      cycleCell(x, y);
    }
  }
  async function saveFaction() {
    const nm = facForm.name.trim();
    if (!nm) return;
    const fields = j({
      kind: facForm.kind,
      desc: facForm.desc,
      color: facForm.color,
      x: facModal?.x ?? 0,
      y: facModal?.y ?? 0,
    });
    if (facModal?.id) await updateEntity.mutateAsync({ id: facModal.id, name: nm, fields });
    else await createEntity.mutateAsync({ type: 'faction', name: nm, fields });
    setFacModal(null);
  }
  async function saveSkill() {
    const nm = skillForm.name.trim();
    if (!nm) return;
    const fields = j({ desc: skillForm.desc, level: Math.max(1, Math.min(5, skillForm.level || 3)) });
    if (skillModal?.id) await updateEntity.mutateAsync({ id: skillModal.id, name: nm, fields });
    else await createEntity.mutateAsync({ type: 'skill', name: nm, fields });
    setSkillModal(null);
  }
  async function saveEnt() {
    const nm = entForm.name.trim();
    if (!nm) return;
    const fields = j({ desc: entForm.desc });
    if (entModal?.id) await updateEntity.mutateAsync({ id: entModal.id, name: nm, type: entForm.type, fields });
    else await createEntity.mutateAsync({ type: entForm.type, name: nm, fields });
    setEntModal(null);
  }
  async function saveTimeline() {
    const ti = tlForm.title.trim();
    if (!ti) return;
    if (tlModal?.id) await updateTimeline.mutateAsync({ id: tlModal.id, ...tlForm });
    else await createTimeline.mutateAsync({ ...tlForm });
    setTlModal(null);
  }
  async function saveRelations() {
    const fid = relModal!;
    const existing = (relations ?? []).filter((r) => r.sourceId === fid);
    for (const r of existing) await deleteRelation.mutateAsync(r.id);
    for (const o of relTargets) {
      if (o.kind && o.kind !== '中立')
        await createRelation.mutateAsync({ sourceId: fid, targetId: o.id, kind: o.kind, label: o.kind });
    }
    setRelModal(null);
  }
  async function saveIntro() {
    if (world) await updateWorld.mutateAsync({ id: world.id, description: introForm });
    setIntroModal(false);
  }
  async function saveDev() {
    const fields = j({ dims: devDims });
    if (devEntity) await updateEntity.mutateAsync({ id: devEntity.id, fields });
    else await createEntity.mutateAsync({ type: 'dev', name: '__dev__', fields });
    setDevModal(false);
  }
  function openSaveTpl() {
    if (!world) return;
    setTplForm({
      name: `${world.name} 模板`,
      description: world.description ?? '',
      coverColor: world.coverColor || '#d4af37',
      category: '',
      visibility: 'private',
    });
    setSaveTplOpen(true);
  }
  async function saveTpl() {
    if (!world || !tplForm.name.trim()) return;
    await createTpl.mutateAsync({
      name: tplForm.name,
      description: tplForm.description,
      coverColor: tplForm.coverColor,
      category: tplForm.category,
      visibility: tplForm.visibility,
      worldId: world.id,
    });
    setSaveTplOpen(false);
  }

  if (worldsLoading) return <p className="muted">…</p>;
  if (!world) return <p className="muted">世界不存在 · <button className="link" onClick={() => nav('/wanjie')}>返回万界</button></p>;

  const facRelChips = (fid: string) =>
    (relations ?? [])
      .filter((r) => r.sourceId === fid)
      .map((r) => {
        const tgt = factions.find((f) => f.id === r.targetId);
        return (
          <span key={r.id} className="rel-chip" style={{ borderColor: relColor(r.kind), color: relColor(r.kind) }}>
            {tgt?.name ?? '?'} · {r.kind}
          </span>
        );
      });

  return (
    <section>
      {/* 面包屑 */}
      <div className="crumb-nav">
        <span>世界</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-cur">{world.name}</span>
        <span className="crumb-tools">
          <button className="mini-btn" onClick={openSaveTpl}>
            💾 存为模板
          </button>
          <button className="mini-btn" onClick={() => nav('/wanjie')}>
            🧭 跳转万界
          </button>
        </span>
      </div>

      {/* 头部 */}
      <div className="detail-head">
        <div className="cover" style={{ background: world.coverColor || 'linear-gradient(135deg,#c8453a,#8a2f6b)' }}>
          {world.name.charAt(0)}
        </div>
        <div>
          <h1 className="title serif" style={{ fontSize: 30, marginBottom: 4 }}>
            {world.name}
          </h1>
          <div className="muted" style={{ fontSize: 14 }}>
            由「林墨」创建 · 世界观
          </div>
          <div className="tagrow">
            <span className="tag">{factions.length} 势力</span>
            <span className="tag">{skills.length} 技能</span>
            <span className="tag">{genEntities.length} 实体</span>
            <span className="tag">{(timeline ?? []).length} 时间线</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs2">
        {[
          ['overview', '概览'],
          ['map', '大陆地图'],
          ['fac', '势力组织'],
          ['skill', '技能发展'],
          ['entity', '实体'],
          ['graph', '关系图'],
          ['timeline', '时间线'],
        ].map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {/* 概览 */}
      {tab === 'overview' && (
        <div className="panel2 active">
          <div className="redline">
            📌 <div>当前为<b>基础世界（正典）</b>。每本书在「书籍管理 → 世界管理」中拥有自己的世界副本，副本的演化不会回写此处。</div>
          </div>
          <div className="footnote" style={{ marginBottom: 14 }}>
            提示：进入任意书籍 → 管理流 → 世界管理，即可打开 / 派生本书专属的世界副本。
          </div>
          <div className="card">
            <h3 className="section-h" style={{ marginTop: 0 }}>
              世界简介
            </h3>
            <p className="muted">{(world.description || '（暂无简介）')}</p>
            <button className="mini-btn" style={{ marginTop: 12 }} onClick={() => { setIntroForm(world.description ?? ''); setIntroModal(true); }}>
              ✎ 编辑简介
            </button>
          </div>
          <div className="footnote">大陆地图、势力组织、技能发展均为可交互模块，编辑即时落盘到你的万界。</div>
        </div>
      )}

      {/* 大陆地图 */}
      {tab === 'map' && (
        <div className="panel2 active">
          <div
            className="map"
            style={{ gridTemplateColumns: `repeat(${map.w}, 1fr)` }}
          >
            {Array.from({ length: map.h }).map((_, y) =>
              Array.from({ length: map.w }).map((__, x) => {
                const h = map.terrain[y * map.w + x];
                return (
                  <div
                    key={`${x}-${y}`}
                    className="cell"
                    style={{ background: TERRAIN[h].color }}
                    onClick={() => onCellClick(x, y)}
                    title={TERRAIN[h].label}
                  >
                    {TERRAIN[h].label}
                  </div>
                );
              }),
            )}
            {factions.map((f) => {
              const ff = parse<FFac>(f.fields, { x: 0, y: 0 } as FFac);
              return (
                <div
                  key={f.id}
                  className="ftok"
                  style={{ left: `${((ff.x + 0.5) / map.w) * 100}%`, top: `${((ff.y + 0.5) / map.h) * 100}%`, background: ff.color }}
                  onClick={() => openFac(f.id)}
                  title={f.name}
                >
                  {f.name.charAt(0)}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="mini-btn" onClick={() => setPlacing((p) => !p)} style={placing ? { borderColor: 'var(--accent)' } : undefined}>
              ＋ 在地图上放置势力
            </button>
            <button className="mini-btn" onClick={saveMap}>
              💾 保存地图
            </button>
          </div>
          <div className="map-hint">点击格子可循环切换地势（平原→丘陵→山地→高地→雪峰）；进入「放置势力」后点空格落子。势力圆点可点击编辑。</div>
          <div id="facMapList">
            {factions.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>尚未在地图上放置势力。</p>
            ) : (
              factions.map((f) => {
                const ff = parse<FFac>(f.fields, { x: 0, y: 0 } as FFac);
                return (
                  <div key={f.id} className="rel" style={{ cursor: 'pointer' }} onClick={() => openFac(f.id)}>
                    <div className="av" style={{ background: ff.color }}>{f.name.charAt(0)}</div>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{f.name}</div>
                      <div className="rt">{ff.kind} · {TERRAIN[map.terrain[ff.y * map.w + ff.x]]?.label} · ({ff.x},{ff.y})</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 势力组织 */}
      {tab === 'fac' && (
        <div className="panel2 active">
          {entLoading ? (
            <p className="muted">…</p>
          ) : factions.length === 0 ? (
            <div className="dtable-empty">暂无势力 / 组织。点击下方新增，或在地图上放置。</div>
          ) : (
            <div className="fac-grid">
              {factions.map((f) => {
                const ff = parse<FFac>(f.fields, { kind: '', desc: '', color: '#888', x: 0, y: 0 } as FFac);
                const chips = facRelChips(f.id) as React.ReactNode[];
                return (
                  <div key={f.id} className="fac-card">
                    <div className="fac-top">
                      <div className="fac-dot" style={{ background: ff.color }}>
                        {f.name.charAt(0)}
                      </div>
                      <div className="fac-id">
                        <div className="fac-name">{f.name}</div>
                        {ff.kind && <span className="pill">{ff.kind}</span>}
                      </div>
                    </div>
                    <div className="fac-desc muted">{ff.desc || '（暂无简介）'}</div>
                    <div className="fac-rel">{chips.length > 0 ? chips : <span className="muted">无外交关系</span>}</div>
                    <div className="ch-acts">
                      <button className="link" onClick={() => openFac(f.id)}>
                        编辑
                      </button>
                      <button className="link" onClick={() => openRel(f.id)}>
                        关系
                      </button>
                      <button className="link danger" onClick={() => deleteEntity.mutateAsync(f.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn-add" style={{ marginTop: 12 }} onClick={() => openFac()}>
            ＋ 新增势力 / 组织
          </button>
        </div>
      )}

      {/* 技能发展 */}
      {tab === 'skill' && (
        <div className="panel2 active">
          {skills.length === 0 ? (
            <div className="dtable-empty">暂无世界级技能。</div>
          ) : (
            <div className="sk-list">
              {skills.map((s) => {
                const ff = parse<FSkill>(s.fields, { desc: '', level: 3 });
                return (
                  <div key={s.id} className="sk-row">
                    <div className="sk-main">
                      <div className="sk-name">{s.name}</div>
                      <div className="sk-desc muted">{ff.desc || '—'}</div>
                    </div>
                    <div className="sk-lv">
                      <span className="mini-bar">
                        <i style={{ width: `${ff.level * 20}%` }} />
                      </span>
                      <span className="cs">L{ff.level}</span>
                    </div>
                    <div className="sk-acts">
                      <button className="link" onClick={() => openSkill(s.id)}>
                        编辑
                      </button>
                      <button className="link danger" onClick={() => deleteEntity.mutateAsync(s.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn-add" style={{ marginTop: 12 }} onClick={() => openSkill()}>＋ 新增技能</button>
          <div className="card" style={{ marginTop: 18 }}>
            <h3 className="section-h" style={{ marginTop: 0 }}>世界发展状况</h3>
            {Object.keys(devDims).length === 0 ? (
              <p className="muted">暂无发展度信息。</p>
            ) : (
              Object.entries(devDims).map(([k, v]) => (
                <div key={k} className="dev-meter">
                  <div className="lab"><span>{k}</span><span>{v} / 5</span></div>
                  <div className="skill-bar"><div style={{ width: `${v * 20}%` }} /></div>
                </div>
              ))
            )}
            <button className="mini-btn" style={{ marginTop: 10 }} onClick={openDev}>✎ 调整发展度</button>
          </div>
        </div>
      )}

      {/* 实体 */}
      {tab === 'entity' && (
        <div className="panel2 active">
          {genEntities.length === 0 ? (
            <div className="dtable-empty">暂无实体，可在「实体」中逐步补充。</div>
          ) : (
            <div className="ent-list">
              {genEntities.map((e) => {
                const ff = parse<FEnt>(e.fields, { desc: '' });
                return (
                  <div key={e.id} className="ent-row">
                    <span className="pill">{e.type}</span>
                    <div className="ent-main">
                      <div className="ent-name">{e.name}</div>
                      <div className="ent-desc muted">{ff.desc || '—'}</div>
                    </div>
                    <div className="ent-acts">
                      <button className="link" onClick={() => openEnt(e.id)}>
                        编辑
                      </button>
                      <button className="link danger" onClick={() => deleteEntity.mutateAsync(e.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn-add" style={{ marginTop: 12 }} onClick={() => openEnt()}>＋ 新增实体</button>
        </div>
      )}

      {/* 关系图 */}
      {tab === 'graph' && (
        <div className="panel2 active">
          <div className="graph-wrap">
            <GraphSvg factions={factions} relations={relations ?? []} />
            <div className="footnote">关系图：节点为势力，连线为关系（红=敌对 / 绿=同盟·附庸 / 灰=中立）。</div>
          </div>
        </div>
      )}

      {/* 时间线 */}
      {tab === 'timeline' && (
        <div className="panel2 active">
          {(timeline ?? []).length === 0 ? (
            <div className="dtable-empty">暂无时间线事件，点下方「＋ 新增时间线事件」记录世界史。</div>
          ) : (
            <div className="timeline">
              {(timeline ?? []).map((e) => (
                <div key={e.id} className="tl-item">
                  <div className="tl-t">{e.at || '—'}</div>
                  <div className="tl-d">
                    <b>{e.title}</b>
                    {e.description ? <div className="muted">{e.description}</div> : null}
                    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                      <button className="link" onClick={() => openTl(e.id)}>编辑</button>
                      <button className="link danger" onClick={() => deleteTimeline.mutateAsync(e.id)}>删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn-add" style={{ marginTop: 6 }} onClick={() => openTl()}>＋ 新增时间线事件</button>
        </div>
      )}

      {/* ===== 模态 ===== */}
      {facModal && (
        <Modal title={facModal.id ? '编辑势力' : '新增势力'} onClose={() => setFacModal(null)}>
          <Field label="名称">
            <input value={facForm.name} onChange={(e) => setFacForm({ ...facForm, name: e.target.value })} autoFocus />
          </Field>
          <Field label="类型">
            <select value={facForm.kind} onChange={(e) => setFacForm({ ...facForm, kind: e.target.value })}>
              {FAC_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="简介">
            <textarea value={facForm.desc} onChange={(e) => setFacForm({ ...facForm, desc: e.target.value })} />
          </Field>
          <Field label="标记色">
            <div style={{ display: 'flex', gap: 8 }}>
              {FAC_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFacForm({ ...facForm, color: c })}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: c,
                    border: facForm.color === c ? '2px solid var(--ink)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </Field>
          {facModal.x !== undefined && <div className="small-note">将放置于地图坐标 ({facModal.x},{facModal.y})</div>}
          <div className="modal-actions">
            <button className="primary" onClick={saveFaction} disabled={createEntity.isPending || updateEntity.isPending}>保存</button>
          </div>
        </Modal>
      )}

      {skillModal && (
        <Modal title={skillModal.id ? '编辑技能' : '新增技能'} onClose={() => setSkillModal(null)}>
          <Field label="技能名">
            <input value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} autoFocus />
          </Field>
          <Field label="说明">
            <input value={skillForm.desc} onChange={(e) => setSkillForm({ ...skillForm, desc: e.target.value })} />
          </Field>
          <Field label="等级（1-5）">
            <input type="number" min={1} max={5} value={skillForm.level} onChange={(e) => setSkillForm({ ...skillForm, level: Number(e.target.value) })} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={saveSkill} disabled={createEntity.isPending || updateEntity.isPending}>保存</button>
          </div>
        </Modal>
      )}

      {entModal && (
        <Modal title={entModal.id ? '编辑实体' : '新增实体'} onClose={() => setEntModal(null)}>
          <Field label="名称">
            <input value={entForm.name} onChange={(e) => setEntForm({ ...entForm, name: e.target.value })} autoFocus />
          </Field>
          <Field label="类型">
            <select value={entForm.type} onChange={(e) => setEntForm({ ...entForm, type: e.target.value })}>
              {ENTITY_TYPES.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="描述">
            <textarea value={entForm.desc} onChange={(e) => setEntForm({ ...entForm, desc: e.target.value })} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={saveEnt} disabled={createEntity.isPending || updateEntity.isPending}>保存</button>
          </div>
        </Modal>
      )}

      {tlModal && (
        <Modal title={tlModal.id ? '编辑时间线' : '新增时间线'} onClose={() => setTlModal(null)}>
          <Field label="时间 / 锚点">
            <input value={tlForm.at} onChange={(e) => setTlForm({ ...tlForm, at: e.target.value })} placeholder="如：纪元 327 年" />
          </Field>
          <Field label="事件">
            <input value={tlForm.title} onChange={(e) => setTlForm({ ...tlForm, title: e.target.value })} autoFocus />
          </Field>
          <Field label="描述">
            <textarea value={tlForm.description} onChange={(e) => setTlForm({ ...tlForm, description: e.target.value })} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={saveTimeline} disabled={createTimeline.isPending || updateTimeline.isPending}>保存</button>
          </div>
        </Modal>
      )}

      {relModal && (
        <Modal title={`「${factions.find((f) => f.id === relModal)?.name}」的关系网`} onClose={() => setRelModal(null)}>
          {relTargets.length === 0 ? (
            <p className="muted">需要至少两个势力才能建立关系。</p>
          ) : (
            relTargets.map((o) => (
              <div className="form-row" key={o.id}>
                <div style={{ flex: 1 }}>
                  <label className="field">{o.name}</label>
                  <select className="field" value={o.kind} onChange={(e) => setRelTargets((arr) => arr.map((x) => (x.id === o.id ? { ...x, kind: e.target.value } : x)))}>
                    {REL_KINDS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
          <div className="modal-actions">
            <button className="primary" onClick={saveRelations} disabled={createRelation.isPending || deleteRelation.isPending}>保存关系</button>
          </div>
        </Modal>
      )}

      {introModal && (
        <Modal title="编辑世界简介" onClose={() => setIntroModal(false)}>
          <Field label="简介">
            <textarea rows={4} value={introForm} onChange={(e) => setIntroForm(e.target.value)} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={saveIntro} disabled={updateWorld.isPending}>保存</button>
          </div>
        </Modal>
      )}

      {devModal && (
        <Modal title="调整发展状况" onClose={() => setDevModal(false)}>
          {Object.keys(devDims).map((k) => (
            <div className="form-row" key={k}>
              <div style={{ flex: 1 }}>
                <label className="field">{k}</label>
                <input type="number" min={0} max={5} value={devDims[k]} onChange={(e) => setDevDims((d) => ({ ...d, [k]: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }))} />
              </div>
            </div>
          ))}
          <div className="small-note">新增维度（值 0-5）：</div>
          <Field label="维度名">
            <input id="dev_new" placeholder="如：魔法 / 宗教" />
          </Field>
          <Field label="值">
            <input id="dev_newv" type="number" min={0} max={5} placeholder="0-5" />
          </Field>
          <div className="modal-actions">
            <button
              className="primary"
              onClick={() => {
                const nk = (document.getElementById('dev_new') as HTMLInputElement)?.value.trim();
                const nv = (document.getElementById('dev_newv') as HTMLInputElement)?.value;
                if (nk) setDevDims((d) => ({ ...d, [nk]: Math.max(0, Math.min(5, Number(nv) || 0)) }));
                saveDev();
              }}
            >
              保存
            </button>
          </div>
        </Modal>
      )}

      {saveTplOpen && (
        <Modal title="存为模板" onClose={() => setSaveTplOpen(false)}>
          <Field label="模板名">
            <input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} autoFocus />
          </Field>
          <Field label="简介">
            <textarea value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} />
          </Field>
          <Field label="分类">
            <input value={tplForm.category} onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })} placeholder="如：西幻 / 都市 / 废土" />
          </Field>
          <Field label="封面色">
            <input value={tplForm.coverColor} onChange={(e) => setTplForm({ ...tplForm, coverColor: e.target.value })} placeholder="#d4af37" />
          </Field>
          <Field label="可见性">
            <select value={tplForm.visibility} onChange={(e) => setTplForm({ ...tplForm, visibility: e.target.value })}>
              <option value="private">private（仅自己）</option>
              <option value="public">public（他人可套用）</option>
            </select>
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={saveTpl} disabled={createTpl.isPending}>
              {t('actions.save')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ===== 关系图 SVG =====
function GraphSvg({ factions, relations }: { factions: WorldEntity[]; relations: EntityRelation[] }) {
  if (factions.length === 0)
    return <p className="muted" style={{ textAlign: 'center' }}>暂无势力，绘制不出关系图</p>;
  const n = factions.length;
  const cx = 280;
  const cy = 160;
  const R = 120;
  const pts = factions.map((f, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { f, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });
  const byId = (id: string) => pts.find((p) => p.f.id === id);
  const lines = relations
    .map((r) => {
      const s = byId(r.sourceId);
      const tgt = byId(r.targetId);
      if (!s || !tgt) return null;
      return (
        <line key={r.id} x1={s.x} y1={s.y} x2={tgt.x} y2={tgt.y} stroke={relColor(r.kind)} strokeWidth={2} />
      );
    })
    .filter(Boolean);
  const nodes = pts.map((p) => (
    <g key={p.f.id}>
      <circle cx={p.x} cy={p.y} r={24} fill={parse<FFac>(p.f.fields, { color: '#888' } as FFac).color} />
      <text x={p.x} y={p.y + 5} fill="#fff" textAnchor="middle" fontSize={13} fontFamily="Songti SC">
        {p.f.name.charAt(0)}
      </text>
    </g>
  ));
  return (
    <svg viewBox="0 0 560 320" width="100%" style={{ maxHeight: 360 }}>
      {lines}
      {nodes}
    </svg>
  );
}
