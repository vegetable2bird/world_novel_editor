import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorlds, useCreateWorld, useUpdateWorld, useDeleteWorld } from '../hooks/useWorlds';
import { Modal, Field } from '../components/Modal';
import type { World, CreateWorldInput } from '../api/types';

export function Worlds() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: worlds, isLoading, isError } = useWorlds();
  const create = useCreateWorld();
  const update = useUpdateWorld();
  const remove = useDeleteWorld();
  const [editing, setEditing] = useState<World | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateWorldInput>({ name: '' });

  function openCreate() {
    setEditing(null);
    setForm({ name: '' });
    setOpen(true);
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

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{t('worlds.title')}</h2>
          <p className="muted">{t('worlds.desc')}</p>
        </div>
        <button className="primary" onClick={openCreate}>
          ＋ {t('worlds.newWorld')}
        </button>
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>{t('worlds.name')}</th>
              <th>{t('worlds.description')}</th>
              <th>{t('worlds.books')}</th>
              <th>{t('worlds.characters')}</th>
              <th className="col-actions">{t('actions.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="empty">
                  …
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="empty err">
                  {t('common.error')}
                </td>
              </tr>
            )}
            {worlds?.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('worlds.empty')}
                </td>
              </tr>
            )}
            {worlds?.map((w) => (
              <tr key={w.id}>
                <td>
                  <span className="dot" style={{ background: w.coverColor || 'var(--accent)' }} />
                  {w.name}
                </td>
                <td className="muted">{w.description || '—'}</td>
                <td>{w._count?.books ?? 0}</td>
                <td>{w._count?.characters ?? 0}</td>
                <td className="col-actions">
                  <button className="link" onClick={() => openEdit(w)}>
                    {t('actions.edit')}
                  </button>
                  <button className="link danger" onClick={() => onDelete(w)}>
                    {t('actions.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editing ? t('worlds.edit') : t('worlds.create')} onClose={() => setOpen(false)}>
          <Field label={t('worlds.name')}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('worlds.description')}>
            <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label={t('worlds.visibility')}>
            <select value={form.visibility ?? 'private'} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          </Field>
          <Field label={t('worlds.coverColor')}>
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
