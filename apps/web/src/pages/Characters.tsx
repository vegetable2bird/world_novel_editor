import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacters, useCreateCharacter, useUpdateCharacter, useDeleteCharacter } from '../hooks/useCharacters';
import { useBooks } from '../hooks/useBooks';
import { useInstances, useCreateInstance, useUpdateInstance, useDeleteInstance } from '../hooks/useInstances';
import { Modal, Field } from '../components/Modal';
import type { Character, CreateCharacterInput, CharacterInstance, CreateInstanceInput } from '../api/types';

export function Characters() {
  const { t } = useTranslation();
  const { data: wanjie, isLoading: l1, isError: e1 } = useCharacters();
  const { data: books } = useBooks();
  const { data: instances, isLoading: l2, isError: e2 } = useInstances();
  const createC = useCreateCharacter();
  const updateC = useUpdateCharacter();
  const removeC = useDeleteCharacter();
  const createI = useCreateInstance();
  const updateI = useUpdateInstance();
  const removeI = useDeleteInstance();

  const [editingW, setEditingW] = useState<Character | null>(null);
  const [openW, setOpenW] = useState(false);
  const [formW, setFormW] = useState<CreateCharacterInput>({ name: '' });

  const [editingI, setEditingI] = useState<CharacterInstance | null>(null);
  const [openI, setOpenI] = useState(false);
  const [formI, setFormI] = useState<CreateInstanceInput>({ bookId: '', name: '' });

  function bookName(id?: string | null) {
    return books?.find((b) => b.id === id)?.name ?? '—';
  }

  // ---- 万界角色 ----
  function openCreateW() {
    setEditingW(null);
    setFormW({ name: '' });
    setOpenW(true);
  }
  function openEditW(c: Character) {
    setEditingW(c);
    setFormW({ name: c.name, archetype: c.archetype ?? '', bio: c.bio ?? '' });
    setOpenW(true);
  }
  async function submitW() {
    if (!formW.name.trim()) return;
    if (editingW) await updateC.mutateAsync({ id: editingW.id, ...formW });
    else await createC.mutateAsync(formW);
    setOpenW(false);
  }
  async function onDeleteW(c: Character) {
    if (confirm(`${t('actions.delete')}：${c.name}？`)) await removeC.mutateAsync(c.id);
  }

  // ---- 本作原生 ----
  function openCreateI() {
    setEditingI(null);
    setFormI({ bookId: books?.[0]?.id || '', name: '' });
    setOpenI(true);
  }
  function openEditI(i: CharacterInstance) {
    setEditingI(i);
    setFormI({
      bookId: i.bookId,
      name: i.name,
      role: i.role ?? '',
      bio: i.bio ?? '',
      characterId: i.characterId ?? undefined,
      originWorldId: i.originWorldId ?? undefined,
    });
    setOpenI(true);
  }
  async function submitI() {
    if (!formI.name.trim() || !formI.bookId) return;
    if (editingI) await updateI.mutateAsync({ id: editingI.id, ...formI });
    else await createI.mutateAsync(formI);
    setOpenI(false);
  }
  async function onDeleteI(i: CharacterInstance) {
    if (confirm(`${t('actions.delete')}：${i.name}？`)) await removeI.mutateAsync(i.id);
  }

  return (
    <section>
      {/* 万界角色 */}
      <div className="page-head">
        <div>
          <h2>
            <span className="badge badge-wanjie">{t('terms.wanjieCharacter')}</span> {t('characters.wanjieTitle')}
          </h2>
          <p className="muted">{t('characters.wanjieDesc')}</p>
        </div>
        <button className="primary" onClick={openCreateW}>
          ＋ {t('characters.newWanjie')}
        </button>
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>{t('characters.name')}</th>
              <th>{t('characters.archetype')}</th>
              <th>{t('characters.bio')}</th>
              <th>{t('characters.instances')}</th>
              <th>{t('characters.trails')}</th>
              <th className="col-actions">{t('actions.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {l1 && (
              <tr>
                <td colSpan={6} className="empty">
                  …
                </td>
              </tr>
            )}
            {e1 && (
              <tr>
                <td colSpan={6} className="empty err">
                  {t('common.error')}
                </td>
              </tr>
            )}
            {wanjie?.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {t('characters.emptyWanjie')}
                </td>
              </tr>
            )}
            {wanjie?.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">{c.archetype || '—'}</td>
                <td className="muted">{c.bio || '—'}</td>
                <td>{c._count?.instances ?? 0}</td>
                <td>{c._count?.trails ?? 0}</td>
                <td className="col-actions">
                  <button className="link" onClick={() => openEditW(c)}>
                    {t('actions.edit')}
                  </button>
                  <button className="link danger" onClick={() => onDeleteW(c)}>
                    {t('actions.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 本作原生 */}
      <div className="page-head sub">
        <div>
          <h2>
            <span className="badge badge-native">{t('terms.nativeCharacter')}</span> {t('characters.nativeTitle')}
          </h2>
          <p className="muted">{t('characters.nativeDesc')}</p>
        </div>
        <button className="primary" onClick={openCreateI}>
          ＋ {t('characters.newNative')}
        </button>
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>{t('characters.name')}</th>
              <th>{t('characters.book')}</th>
              <th>{t('characters.role')}</th>
              <th>{t('characters.source')}</th>
              <th className="col-actions">{t('actions.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {l2 && (
              <tr>
                <td colSpan={5} className="empty">
                  …
                </td>
              </tr>
            )}
            {e2 && (
              <tr>
                <td colSpan={5} className="empty err">
                  {t('common.error')}
                </td>
              </tr>
            )}
            {instances?.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('characters.emptyNative')}
                </td>
              </tr>
            )}
            {instances?.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="muted">{bookName(i.bookId)}</td>
                <td className="muted">{i.role || '—'}</td>
                <td className="muted">{i.character?.name ?? '—'}</td>
                <td className="col-actions">
                  <button className="link" onClick={() => openEditI(i)}>
                    {t('actions.edit')}
                  </button>
                  <button className="link danger" onClick={() => onDeleteI(i)}>
                    {t('actions.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 万界角色弹窗 */}
      {openW && (
        <Modal title={editingW ? t('characters.edit') : t('characters.newWanjie')} onClose={() => setOpenW(false)}>
          <Field label={t('characters.name')}>
            <input value={formW.name} onChange={(e) => setFormW({ ...formW, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('characters.archetype')}>
            <input value={formW.archetype ?? ''} onChange={(e) => setFormW({ ...formW, archetype: e.target.value })} />
          </Field>
          <Field label={t('characters.bio')}>
            <textarea value={formW.bio ?? ''} onChange={(e) => setFormW({ ...formW, bio: e.target.value })} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={submitW} disabled={createC.isPending || updateC.isPending}>
              {t('actions.save')}
            </button>
          </div>
        </Modal>
      )}

      {/* 本作原生弹窗 */}
      {openI && (
        <Modal title={editingI ? t('characters.edit') : t('characters.newNative')} onClose={() => setOpenI(false)}>
          <Field label={t('characters.book')}>
            <select value={formI.bookId} onChange={(e) => setFormI({ ...formI, bookId: e.target.value })}>
              <option value="">—</option>
              {books?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('characters.name')}>
            <input value={formI.name} onChange={(e) => setFormI({ ...formI, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t('characters.role')}>
            <input value={formI.role ?? ''} onChange={(e) => setFormI({ ...formI, role: e.target.value })} />
          </Field>
          <Field label={t('characters.source')}>
            <select
              value={formI.characterId ?? ''}
              onChange={(e) => setFormI({ ...formI, characterId: e.target.value || undefined })}
            >
              <option value="">—</option>
              {wanjie?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('characters.bio')}>
            <textarea value={formI.bio ?? ''} onChange={(e) => setFormI({ ...formI, bio: e.target.value })} />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={submitI} disabled={createI.isPending || updateI.isPending}>
              {t('actions.save')}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
