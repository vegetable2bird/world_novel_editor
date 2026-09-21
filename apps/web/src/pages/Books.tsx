import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWorlds } from '../hooks/useWorlds';
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from '../hooks/useBooks';
import { Modal, Field } from '../components/Modal';
import type { Book, CreateBookInput } from '../api/types';

export function Books() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: worlds } = useWorlds();
  const [worldId, setWorldId] = useState<string>('');
  const { data: books, isLoading, isError } = useBooks(worldId || undefined);
  const create = useCreateBook();
  const update = useUpdateBook();
  const remove = useDeleteBook();
  const [editing, setEditing] = useState<Book | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateBookInput>({ worldId: '', name: '' });

  function worldName(id: string) {
    return worlds?.find((w) => w.id === id)?.name ?? '—';
  }
  function openCreate() {
    setEditing(null);
    setForm({ worldId: worldId || worlds?.[0]?.id || '', name: '' });
    setOpen(true);
  }
  function openEdit(b: Book) {
    setEditing(b);
    setForm({
      worldId: b.worldId,
      name: b.name,
      description: b.description ?? '',
      order: b.order ?? undefined,
      runtimeJson: b.runtimeJson ?? '',
    });
    setOpen(true);
  }
  async function submit() {
    if (!form.name.trim() || !form.worldId) return;
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...form });
    } else {
      await create.mutateAsync(form);
    }
    setOpen(false);
  }
  async function onDelete(b: Book) {
    if (confirm(`${t('actions.delete')}：${b.name}？`)) await remove.mutateAsync(b.id);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{t('books.title')}</h2>
          <p className="muted">{t('books.desc')}</p>
        </div>
        <button className="primary" onClick={openCreate}>
          ＋ {t('books.newBook')}
        </button>
      </div>

      <div className="filter-row">
        <label className="muted">{t('books.world')}</label>
        <select value={worldId} onChange={(e) => setWorldId(e.target.value)}>
          <option value="">{t('books.allWorlds')}</option>
          {worlds?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>{t('books.name')}</th>
              <th>{t('books.description')}</th>
              <th>{t('books.world')}</th>
              <th>{t('books.chapters')}</th>
              <th>{t('books.instances')}</th>
              <th className="col-actions">{t('actions.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="empty">
                  …
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="empty err">
                  {t('common.error')}
                </td>
              </tr>
            )}
            {books?.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {t('books.empty')}
                </td>
              </tr>
            )}
            {books?.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td className="muted">{b.description || '—'}</td>
                <td>{worldName(b.worldId)}</td>
                <td>{b._count?.chapters ?? 0}</td>
                <td>{b._count?.instances ?? 0}</td>
                <td className="col-actions">
                  <button className="link" onClick={() => nav(`/editor?book=${b.id}`)}>
                    ✍ 写作
                  </button>
                  <button className="link" onClick={() => openEdit(b)}>
                    {t('actions.edit')}
                  </button>
                  <button className="link danger" onClick={() => onDelete(b)}>
                    {t('actions.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editing ? t('books.edit') : t('books.create')} onClose={() => setOpen(false)}>
          <Field label={t('books.world')}>
            <select value={form.worldId} onChange={(e) => setForm({ ...form, worldId: e.target.value })}>
              <option value="">—</option>
              {worlds?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('books.name')}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('books.description')}>
            <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label={t('books.order')}>
            <input
              type="number"
              value={form.order ?? ''}
              placeholder="0"
              onChange={(e) => setForm({ ...form, order: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label={t('books.runtime')}>
            <textarea value={form.runtimeJson ?? ''} placeholder='{}' onChange={(e) => setForm({ ...form, runtimeJson: e.target.value })} />
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
