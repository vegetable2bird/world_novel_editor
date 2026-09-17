import { useTranslation } from 'react-i18next';
import { useUi } from '../store/ui';
import { toggleTheme } from '../theme';
import i18n, { SUPPORTED_LOCALES } from '../i18n';

export function WanJie() {
  const { t } = useTranslation();
  const clearAuth = useUi((s) => s.clearAuth);
  const setLocale = useUi((s) => s.setLocale);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">{t('terms.wanjie')}</div>
        <div className="spacer" />
        <button className="ghost" onClick={() => toggleTheme()}>
          {t('terms.settingState') === '设定态' ? '🌗' : '🌗'}
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

      <main className="content">
        <h2>{t('wanjie.title')}</h2>
        <p className="muted">{t('wanjie.desc')}</p>

        {/* 高级表格占位：世界列表（Phase 4 接 API 后填充） */}
        <div className="dtable-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>{t('terms.wanjie')}</th>
                <th>{t('terms.info')}</th>
                <th>{t('actions.create')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="empty">
                  {t('wanjie.empty')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button className="primary">{t('wanjie.newWorld')}</button>
      </main>
    </div>
  );
}
