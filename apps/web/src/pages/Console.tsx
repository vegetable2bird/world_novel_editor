import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

const OPS = [
  { label: '生成下一章', hint: '按你的风格续写', system: '你是一位资深小说家的写作副驾驶，按用户给定的世界观与已有正文风格续写。' },
  { label: '剧情分支', hint: '给出 3 个走向', system: '你是剧情架构师，基于当前设定给出合理且富有张力的分支走向。' },
  { label: '一致性检查', hint: '时间线 / 关系 / 变量', system: '你是严谨的世界观编辑，检查时间线、人物关系与设定变量之间是否存在矛盾。' },
  { label: '角色对话', hint: '按性格生成对白', system: '你擅长代入角色，按其性格与处境生成自然、有张力的对白。' },
];

export function Console() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [system, setSystem] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [err, setErr] = useState('');

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setErr('');
    setResult('');
    try {
      const res = await api.post<{ text: string }>('/ai/generate', { prompt, system });
      setResult(res.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="eyebrow">AI 操作系统台</div>
      <h1 className="title serif">AI 操作系统台</h1>
      <p className="lede">把 AI 当作你世界的「副驾驶」：一键生成、检查一致性、给出剧情分支。</p>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        {OPS.map((o) => (
          <button
            key={o.label}
            className="card op op-btn"
            onClick={() => {
              setSystem(o.system);
              setPrompt((p) => p || `【${o.label}】${o.hint}：`);
            }}
          >
            <div className="ot">{o.label}</div>
            <div className="od">{o.hint}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        <label className="field" style={{ display: 'block', marginBottom: 12 }}>
          <span>指令</span>
          <textarea
            rows={5}
            value={prompt}
            placeholder="描述你希望 AI 做的事，例如：基于「凛冬王朝」的设定，续写第三章开头 300 字。"
            onChange={(e) => setPrompt(e.target.value)}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <div className="modal-actions">
          <button className="primary" onClick={generate} disabled={loading || !prompt.trim()}>
            {loading ? '生成中…' : '生成'}
          </button>
        </div>
        {err && (
          <div className="form-err" role="alert" style={{ marginTop: 12 }}>
            {err}
          </div>
        )}
        {result && (
          <div className="ai-result" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
        )}
      </div>
    </section>
  );
}
