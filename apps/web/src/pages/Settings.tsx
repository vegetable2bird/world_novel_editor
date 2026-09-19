import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { THEMES, setTheme, getTheme, type ThemeName } from '../theme';
import i18n, { SUPPORTED_LOCALES } from '../i18n';

export function Settings() {
  const { t } = useTranslation();
  const setLocale = useUi((s) => s.setLocale);
  const user = useUi((s) => s.user);
  const [cur, setCur] = useState<ThemeName>(getTheme());
  return (
    <section>
      <div className="eyebrow">配置</div>
      <h1 className="title serif">配置</h1>
      <p className="lede">主题与语言、AI 模型密钥配置。</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="section-h" style={{ marginTop: 0 }}>
          外观
        </h3>
        <div className="kv-row">
          <span className="k">主题</span>
          <span className="theme-name">{THEMES.find((x) => x.name === cur)?.label}</span>
        </div>
        <div className="theme-grid" style={{ marginTop: 12 }}>
          {THEMES.map((tm) => (
            <button
              key={tm.name}
              className={'theme-dot' + (cur === tm.name ? ' sel' : '')}
              style={{ background: tm.swatch, borderColor: tm.border || 'transparent' }}
              title={tm.label}
              onClick={() => {
                setTheme(tm.name);
                setCur(tm.name);
              }}
            />
          ))}
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
    </section>
  );
}
