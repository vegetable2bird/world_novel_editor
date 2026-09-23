import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorlds, useCreateWorld, useUpdateWorld, useDeleteWorld, useForkWorld } from '../hooks/useWorlds';
import { Modal, Field } from '../components/Modal';
import { Confirm } from '../components/Modal';
import type { World, CreateWorldInput } from '../api/types';

export function Worlds() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: worlds, isLoading, isError } = useWorlds();
  const create = useCreateWorld();
  const update = useUpdateWorld();
  const remove = useDeleteWorld();
  const fork = useForkWorld();

  const [editing, setEditing] = useState<World | null>(null);
  const [open, setOpen] = useState(false); // 空白世界表单
  const [mode, setMode] = useState<'choice' | 'pick' | null>(null); // 新建入口选择
  const [form, setForm] = useState<CreateWorldInput>({ name: '' });
  const [delTarget, setDelTarget] = useState<World | null>(null);

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
    setDelTarget(w);
  }
  async function doDelete() {
    if (delTarget) await remove.mutateAsync(delTarget.id);
    setDelTarget(null);
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

      {/* 新建入口：选择空白 / 从世界克隆 */}
      {mode === 'choice' && (
        <Modal title={t('wanjie.newWorld')} onClose={() => setMode(null)}>
          <div className="nw-opt">
            <div className="nw-card" onClick={() => { setMode(null); setOpen(true); }}>
              <div className="nt">{t('wanjie.blankWorld')}</div>
              <div className="nd">{t('wanjie.blankWorldDesc')}</div>
            </div>
            <div className="nw-card" onClick={() => setMode('pick')}>
              <div className="nt">{t('wanjie.fromWorld')}</div>
              <div className="nd">{t('wanjie.fromWorldDesc')}</div>
            </div>
          </div>
        </Modal>
      )}

      {/* 从世界克隆：挑选源世界（git 式 fork） */}
      {mode === 'pick' && (
        <Modal title={t('wanjie.fromWorld')} onClose={() => setMode(null)} wide>
          {!worlds || worlds.length === 0 ? (
            <div className="dtable-empty">{t('wanjie.empty')}</div>
          ) : (
            <div className="tpl-grid">
              {worlds.map((w) => (
                <div className="tpl-card" key={w.id}>
                  <div className="tpl-cover" style={{ background: w.coverColor || 'linear-gradient(135deg,#8a7bd8,#6d4fd0)' }} />
                  <div className="tpl-body">
                    <div className="tpl-name">{w.name}</div>
                    {w.description && <div className="muted tpl-desc">{w.description}</div>}
                    <div className="tagrow">
                      <span className="tag">{w._count?.books ?? 0} 书籍</span>
                      <span className="tag">{w._count?.characters ?? 0} 角色</span>
                    </div>
                    <div className="tpl-actions">
                      <button className="mini-btn" disabled={fork.isPending} onClick={() => onFork(w.id)}>
                        {t('wanjie.clone')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {delTarget && (
        <Confirm
          title={t('actions.delete')}
          message={`${t('actions.delete')}：${delTarget.name}？`}
          danger
          confirmText={t('actions.delete')}
          onConfirm={doDelete}
          onClose={() => setDelTarget(null)}
        />
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
