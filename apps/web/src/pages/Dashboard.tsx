import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWorlds } from '../hooks/useWorlds';
import { useBooks } from '../hooks/useBooks';
import { useCharacters } from '../hooks/useCharacters';
import { useUi } from '../store/ui';
import { Wings } from '../components/Wings';

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < hour) return Math.max(1, Math.floor(diff / min)) + ' 分钟前';
  if (diff < day) return Math.floor(diff / hour) + ' 小时前';
  if (diff < 30 * day) return Math.floor(diff / day) + ' 天前';
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function Dashboard() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useUi((s) => s.user);
  const { data: worlds } = useWorlds();
  const { data: books } = useBooks();
  const { data: chars } = useCharacters();

  const name = user?.displayName || '林墨';
  const totalWorlds = worlds?.length ?? 0;
  const totalBooks = books?.length ?? 0;
  const totalChars = chars?.length ?? 0;
  const totalChapters = (books ?? []).reduce((s, b) => s + (b._count?.chapters ?? 0), 0);

  const events = [
    ...(worlds ?? []).map((w) => ({ ic: '世', t: `创建了世界《${w.name}》`, at: w.createdAt })),
    ...(books ?? []).map((b) => ({ ic: '书', t: `新建了作品《${b.name}》`, at: b.createdAt })),
    ...(chars ?? []).map((c) => ({ ic: '角', t: `向万界新增了「${c.name}」`, at: c.createdAt })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 5);

  const firstBook = books?.[0];

  return (
    <section>
      <div className="hero-wing">
        <Wings compact />
        <div className="hero-inner">
          <div className="eyebrow">工作台</div>
          <h1 className="title serif">欢迎回来，{name}</h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            下面是你的创作概览与近期动态。（角色会在你的作品中参演，但角色的动态属于万界自身）
          </p>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 22 }}>
        <div className="card stat">
          <span className="n">{totalWorlds}</span>
          <span className="l">我的世界</span>
        </div>
        <div className="card stat">
          <span className="n">{totalBooks}</span>
          <span className="l">我的作品（创作中）</span>
        </div>
        <div className="card stat">
          <span className="n">{totalChars}</span>
          <span className="l">万界活体角色</span>
        </div>
      </div>

      <div className="quick" style={{ marginBottom: 20 }}>
        <button className="qbtn" onClick={() => nav('/wanjie')}>
          <div className="qt">＋ 新建世界</div>
          <div className="qd">空白起步，或套用模板</div>
        </button>
        <button className="qbtn" onClick={() => nav('/characters')}>
          <div className="qt">万界</div>
          <div className="qd">管理你的活体角色</div>
        </button>
        <button className="qbtn" onClick={() => nav('/editor')}>
          <div className="qt">继续写作</div>
          <div className="qd">{firstBook ? `《${firstBook.name}》` : '进入写作台'}</div>
        </button>
        <button className="qbtn" onClick={() => nav('/settings')}>
          <div className="qt">⚙️ 配置</div>
          <div className="qd">主题与 AI 模型</div>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 26 }}>
        <h3 className="section-h" style={{ marginTop: 0 }}>
          创作概览
        </h3>
        <div className="grid g3">
          <div className="stat">
            <span className="n">{totalWorlds}</span>
            <span className="l">世界总数</span>
          </div>
          <div className="stat">
            <span className="n">{totalBooks}</span>
            <span className="l">作品总数</span>
          </div>
          <div className="stat">
            <span className="n">{totalChapters}</span>
            <span className="l">章节总数</span>
          </div>
        </div>
        <p className="small-note">
          数据来自你的真实创作：世界、作品与章节计数实时同步。写作节奏、连续天数等习惯统计将在接入写作记录后呈现。
        </p>
      </div>

      <h3 className="section-h">我的世界</h3>
      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>世界</th>
              <th>简介</th>
              <th>书籍</th>
              <th>角色</th>
            </tr>
          </thead>
          <tbody>
            {totalWorlds === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  还没有世界
                </td>
              </tr>
            )}
            {worlds?.map((w) => (
              <tr key={w.id} className="clickable" onClick={() => nav('/wanjie/' + w.id)}>
                <td>
                  <span className="dot" style={{ background: w.coverColor || 'var(--accent)' }} />
                  {w.name}
                </td>
                <td className="muted">{(w.description || '—').slice(0, 40)}</td>
                <td>{w._count?.books ?? 0}</td>
                <td>{w._count?.characters ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 26 }}>
        <h3 className="section-h" style={{ marginTop: 0 }}>
          你的近期动态
        </h3>
        {events.length === 0 ? (
          <div className="dtable-empty">还没有动态，去创建一个世界开始你的创作吧。</div>
        ) : (
          events.map((a, i) => (
            <div className="rel" key={i}>
              <div className="av">{a.ic}</div>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{a.t}</div>
                <div className="rt">{ago(a.at)}</div>
              </div>
            </div>
          ))
        )}
        <div className="footnote">注：角色的自身动态（情绪演进、相识经历等）属于万界自身，请进入「角色管理」查看。</div>
      </div>
    </section>
  );
}
