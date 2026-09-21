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
 * 写作台（最小可用版）：左章节列表，右标题 + 正文。
 * 输入停顿 900ms 自动保存；正文落库为当前版本（v1），为 AI 版本流留好结构。
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
  const hydratedFor = useRef<string | null>(null);

  // 章节切换时灌入本地编辑态（仅当切换目标变化时）
  useEffect(() => {
    if (chapter && chapter.id !== hydratedFor.current) {
      hydratedFor.current = chapter.id;
      setTitle(chapter.title);
      setContent(chapter.content);
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

  // 未选书：书籍选择
  if (!bookId) {
    return (
      <section>
        <div className="eyebrow">写作</div>
        <h1 className="title serif">写作台</h1>
        <div className="page-divider" />
        <p className="lede">选择一部作品开始写作。章节会自动保存，写作台保持极简。</p>
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
    <section className="editor-page">
      <div className="editor-split">
        <aside className="ed-chapters">
          <button className="mini-btn" style={{ width: '100%' }} onClick={() => nav('/editor')}>
            ← 换作品
          </button>
          <div className="ed-book-name">《{book?.name ?? '…'}》</div>
          <button className="btn-add" onClick={addChapter} disabled={create.isPending}>
            ＋ 新建章节
          </button>
          <div className="ed-chap-list">
            {(chapters ?? []).map((c) => (
              <div
                key={c.id}
                className={'ed-chap-item' + (c.id === chapterId ? ' active' : '')}
                onClick={() => select(bookId, c.id)}
              >
                <div className="ed-chap-t">
                  <span>{c.title}</span>
                  <button
                    className="ed-chap-del"
                    title="删除章节"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChapter(c.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="ed-chap-m">
                  {c.charCount > 0 ? `${c.charCount} 字` : '空白'}
                </div>
              </div>
            ))}
            {chapters && chapters.length === 0 && <div className="cs">还没有章节</div>}
          </div>
        </aside>

        <div className="ed-main">
          {chapter ? (
            <>
              <input
                className="ed-title"
                value={title}
                placeholder="章节标题"
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="ed-body"
                value={content}
                placeholder="从这里开始写……"
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="ed-status">
                <span>{content.length} 字</span>
                <span className={status === 'error' ? 'err' : 'muted'}>
                  {STATUS_TEXT[status]}
                </span>
              </div>
            </>
          ) : (
            <div className="dtable-empty" style={{ marginTop: 40 }}>
              在左侧选择章节，或「新建章节」开始写作。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
