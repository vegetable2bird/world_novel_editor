import { create } from 'zustand';

interface UiState {
  token: string | null;
  user: { id: string; email: string; displayName: string | null } | null;
  setAuth: (token: string, user: UiState['user']) => void;
  clearAuth: () => void;
  locale: string;
  setLocale: (l: string) => void;
  /** 主页（登录页）背景渲染方式：琉璃凤凰 / 晶莹双翼 / 墨流粒子 */
  renderMode: 'phoenix' | 'wings' | 'flow';
  setRenderMode: (m: 'phoenix' | 'wings' | 'flow') => void;
}

const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('wx-token') : null;
const savedUser =
  typeof localStorage !== 'undefined' ? localStorage.getItem('wx-user') : null;

export const useUi = create<UiState>((set) => ({
  token: savedToken,
  user: savedUser ? JSON.parse(savedUser) : null,
  setAuth: (token, user) => {
    localStorage.setItem('wx-token', token);
    localStorage.setItem('wx-user', JSON.stringify(user));
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem('wx-token');
    localStorage.removeItem('wx-user');
    set({ token: null, user: null });
  },
  locale: typeof localStorage !== 'undefined' ? localStorage.getItem('wx-locale') || 'zh-CN' : 'zh-CN',
  setLocale: (l) => {
    localStorage.setItem('wx-locale', l);
    set({ locale: l });
  },
  renderMode:
    (typeof localStorage !== 'undefined' &&
      (localStorage.getItem('wx-render-mode') as 'phoenix' | 'wings' | 'flow')) ||
    'phoenix',
  setRenderMode: (m) => {
    localStorage.setItem('wx-render-mode', m);
    set({ renderMode: m });
  },
}));
