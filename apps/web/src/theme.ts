// 万象主题系统：对齐原型 6 套预设（data-theme 切换 CSS 变量）
export type ThemeName = 'ink' | 'porcelain' | 'sakura' | 'aurora' | 'amethyst' | 'frost';

export interface ThemeMeta {
  name: ThemeName;
  label: string; // 中文名（产品铁律：界面文案用中文）
  swatch: string; // 预览底色
  border?: string; // 预览描边（浅底主题用）
}

export const THEMES: ThemeMeta[] = [
  { name: 'ink', label: '暗夜墨金', swatch: '#0b0f1a', border: '#d4af37' },
  { name: 'porcelain', label: '白瓷', swatch: '#f6f4ee' },
  { name: 'sakura', label: '樱粉', swatch: '#1a1320' },
  { name: 'aurora', label: '极光青', swatch: '#06141a' },
  { name: 'amethyst', label: '暮紫', swatch: '#120e22' },
  { name: 'frost', label: '清透玻璃', swatch: '#eaf1f8', border: '#2f8fe0' },
];

const KEY = 'wx-theme';

export function initTheme(): void {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'ink';
  applyTheme(saved as ThemeName);
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, theme);
}

export function getTheme(): ThemeName {
  return ((typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) ||
    'ink') as ThemeName;
}

export function setTheme(theme: ThemeName): void {
  applyTheme(theme);
}

export function toggleTheme(): ThemeName {
  const i = THEMES.findIndex((t) => t.name === getTheme());
  const next = THEMES[(i + 1) % THEMES.length];
  applyTheme(next.name);
  return next.name;
}
