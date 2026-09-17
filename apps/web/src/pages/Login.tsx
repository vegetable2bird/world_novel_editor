import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useUi } from '../store/ui';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useUi((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        mode === 'login'
          ? { email, password }
          : { email, password, displayName: displayName || undefined };
      const res = await api.post<{ accessToken: string; user: any }>(path, body);
      setAuth(res.accessToken, res.user);
      navigate('/wanjie');
    } catch (err: any) {
      setError(err?.message || t('auth.login') + ' failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="brand">万象</h1>
        <p className="muted">{t('app.subtitle')}</p>
        <form onSubmit={submit} className="auth-form">
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === 'register' && (
            <input
              placeholder={t('auth.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          {error && <div className="err">{error}</div>}
          <button type="submit" disabled={busy}>
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>
        <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? t('auth.register') : t('auth.login')}
        </button>
      </div>
    </div>
  );
}
