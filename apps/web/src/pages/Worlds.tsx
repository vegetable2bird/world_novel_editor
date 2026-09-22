import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorlds, useCreateWorld, useUpdateWorld, useDeleteWorld } from '../hooks/useWorlds';
import { useTemplates, useForkTemplate } from '../hooks/useTemplates';
import { Modal, Field } from '../components/Modal';
import type { World, CreateWorldInput } from '../api/types';

export function Worlds() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: worlds, isLoading, isError } = useWorlds();
  const create = useCreateWorld();
  const update = useUpdateWorld();
  const remove = useDeleteWorld();
  const fork = useForkTemplate();
  const { data: tpls } = useTemplates('all');

  const [editing, setEditing] = useState<World | null>(null);
  const [open, setOpen] = useState(false); // 空白世界表单
  const [mode, setMode] = useState<'choice' | 'pick' | null>(null); // 新建入口选择
  const [form, setForm] = useState<CreateWorldInput>({ name: '' });

  function openCreate() {
    setEditing(null);
    setForm({ name: '' });
    setMode('choice');
  }
  function openEdit(w: World) {
    setEditing(w);
    setForm({ name: w.name, description: w.description ?? '', visibility: w.visibility ?? '', coverColor: w.coverColor ?? '' });
    setOpen(true);
  }
  async function submit() {
    if (!form.name.trim()) return;
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...form });
    } else {
      await create.mutateAsync(form);
    }
    setOpen(false);
  }
  async function onDelete(w: World) {
    if (confirm(`${t('actions.delete')}：${w.name}？`)) await remove.mutateAsync(w.id);
  }
  async function onFork(id: string) {
    const res = await fork.mutateAsync({ id });
    setMode(null);
    nav(`/wanjie/${res.worldId}`);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{t('wanjie.title')}</h2>
          <p className="muted">{t('wanjie.desc')}</p>
        </div>
        <button className="primary" onClick={openCreate}>
          ＋ {t('wanjie.newWorld')}
        </button>
      </div>

      {/* 世界封面卡 */}
      {isLoading && <div className="dtable-empty">…</div>}
      {isError && <div className="dtable-empty err">{t('common.error')}</div>}
      {worlds && worlds.length === 0 && (
        <button className="wv-card wv-add" onClick={openCreate}>
          <span className="wv-plus">＋</span>
          <span>{t('wanjie.empty')}</span>
        </button>
      )}
      <div className="wv-grid">
        {worlds?.map((w) => (
          <div key={w.id} className="wv-card" onClick={() => nav('/wanjie/' + w.id)}>
            <div
              className="wv-cover"
              style={{ background: w.coverColor || 'linear-gradient(135deg, #8a7bd8, #6d4fd0)' }}
            >
              {w.name.charAt(0)}
            </div>
            <div className="wv-body">
              <div className="wv-name">{w.name}</div>
              <div className="wv-desc">{w.description || '（暂无简介）'}</div>
              <div className="wv-meta">
                <span>{w._count?.books ?? 0} 书籍</span>
                <span>·</span>
                <span>{w._count?.characters ?? 0} 角色</span>
              </div>
            </div>
            <div
              className="wv-acts"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <button className="link" onClick={() => openEdit(w)}>
                {t('actions.edit')}
              </button>
              <button className="link danger" onClick={() => onDelete(w)}>
                {t('actions.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 新建入口：选择空白 / 从模板新建 */}
      {mode === 'choice' && (
        <Modal title={t('wanjie.newWorld')} onClose={() => setMode(null)}>
          <div className="nw-opt">
            <div className="nw-card" onClick={() => { setMode(null); setOpen(true); }}>
              <div className="nt">{t('templates.blankWorld')}</div>
              <div className="nd">{t('templates.blankWorldDesc')}</div>
            </div>
            <div className="nw-card" onClick={() => setMode('pick')}>
              <div className="nt">{t('templates.fromTemplate')}</div>
              <div className="nd">{t('templates.fromTemplateDesc')}</div>
            </div>
          </div>
        </Modal>
      )}

      {/* 从模板新建：挑选模板 */}
      {mode === 'pick' && (
        <Modal title={t('templates.fromTemplate')} onClose={() => setMode(null)} wide>
          {!tpls || tpls.length === 0 ? (
            <div className="dtable-empty">{t('templates.emptyPublic')}</div>
          ) : (
            <div className="tpl-grid">
              {tpls.map((tpl) => (
                <div className="tpl-card" key={tpl.id}>
                  <div className="tpl-cover" style={{ background: tpl.coverColor || 'linear-gradient(135deg,#c8453a,#8a2f6b)' }} />
                  <div className="tpl-body">
                    <div className="tpl-name">{tpl.name}</div>
                    {tpl.description && <div className="muted tpl-desc">{tpl.description}</div>}
                    <div className="tagrow">
                      {tpl.category && <span className="tag">{tpl.category}</span>}
                      <span className={'tag ' + (tpl.visibility === 'public' ? 'tag-pub' : 'tag-priv')}>
                        {tpl.visibility === 'public' ? t('templates.public') : t('templates.private')}
                      </span>
                    </div>
                    <div className="tpl-actions">
                      <button className="mini-btn" disabled={fork.isPending} onClick={() => onFork(tpl.id)}>
                        {t('templates.fork')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* 空白世界表单 */}
      {open && (
        <Modal title={editing ? t('wanjie.edit') : t('wanjie.create')} onClose={() => setOpen(false)}>
          <Field label={t('wanjie.name')}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('wanjie.description')}>
            <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label={t('wanjie.visibility')}>
            <select value={form.visibility ?? 'private'} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          </Field>
          <Field label={t('wanjie.coverColor')}>
            <input value={form.coverColor ?? ''} placeholder="#d4af37" onChange={(e) => setForm({ ...form, coverColor: e.target.value })} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={submit} disabled={create.isPending || update.isPending}>
              {t('actions.save')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
