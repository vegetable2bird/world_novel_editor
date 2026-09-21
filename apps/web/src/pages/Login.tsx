import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useUi } from '../store/ui';
import { Wings } from '../components/Wings';
import { Phoenix } from '../components/Phoenix';

type RGB = [number, number, number];

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useUi((s) => s.setAuth);
  const renderMode = useUi((s) => s.renderMode);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // 墨流背景：随主题变色的流场粒子（移植自原型 v2 登录 canvas）
  useEffect(() => {
    const canvas = canvasRef.current;
    const view = viewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const root = document.documentElement;

    const cssVar = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const hexToRgb = (h: string): RGB => {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const toRgb = (v: string): RGB => {
      v = (v || '').trim();
      if (v[0] === '#') return hexToRgb(v);
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(',').map(parseFloat);
        return [p[0], p[1], p[2]];
      }
      return [200, 200, 200];
    };
    const mix = (c: RGB, t: number): RGB => [
      Math.round(c[0] + (255 - c[0]) * t),
      Math.round(c[1] + (255 - c[1]) * t),
      Math.round(c[2] + (255 - c[2]) * t),
    ];

    let lp: RGB[] = [];
    let lBg: RGB = [11, 15, 26];
    let parts: any[] = [];
    let frame = 0;
    let perm: number[] = [];

    const buildNoise = (sd: number) => {
      const p: number[] = [];
      for (let i = 0; i < 256; i++) p[i] = i;
      const rng = () => {
        sd = (sd * 1664525 + 1013904223) & 0xffffffff;
        return (sd >>> 0) / 4294967296;
      };
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = p[i];
        p[i] = p[j];
        p[j] = tmp;
      }
      perm = p.concat(p);
    };
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const grad = (h: number, x: number, y: number) => {
      h &= 7;
      const u = h < 4 ? x : y;
      const v = h < 4 ? y : x;
      return (h & 1 ? -u : u) + (h & 2 ? -v : v);
    };
    const noise2 = (x: number, y: number) => {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fade(xf);
      const v = fade(yf);
      const aa = perm[perm[X] + Y];
      const ab = perm[perm[X] + Y + 1];
      const ba = perm[perm[X + 1] + Y];
      const bb = perm[perm[X + 1] + Y + 1];
      return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
    };

    const rebuildPalette = () => {
      const a = toRgb(cssVar('--accent'));
      const a2 = toRgb(cssVar('--accent-2'));
      const s = toRgb(cssVar('--seal'));
      lp = [a, a2, s, mix(a, 0.5), mix(s, 0.5), mix(a2, 0.4)];
      lBg = toRgb(cssVar('--bg'));
    };
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    const reset = (p: any) => {
      p.x = Math.random() * canvas.width;
      p.y = Math.random() * canvas.height;
      p.px = p.x;
      p.py = p.y;
      p.life = 0;
      p.max = 400 + Math.random() * 500;
      p.speed = 1.8 * (0.5 + Math.random());
      p.ci = Math.floor(Math.random() * lp.length);
    };
    const init = () => {
      buildNoise(Math.floor(Math.random() * 99999));
      parts = [];
      const n = Math.min(2200, Math.floor((canvas.width * canvas.height) / 800));
      for (let i = 0; i < n; i++) {
        const p: any = {};
        reset(p);
        parts.push(p);
      }
      ctx.fillStyle = `rgb(${lBg[0]},${lBg[1]},${lBg[2]})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      frame = 0;
    };
    let raf = 0;
    const animate = () => {
      ctx.fillStyle = `rgba(${lBg[0]},${lBg[1]},${lBg[2]},0.022)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.px = p.x;
        p.py = p.y;
        const ang = noise2(p.x * 0.0022, p.y * 0.0022 + frame * 0.00025) * Math.PI * 4;
        p.x += Math.cos(ang) * p.speed;
        p.y += Math.sin(ang) * p.speed;
        p.life++;
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height || p.life > p.max) reset(p);
        const c = lp[p.ci];
        const lr = Math.sin((p.life / p.max) * Math.PI) * 0.8;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${lr})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      frame++;
      raf = requestAnimationFrame(animate);
    };

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resize();
    rebuildPalette();
    init();
    if (reduced || renderMode !== 'flow') {
      // 非墨流模式：铺纯色底即可（翅膀画布在另一层渲染）
      ctx.fillStyle = `rgb(${lBg[0]},${lBg[1]},${lBg[2]})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      animate();
    }

    const onResize = () => {
      resize();
      init();
    };
    const onTheme = () => {
      rebuildPalette();
      init();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest('.login-wrap')) init();
    };
    window.addEventListener('resize', onResize);
    view?.addEventListener('click', onClick);
    const mo = new MutationObserver(onTheme);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      view?.removeEventListener('click', onClick);
      mo.disconnect();
    };
  }, [renderMode]);

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
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || t('auth.login') + ' failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-view" ref={viewRef}>
      {renderMode === 'flow' ? (
        <canvas ref={canvasRef} className="login-canvas" />
      ) : (
        <canvas ref={canvasRef} className="login-canvas" style={{ display: 'none' }} />
      )}
      {renderMode === 'wings' && <Wings />}
      {renderMode === 'phoenix' && <Phoenix />}
      <div className="login-vignette" />
      <div className="login-inner">
        <div className="login-hero">
          <div className="login-eyebrow">WORLD NOVEL EDITOR</div>
          <h1 className="login-brand">万象</h1>
          <p className="login-tagline">{t('app.subtitle')}</p>
        </div>
        <div className="login-wrap">
          <div className="tabs login-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              {t('auth.login')}
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
              {t('auth.register')}
            </button>
          </div>
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
          <div className="hint">支持邮箱注册与登录 · 背景墨流随主题变化</div>
        </div>
      </div>
    </div>
  );
}
