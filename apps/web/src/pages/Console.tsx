import { useTranslation } from 'react-i18next';

const OPS = [
  { t: '⚡ 生成下一章', d: '按你的风格续写' },
  { t: '🌿 剧情分支', d: '给出 3 个走向' },
  { t: '🔍 一致性检查', d: '时间线 / 关系 / 变量' },
  { t: '💬 角色对话', d: '按性格生成对白' },
];

export function Console() {
  const { t } = useTranslation();
  return (
    <section>
      <div className="eyebrow">AI 操作系统台</div>
      <h1 className="title serif">AI 操作系统台</h1>
      <p className="lede">把 AI 当作你世界的「副驾驶」：一键生成、检查一致性、给出剧情分支。</p>
      <div className="grid g3">
        {OPS.map((o, i) => (
          <div className="card op" key={i}>
            <div className="ot">{o.t}</div>
            <div className="od">{o.d}</div>
          </div>
        ))}
      </div>
      <div className="card building" style={{ marginTop: 16 }}>
        <h3 className="section-h" style={{ marginTop: 0 }}>
          建设中
        </h3>
        <p className="muted">操作面板将接入后端 AI 代理（/api/ai/generate）。</p>
      </div>
    </section>
  );
}
