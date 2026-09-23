import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBooks } from '../hooks/useBooks';
import {
  useChapters,
  useChapter,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
} from '../hooks/useChapters';
import {
  useVolumes,
  useCreateVolume,
  useUpdateVolume,
  useDeleteVolume,
} from '../hooks/useVolumes';
import { Modal, Field, Confirm } from '../components/Modal';
import type { ChapterListItem, Volume } from '../api/types';

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * 写作台 · 书房模式：打开章节后整个壳层隐去，只剩一张书页。
 * 左上一枚浮动「章节」钮唤出目录抽屉；进入作品时抽屉自动展开（书 → 卷 → 章）。
 * 自动保存 900ms；底部细状态栏。
 */
export function Editor() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const bookId = sp.get('book') || undefined;
  const chapterId = sp.get('chapter') || undefined;

  const { data: books } = useBooks();
  const book = books?.find((b) => b.id === bookId);
  const { data: chapters } = useChapters(bookId);
  const { data: volumes } = useVolumes(bookId);
  const { data: chapter } = useChapter(chapterId);
  const create = useCreateChapter(bookId);
  const update = useUpdateChapter();
  const del = useDeleteChapter(bookId);
  const createVol = useCreateVolume(bookId);
  const updateVol = useUpdateVolume(bookId);
  const delVol = useDeleteVolume(bookId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [volRename, setVolRename] = useState<Volume | null>(null);
  const [volTitle, setVolTitle] = useState('');
  const [volDel, setVolDel] = useState<Volume | null>(null);
  const [chapDel, setChapDel] = useState<ChapterListItem | null>(null);
  const hydratedFor = useRef<string | null>(null);
  const autoOpenedFor = useRef<string | null>(null);
  const baseLen = useRef(0);

  const STATUS_TEXT: Record<SaveStatus, string> = {
    idle: '',
    dirty: t('writing.statusDirty'),
    saving: t('writing.statusSaving'),
    saved: t('writing.statusSaved'),
    error: t('writing.statusError'),
  };

  // 章节切换时灌入本地编辑态（仅当切换目标变化时）
  useEffect(() => {
    if (chapter && chapter.id !== hydratedFor.current) {
      hydratedFor.current = chapter.id;
      setTitle(chapter.title);
      setContent(chapter.content);
      baseLen.current = chapter.content.length;
      setStatus('saved');
    }
    if (!chapterId) {
      hydratedFor.current = null;
    }
  }, [chapter, chapterId]);

  // 进入一部作品后，目录抽屉先自动展开（每部书只自动开一次，之后由用户收起）
  useEffect(() => {
    if (bookId && autoOpenedFor.current !== bookId) {
      autoOpenedFor.current = bookId;
      setDrawerOpen(true);
    }
    if (!bookId) autoOpenedFor.current = null;
  }, [bookId]);

  // 自动保存：内容变化 900ms 后落库
  useEffect(() => {
    if (!chapter || chapter.id !== hydratedFor.current) return;
    if (title === chapter.title && content === chapter.content) return;
    setStatus('dirty');
    const timer = window.setTimeout(() => {
      setStatus('saving');
      update.mutate(
        { id: chapter.id, title, content },
        { onSuccess: () => setStatus('saved'), onError: () => setStatus('error') },
      );
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  // Esc 收起目录抽屉（弹窗打开时由弹窗自己接管）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const select = (b: string, c?: string) =>
    setSp(c ? { book: b, chapter: c } : { book: b });

  const addChapter = (volumeId?: string) => {
    const n = (chapters?.length ?? 0) + 1;
    create.mutate(
      { title: t('writing.newChapterName', { n }), content: '', volumeId },
      { onSuccess: (ch) => select(ch.bookId, ch.id) },
    );
  };

  const addVolume = () => {
    const n = (volumes?.length ?? 0) + 1;
    createVol.mutate({ title: t('writing.newVolumeName', { n }) });
  };

  const openRename = (v: Volume) => {
    setVolTitle(v.title);
    setVolRename(v);
  };

  const submitRename = async () => {
    if (!volRename || !volTitle.trim()) return;
    await updateVol.mutateAsync({ id: volRename.id, title: volTitle.trim() });
    setVolRename(null);
  };

  const doDeleteVolume = async () => {
    if (volDel) await delVol.mutateAsync(volDel.id);
    setVolDel(null);
  };

  const doDeleteChapter = async () => {
    if (chapDel) {
      const id = chapDel.id;
      await del.mutateAsync(id);
      if (id === chapterId) select(bookId!);
    }
    setChapDel(null);
  };

  const chapterIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1;
  const delta = content.length - baseLen.current;

  // 按卷分组（未分卷的章节归到兜底组）
  const inVolume = new Map<string, ChapterListItem[]>();
  const loose: ChapterListItem[] = [];
  for (const c of chapters ?? []) {
    if (c.volumeId) {
      const list = inVolume.get(c.volumeId);
      if (list) list.push(c);
      else inVolume.set(c.volumeId, [c]);
    } else {
      loose.push(c);
    }
  }

  const renderChapter = (c: ChapterListItem) => (
    <div key={c.id} className={'wr-chap' + (c.id === chapterId ? ' active' : '')}>
      <button className="wr-chap-main" onClick={() => select(bookId!, c.id)}>
        <span className="wr-chap-t">{c.title}</span>
        <span className="wr-chap-m">
          {c.charCount > 0 ? t('writing.charCount', { n: c.charCount }) : t('writing.blank')}
        </span>
      </button>
      <button
        className="wr-chap-del"
        title={t('writing.deleteChapter')}
        aria-label={t('writing.deleteChapter')}
        onClick={() => setChapDel(c)}
      >
        ✕
      </button>
    </div>
  );

  // 未选书：作品选择
  if (!bookId) {
    return (
      <section>
        <div className="eyebrow">{t('writing.eyebrow')}</div>
        <h1 className="title serif">{t('writing.title')}</h1>
        <div className="page-divider" />
        <p className="lede">{t('writing.pickBookDesc')}</p>
        <div className="tpl-grid">
          {(books ?? []).map((b) => (
            <button key={b.id} className="nw-card mode-card" onClick={() => select(b.id)}>
              <div className="nt">《{b.name}》</div>
              <div className="nd">
                {t('writing.bookMeta', {
                  v: b._count?.volumes ?? 0,
                  c: b._count?.chapters ?? 0,
                })}
              </div>
            </button>
          ))}
        </div>
        {books && books.length === 0 && (
          <div className="dtable-empty">{t('writing.pickBookEmpty')}</div>
        )}
      </section>
    );
  }

  return (
    <section className="writing-room">
      <button
        className="wr-drawer-btn"
        onClick={() => setDrawerOpen((v) => !v)}
        aria-expanded={drawerOpen}
        title={t('writing.drawer')}
      >
        <span className="wr-bars" aria-hidden="true">
          ☰
        </span>{' '}
        {t('writing.drawer')}
      </button>

      {drawerOpen && <div className="wr-scrim" onClick={() => setDrawerOpen(false)} />}
      <aside className={'wr-drawer' + (drawerOpen ? ' open' : '')}>
        <div className="wr-drawer-head">
          <div className="wr-book">《{book?.name ?? '…'}》</div>
          <button
            className="wr-close"
            onClick={() => setDrawerOpen(false)}
            title={t('writing.collapse')}
            aria-label={t('writing.collapse')}
          >
            ✕
          </button>
        </div>

        <div className="wr-add-row">
          <button className="btn-add" onClick={addVolume} disabled={createVol.isPending}>
            ＋ {t('writing.newVolume')}
          </button>
          <button
            className="btn-add"
            onClick={() => addChapter(volumes?.[volumes.length - 1]?.id)}
            disabled={create.isPending}
          >
            ＋ {t('writing.newChapter')}
          </button>
        </div>

        <div className="wr-chap-list">
          {(volumes ?? []).map((v) => {
            const list = inVolume.get(v.id) ?? [];
            return (
              <div className="wr-vol" key={v.id}>
                <div className="wr-vol-head">
                  <span className="wr-vol-t" title={v.title}>
                    {v.title}
                  </span>
                  <span className="wr-vol-n">{t('writing.chapterCount', { n: list.length })}</span>
                  <span className="wr-vol-acts">
                    <button
                      className="wr-vol-btn"
                      title={t('writing.addChapterToVolume')}
                      aria-label={t('writing.addChapterToVolume')}
                      onClick={() => addChapter(v.id)}
                    >
                      ＋
                    </button>
                    <button
                      className="wr-vol-btn"
                      title={t('writing.renameVolume')}
                      onClick={() => openRename(v)}
                    >
                      {t('writing.rename')}
                    </button>
                    <button
                      className="wr-vol-btn danger"
                      title={t('writing.deleteVolume')}
                      onClick={() => setVolDel(v)}
                    >
                      {t('writing.remove')}
                    </button>
                  </span>
                </div>
                {list.length === 0 && <div className="wr-vol-empty">{t('writing.volumeEmpty')}</div>}
                {list.map(renderChapter)}
              </div>
            );
          })}

          {loose.length > 0 && (
            <div className="wr-vol">
              <div className="wr-vol-head">
                <span className="wr-vol-t">{t('writing.ungrouped')}</span>
                <span className="wr-vol-n">{t('writing.chapterCount', { n: loose.length })}</span>
              </div>
              {loose.map(renderChapter)}
            </div>
          )}

          {chapters && chapters.length === 0 && <div className="cs">{t('writing.noChapters')}</div>}
        </div>
      </aside>

      <div className="wr-page">
        <div className="wr-kicker">
          《{book?.name}》{chapterIndex >= 0 && <span> · {t('writing.chapterOrdinal', { n: chapterIndex + 1 })}</span>}
        </div>
        {chapter ? (
          <>
            <input
              className="wr-title"
              value={title}
              placeholder={t('writing.chapterTitlePlaceholder')}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="wr-body"
              value={content}
              placeholder={t('writing.bodyPlaceholder')}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </>
        ) : (
          <div className="dtable-empty" style={{ marginTop: 60 }}>
            {t('writing.emptyHint')}
          </div>
        )}
      </div>

      <footer className="wr-status">
        <button className="wr-back" onClick={() => nav('/dashboard')} title={t('writing.backToDashboard')}>
          ← {t('writing.back')}
        </button>
        <span className="wr-stat">{t('writing.wordCount', { n: content.length })}</span>
        <span className={'wr-stat' + (delta < 0 ? ' neg' : ' plus')}>
          {t('writing.delta', { n: `${delta >= 0 ? '+' : ''}${delta}` })}
        </span>
        <span className={'wr-stat' + (status === 'error' ? ' err' : '')}>{STATUS_TEXT[status]}</span>
      </footer>

      {volRename && (
        <Modal title={t('writing.renameVolumeTitle')} onClose={() => setVolRename(null)}>
          <Field label={t('writing.volumeName')}>
            <input
              value={volTitle}
              onChange={(e) => setVolTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitRename();
              }}
              autoFocus
            />
          </Field>
          <div className="modal-actions">
            <button className="primary" onClick={submitRename} disabled={updateVol.isPending}>
              {t('actions.save')}
            </button>
          </div>
        </Modal>
      )}

      {volDel && (
        <Confirm
          title={t('writing.deleteVolume')}
          message={t('writing.deleteVolumeConfirm', { title: volDel.title })}
          danger
          confirmText={t('actions.delete')}
          onConfirm={doDeleteVolume}
          onClose={() => setVolDel(null)}
        />
      )}

      {chapDel && (
        <Confirm
          title={t('writing.deleteChapter')}
          message={t('writing.deleteChapterConfirm', { title: chapDel.title })}
          danger
          confirmText={t('actions.delete')}
          onConfirm={doDeleteChapter}
          onClose={() => setChapDel(null)}
        />
      )}
    </section>
  );
}
