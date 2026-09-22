import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { THEMES, getTheme, applyAccent, getAccent, type ThemeName } from '../theme';
import i18n, { SUPPORTED_LOCALES } from '../i18n';
import { ColorWheel } from './ColorWheel';
import { Ripple } from './Ripple';

const DEFAULT_ACCENT = '#6d4fd0';

// 目录式导航：无图标、无分组，像书的目录
const NAV: { to: string; key: string }[] = [
  { to: '/dashboard', key: 'dashboard' },
  { to: '/wanjie', key: 'wanjie' },
  { to: '/books', key: 'books' },
  { to: '/characters', key: 'characters' },
  { to: '/templates', key: 'templates' },
  { to: '/editor', key: 'editor' },
  { to: '/console', key: 'console' },
  { to: '/settings', key: 'settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const clearAuth = useUi((s) => s.clearAuth);
  const setLocale = useUi((s) => s.setLocale);
  const user = useUi((s) => s.user);
  const loc = useLocation();
  const [themeOpen, setThemeOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [cur] = useState<ThemeName>(getTheme());
  const [accent, setAccent] = useState<string>(getAccent() || DEFAULT_ACCENT);
  const initial = (user?.displayName || user?.email || '林')?.slice(0, 1);

  // 路由变化时自动收起移动端抽屉
  useEffect(() => {
    setNavOpen(false);
  }, [loc.pathname]);

  const navNodes = NAV.map((n, i) => (
    <NavLink key={n.to} to={n.to} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
      <span className="nv-idx">{String(i + 1).padStart(2, '0')}</span>
      <span className="nv-txt">{t('nav.' + n.key)}</span>
    </NavLink>
  ));

  return (
    <div className={'app-shell' + (navOpen ? ' nav-open' : '')}>
      <Ripple />
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <button className="nav-fab" onClick={() => setNavOpen((v) => !v)} title="目录">
        ☰
      </button>

      <aside className="sidebar">
        <div className="brand-seal">
          <span className="seal">象</span>
          <span className="brand">万象</span>
          <span className="brand-en">WANXIANG&nbsp;ATELIER</span>
          <button className="side-close" onClick={() => setNavOpen(false)} title="关闭">
            ✕
          </button>
        </div>

        <nav className="side-nav">{navNodes}</nav>

        <div className="side-foot">
          <button
            className="theme-ic"
            onClick={() => {
              setThemeOpen((v) => !v);
              setUserOpen(false);
            }}
            title="主题色"
          >
            🎨
          </button>
          {themeOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setThemeOpen(false)} />
              <div className="theme-pop">
                <div className="tp-title">主题色 · {THEMES.find((x) => x.name === cur)?.label}</div>
                <ColorWheel
                  value={accent}
                  onChange={(hex) => {
                    setAccent(hex);
                    applyAccent(hex);
                  }}
                />
                <button
                  className="mini-btn"
                  style={{ width: '100%', marginTop: 10 }}
                  onClick={() => {
                    setAccent(DEFAULT_ACCENT);
                    applyAccent(null);
                  }}
                >
                  恢复默认主题色
                </button>
              </div>
            </>
          )}
          <select
            className="ghost lang-select"
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
          <div className="user-cluster">
            <button
              className="avatar-btn"
              title={user?.displayName || user?.email || ''}
              onClick={() => {
                setUserOpen((v) => !v);
                setThemeOpen(false);
              }}
            >
              {initial}
            </button>
            {userOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setUserOpen(false)} />
                <div className="user-pop">
                  <div className="up-name">{user?.displayName || '创作者'}</div>
                  <div className="up-mail">{user?.email || ''}</div>
                  <button
                    className="up-logout"
                    onClick={() => {
                      setUserOpen(false);
                      clearAuth();
                    }}
                  >
                    ⎋ {t('auth.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="main-col">
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
