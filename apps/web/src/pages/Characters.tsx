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

  const [tab, setTab] = useState<'wanjie' | 'native'>('wanjie');

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
      {/* 页头：标题 + 动态主按钮 */}
      <div className="page-head">
        <div>
          <h2>角色管理</h2>
          <p className="muted">万界角色是跨作品复用的活体资产；本作原生角色只属于某一本书。</p>
        </div>
        <button className="primary" onClick={tab === 'wanjie' ? openCreateW : openCreateI}>
          ＋ {tab === 'wanjie' ? t('characters.newWanjie') : t('characters.newNative')}
        </button>
      </div>

      {/* 分段切换 */}
      <div className="ch-tabs">
        <button className={tab === 'wanjie' ? 'active' : ''} onClick={() => setTab('wanjie')}>
          <span className="badge badge-wanjie">万界</span> 活体角色
          <span className="ch-count">{wanjie?.length ?? 0}</span>
        </button>
        <button className={tab === 'native' ? 'active' : ''} onClick={() => setTab('native')}>
          <span className="badge badge-native">本作</span> 原生角色
          <span className="ch-count">{instances?.length ?? 0}</span>
        </button>
      </div>

      {/* 万界角色 */}
      {tab === 'wanjie' && (
        <>
          {l1 && <div className="dtable-empty">…</div>}
          {e1 && <div className="dtable-empty err">{t('common.error')}</div>}
          {!l1 && !e1 && wanjie?.length === 0 && (
            <div className="dtable-empty">{t('characters.emptyWanjie')}</div>
          )}
          <div className="ch-grid">
            {wanjie?.map((c) => (
              <div key={c.id} className="ch-card">
                <div className="ch-top">
                  <div className="ch-av wanjie">{c.name.charAt(0)}</div>
                  <div className="ch-id">
                    <div className="ch-name">{c.name}</div>
                    {c.archetype && <span className="pill">{c.archetype}</span>}
                  </div>
                </div>
                <div className="ch-desc muted">{c.bio || '（暂无档案）'}</div>
                <div className="ch-meta">
                  {c._count?.instances ?? 0} 次参演 · {c._count?.trails ?? 0} 条轨迹
                </div>
                <div className="ch-acts">
                  <button className="link" onClick={() => openEditW(c)}>
                    {t('actions.edit')}
                  </button>
                  <button className="link danger" onClick={() => onDeleteW(c)}>
                    {t('actions.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 本作原生 */}
      {tab === 'native' && (
        <>
          {l2 && <div className="dtable-empty">…</div>}
          {e2 && <div className="dtable-empty err">{t('common.error')}</div>}
          {!l2 && !e2 && instances?.length === 0 && (
            <div className="dtable-empty">{t('characters.emptyNative')}</div>
          )}
          <div className="ch-grid">
            {instances?.map((i) => (
              <div key={i.id} className="ch-card">
                <div className="ch-top">
                  <div className="ch-av native">{i.name.charAt(0)}</div>
                  <div className="ch-id">
                    <div className="ch-name">{i.name}</div>
                    {i.role && <span className="pill">{i.role}</span>}
                  </div>
                </div>
                <div className="ch-meta">
                  《{bookName(i.bookId)}》 {i.character?.name ? `· 源自「${i.character.name}」` : '· 原创'}
                </div>
                <div className="ch-desc muted">{i.bio || '（暂无档案）'}</div>
                <div className="ch-acts">
                  <button className="link" onClick={() => openEditI(i)}>
                    {t('actions.edit')}
                  </button>
                  <button className="link danger" onClick={() => onDeleteI(i)}>
                    {t('actions.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
