import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBooks } from '../hooks/useBooks';
import {
  useChapters,
  useChapter,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
} from '../hooks/useChapters';

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  dirty: '待保存',
  saving: '保存中…',
  saved: '已保存',
  error: '保存失败，将随下次编辑重试',
};

/**
 * 写作台 · 书房模式：打开章节后整个壳层隐去，只剩一张书页。
 * 左上一枚浮动「章节」钮唤出章节抽屉；自动保存 900ms；底部细状态栏。
 */
export function Editor() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const bookId = sp.get('book') || undefined;
  const chapterId = sp.get('chapter') || undefined;

  const { data: books } = useBooks();
  const book = books?.find((b) => b.id === bookId);
  const { data: chapters } = useChapters(bookId);
  const { data: chapter } = useChapter(chapterId);
  const create = useCreateChapter(bookId);
  const update = useUpdateChapter();
  const del = useDeleteChapter(bookId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hydratedFor = useRef<string | null>(null);
  const baseLen = useRef(0);

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

  // Esc 收起章节抽屉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const select = (b: string, c?: string) =>
    setSp(c ? { book: b, chapter: c } : { book: b });

  const addChapter = () => {
    const n = (chapters?.length ?? 0) + 1;
    create.mutate(
      { title: `第 ${n} 章`, content: '' },
      { onSuccess: (ch) => select(ch.bookId, ch.id) },
    );
  };

  const removeChapter = (id: string) => {
    if (!window.confirm('删除这一章？正文将一并删除，且不可恢复。')) return;
    del.mutate(id, {
      onSuccess: () => {
        if (id === chapterId) select(bookId!);
      },
    });
  };

  const chapterIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1;
  const delta = content.length - baseLen.current;

  // 未选书：书籍选择
  if (!bookId) {
    return (
      <section>
        <div className="eyebrow">写作</div>
        <h1 className="title serif">写作台</h1>
        <div className="page-divider" />
        <p className="lede">选择一部作品开始写作。章节会自动保存，写作时整个界面会隐去，只剩一张书页。</p>
        <div className="tpl-grid">
          {(books ?? []).map((b) => (
            <button key={b.id} className="nw-card mode-card" onClick={() => select(b.id)}>
              <div className="nt">《{b.name}》</div>
              <div className="nd">{b._count?.chapters ?? 0} 个章节 · 点击进入</div>
            </button>
          ))}
        </div>
        {books && books.length === 0 && (
          <div className="dtable-empty">还没有作品，去「书籍」新建一部吧。</div>
        )}
      </section>
    );
  }

  return (
    <section className="writing-room">
      <button className="wr-drawer-btn" onClick={() => setDrawerOpen((v) => !v)} title="章节">
        <span className="wr-bars">☰</span> 章节
      </button>

      {drawerOpen && <div className="wr-scrim" onClick={() => setDrawerOpen(false)} />}
      <aside className={'wr-drawer' + (drawerOpen ? ' open' : '')}>
        <div className="wr-drawer-head">
          <div className="wr-book">《{book?.name ?? '…'}》</div>
          <button className="wr-close" onClick={() => setDrawerOpen(false)} title="收起 (Esc)">
            ✕
          </button>
        </div>
        <button className="btn-add" onClick={addChapter} disabled={create.isPending}>
          ＋ 新建章节
        </button>
        <div className="wr-chap-list">
          {(chapters ?? []).map((c) => (
            <div
              key={c.id}
              className={'wr-chap' + (c.id === chapterId ? ' active' : '')}
              onClick={() => select(bookId, c.id)}
            >
              <div className="wr-chap-t">
                <span>{c.title}</span>
                <button
                  className="wr-chap-del"
                  title="删除章节"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChapter(c.id);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="wr-chap-m">{c.charCount > 0 ? `${c.charCount} 字` : '空白'}</div>
            </div>
          ))}
          {chapters && chapters.length === 0 && <div className="cs">还没有章节</div>}
        </div>
      </aside>

      <div className="wr-page">
        <div className="wr-kicker">
          《{book?.name}》{chapterIndex >= 0 && <span> · 第 {chapterIndex + 1} 章</span>}
        </div>
        {chapter ? (
          <>
            <input
              className="wr-title"
              value={title}
              placeholder="章节标题"
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="wr-body"
              value={content}
              placeholder="从这里开始写……"
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </>
        ) : (
          <div className="dtable-empty" style={{ marginTop: 60 }}>
            点左上「章节」选择或新建一章，开始写作。
          </div>
        )}
      </div>

      <footer className="wr-status">
        <button className="wr-back" onClick={() => nav('/dashboard')} title="返回工作台">
          ← 返回
        </button>
        <span className="wr-stat">本章 {content.length} 字</span>
        <span className={'wr-stat' + (delta < 0 ? ' neg' : ' plus')}>
          本次 {delta >= 0 ? '+' : ''}
          {delta}
        </span>
        <span className={'wr-stat' + (status === 'error' ? ' err' : '')}>{STATUS_TEXT[status]}</span>
      </footer>
    </section>
  );
}
