export type ThemeName = 'ink-gold' | 'light';

const KEY = 'wx-theme';

export function initTheme(): void {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'ink-gold';
  applyTheme(saved as ThemeName);
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'ink-gold');
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, theme);
}

export function toggleTheme(): ThemeName {
  const cur = document.documentElement.getAttribute('data-theme');
  const next: ThemeName = cur === 'light' ? 'ink-gold' : 'light';
  applyTheme(next);
  return next;
}
