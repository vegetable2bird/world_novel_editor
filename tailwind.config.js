/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2330',
        brand: '#5b3cc4',
        accent: '#e0a458',
      },
    },
  },
  // Tailwind 仅用于间距/栅格等原子类，与 MUI 组件样式互不冲突。
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
