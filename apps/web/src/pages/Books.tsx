import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWorlds } from '../hooks/useWorlds';
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from '../hooks/useBooks';
import { Modal, Field, Confirm } from '../components/Modal';
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
  const [delTarget, setDelTarget] = useState<Book | null>(null);

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
    setDelTarget(b);
  }
  async function doDelete() {
    if (delTarget) await remove.mutateAsync(delTarget.id);
    setDelTarget(null);
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

      {/* 书架：一行为一部作品 */}
      {isLoading && <div className="dtable-empty">…</div>}
      {isError && <div className="dtable-empty err">{t('common.error')}</div>}
      {books && books.length === 0 && <div className="dtable-empty">{t('books.empty')}</div>}
      <div className="bk-list">
        {books?.map((b) => (
          <div key={b.id} className="bk-row">
            <div
              className="bk-cover"
              style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 62%, #fff), var(--accent))' }}
            >
              {b.name.charAt(0)}
            </div>
            <div className="bk-main">
              <div className="bk-name">《{b.name}》</div>
              <div className="bk-desc muted">{b.description || '（暂无简介）'}</div>
              <div className="bk-meta">
                <span className="pill">{worldName(b.worldId)}</span>
                <span className="pill">{b._count?.chapters ?? 0} 章节</span>
                <span className="pill">{b._count?.instances ?? 0} 角色</span>
              </div>
            </div>
            <div className="bk-acts">
              <button className="mini-btn bk-write" onClick={() => nav(`/editor?book=${b.id}`)}>
                写作
              </button>
              <button className="mini-btn" onClick={() => openEdit(b)}>
                {t('actions.edit')}
              </button>
              <button className="mini-btn danger" onClick={() => onDelete(b)}>
                {t('actions.delete')}
              </button>
            </div>
          </div>
        ))}
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
          <div className="modal-actions">
            <button className="primary" onClick={submit} disabled={create.isPending || update.isPending}>
              {t('actions.save')}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <Confirm
          title={t('actions.delete')}
          message={`${t('actions.delete')}：《${delTarget.name}》？`}
          danger
          confirmText={t('actions.delete')}
          onConfirm={doDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </section>
  );
}
