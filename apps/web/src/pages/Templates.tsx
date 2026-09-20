import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useForkTemplate,
} from '../hooks/useTemplates';
import { Modal, Field } from '../components/Modal';
import type { WorldTemplate, CreateTemplateInput } from '../api/types';

const SWATCHES = ['#d4af37', '#c8453a', '#3a6ec8', '#5f9e6f', '#9b59b6', '#2f8fe0', '#c77d3a'];

export function Templates() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useUi((s) => s.user);
  const [scope, setScope] = useState<'mine' | 'public'>('mine');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTemplateInput>({
    name: '',
    description: '',
    coverColor: SWATCHES[0],
    category: '',
    visibility: 'private',
  });

  const { data: tpls, isLoading } = useTemplates(scope);
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const remove = useDeleteTemplate();
  const fork = useForkTemplate();

  async function onFork(tpl: WorldTemplate) {
    const res = await fork.mutateAsync({ id: tpl.id });
    nav(`/wanjie/${res.worldId}`);
  }

  async function toggleVisibility(tpl: WorldTemplate) {
    await update.mutateAsync({
      id: tpl.id,
      visibility: tpl.visibility === 'public' ? 'private' : 'public',
    });
  }

  async function onDelete(tpl: WorldTemplate) {
    if (confirm(`${t('templates.confirmDelete')}：${tpl.name}？`)) {
      await remove.mutateAsync(tpl.id);
    }
  }

  function submit() {
    if (!form.name?.trim()) return;
    create.mutateAsync(form).then(() => setOpen(false));
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{t('templates.title')}</h2>
          <p className="muted">{t('templates.desc')}</p>
        </div>
        <button className="primary" onClick={() => { setForm({ name: '', description: '', coverColor: SWATCHES[0], category: '', visibility: 'private' }); setOpen(true); }}>
          ＋ {t('templates.newTemplate')}
        </button>
      </div>

      <div className="tabs2" style={{ marginBottom: 16 }}>
        <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>{t('templates.mine')}</button>
        <button className={scope === 'public' ? 'active' : ''} onClick={() => setScope('public')}>{t('templates.public')}</button>
      </div>

      {isLoading && <p className="muted">…</p>}
      {!isLoading && tpls?.length === 0 && (
        <div className="dtable-empty">
          {scope === 'mine' ? t('templates.empty') : t('templates.emptyPublic')}
        </div>
      )}

      <div className="tpl-grid">
        {tpls?.map((tpl) => {
          const mine = tpl.userId === user?.id;
          return (
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
                  {!mine && <span className="tag">{t('templates.author')}</span>}
                </div>
                <div className="tpl-actions">
                  <button className="mini-btn" disabled={fork.isPending} onClick={() => onFork(tpl)}>
                    {t('templates.fork')}
                  </button>
                  {mine && (
                    <>
                      <button className="mini-btn" disabled={update.isPending} onClick={() => toggleVisibility(tpl)}>
                        {tpl.visibility === 'public' ? t('templates.makePrivate') : t('templates.makePublic')}
                      </button>
                      <button className="mini-btn danger" disabled={remove.isPending} onClick={() => onDelete(tpl)}>
                        {t('actions.delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title={t('templates.newTemplate')} onClose={() => setOpen(false)}>
          <Field label={t('templates.name')}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('templates.description')}>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label={t('templates.category')}>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="如：西幻 / 都市 / 废土" />
          </Field>
          <Field label={t('templates.coverColor')}>
            <div style={{ display: 'flex', gap: 8 }}>
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, coverColor: c })}
                  style={{ width: 24, height: 24, borderRadius: 6, background: c, border: form.coverColor === c ? '2px solid var(--ink)' : '1px solid var(--border)', cursor: 'pointer' }}
                />
              ))}
            </div>
          </Field>
          <Field label={t('templates.visibility')}>
            <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="private">{t('templates.private')}</option>
              <option value="public">{t('templates.public')}</option>
            </select>
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={submit} disabled={create.isPending}>{t('actions.save')}</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
