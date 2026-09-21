import { Fragment, ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { THEMES, setTheme, getTheme, type ThemeName } from '../theme';
import i18n, { SUPPORTED_LOCALES } from '../i18n';

type NavItem = { to: string; icon: string; key: string; group: string };
const NAV: NavItem[] = [
  { to: '/dashboard', icon: '▦', key: 'dashboard', group: 'main' },
  { to: '/wanjie', icon: '🌐', key: 'wanjie', group: 'create' },
  { to: '/templates', icon: '📐', key: 'templates', group: 'create' },
  { to: '/books', icon: '📚', key: 'books', group: 'create' },
  { to: '/characters', icon: '🧬', key: 'characters', group: 'create' },
  { to: '/editor', icon: '✍️', key: 'editor', group: 'create' },
  { to: '/console', icon: '⚡', key: 'console', group: 'ai' },
  { to: '/settings', icon: '⚙️', key: 'settings', group: 'sys' },
];
const GROUP_LABELS: Record<string, string> = {
  main: '主菜单',
  create: '创作管理',
  ai: '智能',
  sys: '系统',
};
const CRUMB: Record<string, string> = {
  '/dashboard': '工作台',
  '/wanjie': '世界观管理',
  '/templates': '模板库',
  '/books': '书籍管理',
  '/characters': '角色管理',
  '/editor': '写作',
  '/console': 'AI 操作系统台',
  '/settings': '配置',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const clearAuth = useUi((s) => s.clearAuth);
  const setLocale = useUi((s) => s.setLocale);
  const user = useUi((s) => s.user);
  const loc = useLocation();
  const crumb = loc.pathname.startsWith('/wanjie/') ? '世界观详情' : (CRUMB[loc.pathname] ?? '万象');
  const [themeOpen, setThemeOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [cur, setCur] = useState<ThemeName>(getTheme());
  const initial = (user?.displayName || user?.email || '林')?.slice(0, 1);

  // 路由变化时自动收起移动端抽屉
  useEffect(() => {
    setNavOpen(false);
  }, [loc.pathname]);

  let lastGroup = '';
  const navNodes = NAV.map((n) => {
    const sep =
      n.group !== lastGroup ? (
        <div className="nav-group" key={'g-' + n.group}>
          {GROUP_LABELS[n.group]}
        </div>
      ) : null;
    lastGroup = n.group;
    return (
      <Fragment key={n.to}>
        {sep}
        <NavLink to={n.to} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
          <span className="ic">{n.icon}</span> {t('nav.' + n.key)}
        </NavLink>
      </Fragment>
    );
  });

  return (
    <div className={'app-shell' + (navOpen ? ' nav-open' : '')}>
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <aside className="sidebar">
        <div className="brand-seal">
          <span className="seal">象</span>
          <span className="brand">万象</span>
          <button className="side-close" onClick={() => setNavOpen(false)} title="关闭">
            ✕
          </button>
        </div>
        <nav className="side-nav">{navNodes}</nav>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="nav-toggle" onClick={() => setNavOpen((v) => !v)} title="菜单">
            ☰
          </button>
          <div className="brand-mini">
            <span className="seal">象</span> 万象
          </div>
          <div className="crumb-box">
            <div className="crumb">{crumb}</div>
          </div>
          <div className="spacer" />
          <button className="theme-ic" onClick={() => setThemeOpen((v) => !v)} title="主题">
            🎨
          </button>
          {themeOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setThemeOpen(false)} />
              <div className="theme-pop">
                <div className="tp-title">主题预设</div>
                <div className="theme-grid">
                  {THEMES.map((tm) => (
                    <button
                      key={tm.name}
                      className={'theme-dot' + (cur === tm.name ? ' sel' : '')}
                      style={{ background: tm.swatch, borderColor: tm.border || 'transparent' }}
                      title={tm.label}
                      onClick={() => {
                        setTheme(tm.name);
                        setCur(tm.name);
                        setThemeOpen(false);
                      }}
                    />
                  ))}
                </div>
                <div className="theme-name">当前：{THEMES.find((x) => x.name === cur)?.label}</div>
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
          <button className="avatar-btn" title={user?.displayName || user?.email || ''}>
            {initial}
          </button>
          <button className="ghost logout-btn" onClick={() => clearAuth()}>
            {t('auth.logout')}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
