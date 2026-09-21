// 万象主题系统：丁香淡紫为唯一默认主题（对齐 noomo 配色气质）
// 用户可在色盘自定义主题色，存 localStorage，行内 CSS 变量覆盖预设。

export type ThemeName = 'lilac';

export interface ThemeMeta {
  name: ThemeName;
  label: string; // 中文名（产品铁律：界面文案用中文）
  swatch: string; // 预览底色
  border?: string; // 预览描边
}

export const THEMES: ThemeMeta[] = [{ name: 'lilac', label: '丁香淡紫', swatch: '#ddd3f6', border: '#6d4fd0' }];

const KEY = 'wx-theme';
const ACCENT_KEY = 'wx-accent';

export function initTheme(): void {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'lilac';
  applyTheme(saved === 'lilac' ? 'lilac' : 'lilac'); // 历史主题已下线，统一回落到默认
  initAccent();
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, theme);
}

export function getTheme(): ThemeName {
  return (((typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) ||
    'lilac') as ThemeName) === 'lilac'
    ? 'lilac'
    : 'lilac';
}

export function setTheme(theme: ThemeName): void {
  applyTheme(theme);
}

export function toggleTheme(): ThemeName {
  return getTheme();
}

/* ===== 自定义主题色（色盘） ===== */

type HSL = [number, number, number];

const hexToHsl = (hex: string): HSL => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  let hh = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = ([h, s, l]: HSL): string => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return '#' + to(rgb[0]) + to(rgb[1]) + to(rgb[2]);
};

/** 由主色推导衍生色：浅一号 accent-2、深一号 accent-ink */
const derive = (hex: string) => {
  const [h, s, l] = hexToHsl(hex);
  return {
    accent: hex,
    accent2: hslToHex([h, Math.max(30, s - 8), Math.min(88, l + 22)]),
    accentInk: hslToHex([h, Math.min(90, s + 10), Math.max(16, l - 22)]),
  };
};

export function getAccent(): string | null {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(ACCENT_KEY)) || null;
}

export function applyAccent(hex: string | null): void {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-2');
    root.style.removeProperty('--accent-ink');
    if (typeof localStorage !== 'undefined') localStorage.removeItem(ACCENT_KEY);
    return;
  }
  const d = derive(hex);
  root.style.setProperty('--accent', d.accent);
  root.style.setProperty('--accent-2', d.accent2);
  root.style.setProperty('--accent-ink', d.accentInk);
  if (typeof localStorage !== 'undefined') localStorage.setItem(ACCENT_KEY, hex);
}

function initAccent(): void {
  const saved = getAccent();
  if (saved) applyAccent(saved);
}
