/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 与 CSS 变量联动，主题切换时自动跟随
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        seal: 'var(--seal)',
      },
    },
  },
  plugins: [],
};
