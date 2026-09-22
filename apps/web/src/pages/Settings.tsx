import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { THEMES, getTheme, applyAccent, getAccent, type ThemeName } from '../theme';
import i18n, { SUPPORTED_LOCALES } from '../i18n';
import { ColorWheel } from '../components/ColorWheel';

const DEFAULT_ACCENT = '#6d4fd0';

export function Settings() {
  const { t } = useTranslation();
  const setLocale = useUi((s) => s.setLocale);
  const user = useUi((s) => s.user);
  const renderMode = useUi((s) => s.renderMode);
  const setRenderMode = useUi((s) => s.setRenderMode);
  const [cur] = useState<ThemeName>(getTheme());
  const [accent, setAccent] = useState<string>(getAccent() || DEFAULT_ACCENT);
  const [sec, setSec] = useState<'appearance' | 'account'>('appearance');
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>配置</h2>
          <p className="muted">主题与语言、主页渲染方式、账户信息。</p>
        </div>
      </div>

      <div className="set-grid">
        <nav className="set-nav">
          <button className={sec === 'appearance' ? 'active' : ''} onClick={() => setSec('appearance')}>
            外观
          </button>
          <button className={sec === 'account' ? 'active' : ''} onClick={() => setSec('account')}>
            账户
          </button>
        </nav>

        <div>
          {sec === 'appearance' && (
            <div className="card">
              <h3 className="section-h" style={{ marginTop: 0 }}>
                外观
              </h3>
              <div className="kv-row">
                <span className="k">主题</span>
                <span className="theme-name">{THEMES.find((x) => x.name === cur)?.label}</span>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <span>主题色（在色盘上拖动或点选精选色，全站即时生效）</span>
                <ColorWheel
                  value={accent}
                  onChange={(hex) => {
                    setAccent(hex);
                    applyAccent(hex);
                  }}
                />
                <button
                  className="mini-btn"
                  onClick={() => {
                    setAccent(DEFAULT_ACCENT);
                    applyAccent(null);
                  }}
                >
                  恢复默认主题色
                </button>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <span>主页渲染方式（登录页背景）</span>
                <div className="nw-opt">
                  {(
                    [
                      { m: 'dawn', t: '晨曦水面', d: '无鸟，仅光晕浮尘与水波 —— 最克制的留白（默认）' },
                      { m: 'phoenix', t: '琉璃凤凰', d: '凤凰化为标题上方的小徽记，去饱和处理' },
                      { m: 'wings', t: '晶莹双翼', d: '程序化玻璃羽翼衬于文字之后' },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.m}
                      className={'nw-card mode-card' + (renderMode === o.m ? ' sel' : '')}
                      onClick={() => setRenderMode(o.m)}
                    >
                      <div className="nt">{o.t}</div>
                      <div className="nd">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="kv-row" style={{ marginTop: 14 }}>
                <span className="k">语言</span>
                <select
                  className="ghost"
                  value={i18n.language}
                  onChange={(e) => {
                    i18n.changeLanguage(e.target.value);
                    setLocale(e.target.value);
                  }}
                >
                  {SUPPORTED_LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {sec === 'account' && (
            <div className="card">
              <h3 className="section-h" style={{ marginTop: 0 }}>
                账户
              </h3>
              <div className="kv-row">
                <span className="k">昵称</span>
                <span>{user?.displayName || '—'}</span>
              </div>
              <div className="kv-row">
                <span className="k">邮箱</span>
                <span>{user?.email || '—'}</span>
              </div>
              <div className="footnote">AI 模型密钥由后端代理保管，浏览器不直连供应商。配置入口建设中。</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
