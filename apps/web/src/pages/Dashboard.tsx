import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWorlds } from '../hooks/useWorlds';
import { useBooks } from '../hooks/useBooks';
import { useCharacters } from '../hooks/useCharacters';
import { useUi } from '../store/ui';

const ACTIVITY = [
  { ic: '世', t: '你创建了世界《霜与冠》', d: '作者动作 · 3 天前' },
  { ic: '章', t: '你完成了《霜与冠》第 3 章', d: '作者动作 · 2 小时前' },
  { ic: '模', t: '你导入了「西幻」世界模板', d: '作者动作 · 昨天' },
  { ic: '角', t: '你向万界新增了「顾长亭」', d: '作者动作 · 昨天' },
];

export function Dashboard() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useUi((s) => s.user);
  const { data: worlds } = useWorlds();
  const { data: books } = useBooks();
  const { data: chars } = useCharacters();

  const name = user?.displayName || '林墨';

  return (
    <section>
      <div className="eyebrow">工作台 · Dashboard</div>
      <h1 className="title serif">欢迎回来，{name}</h1>
      <p className="lede">下面是今天的进度与入口。（角色会在你的作品中参演，但角色的动态属于万界自身）</p>

      <div className="grid g3" style={{ marginBottom: 22 }}>
        <div className="card stat">
          <span className="n">{worlds?.length ?? 0}</span>
          <span className="l">我的世界</span>
        </div>
        <div className="card stat">
          <span className="n">{books?.length ?? 0}</span>
          <span className="l">我的作品（创作中）</span>
        </div>
        <div className="card stat">
          <span className="n">{chars?.length ?? 0}</span>
          <span className="l">万界活体角色</span>
        </div>
      </div>

      <div className="quick" style={{ marginBottom: 20 }}>
        <button className="qbtn" onClick={() => nav('/wanjie')}>
          <div className="qt">＋ 新建世界</div>
          <div className="qd">空白起步，或套用模板</div>
        </button>
        <button className="qbtn" onClick={() => nav('/characters')}>
          <div className="qt">🧬 万界</div>
          <div className="qd">管理你的活体角色</div>
        </button>
        <button className="qbtn" onClick={() => nav('/editor')}>
          <div className="qt">✍️ 继续写作</div>
          <div className="qd">《霜与冠》第 4 章</div>
        </button>
        <button className="qbtn" onClick={() => nav('/settings')}>
          <div className="qt">⚙️ AI 模型</div>
          <div className="qd">配置生成密钥</div>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 26 }}>
        <h3 className="section-h" style={{ marginTop: 0 }}>
          写作习惯
        </h3>
        <div className="grid g3">
          <div className="stat">
            <span className="n">6</span>
            <span className="l">连续写作天数 🔥</span>
          </div>
          <div className="stat">
            <span className="n">860</span>
            <span className="l">今日字数 / 目标 2000</span>
          </div>
          <div className="stat">
            <span className="n">33%</span>
            <span className="l">《霜与冠》总进度</span>
          </div>
        </div>
        <div className="habit-bar">
          <div style={{ width: '43%' }} />
        </div>
        <p className="small-note">小提示：保持每日落笔，连续 7 天可解锁「稳定创作」徽章；写作时右侧会显示出场角色的情绪，帮你把握戏感。</p>
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
            {worlds?.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  还没有世界
                </td>
              </tr>
            )}
            {worlds?.map((w) => (
              <tr key={w.id} className="clickable" onClick={() => nav('/wanjie')}>
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
        {ACTIVITY.map((a, i) => (
          <div className="rel" key={i}>
            <div className="av">{a.ic}</div>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{a.t}</div>
              <div className="rt">{a.d}</div>
            </div>
          </div>
        ))}
        <div className="footnote">注：角色的自身动态（情绪演进、相识经历等）属于万界自身，请进入「角色管理」查看。</div>
      </div>
    </section>
  );
}
