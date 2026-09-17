import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { toggleTheme } from '../theme';
import i18n, { SUPPORTED_LOCALES } from '../i18n';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const clearAuth = useUi((s) => s.clearAuth);
  const setLocale = useUi((s) => s.setLocale);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">{t('terms.wanjie')}</div>
        <nav className="side-nav">
          <NavLink to="/wanjie" className="side-link">
            {t('nav.wanjie')}
          </NavLink>
          <NavLink to="/books" className="side-link">
            {t('nav.books')}
          </NavLink>
          <NavLink to="/characters" className="side-link">
            {t('nav.characters')}
          </NavLink>
        </nav>
        <div className="side-foot">{t('app.subtitle')}</div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="spacer" />
          <button className="ghost" onClick={() => toggleTheme()} title="theme">
            🌗
          </button>
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
          <button className="ghost" onClick={() => clearAuth()}>
            {t('auth.logout')}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
