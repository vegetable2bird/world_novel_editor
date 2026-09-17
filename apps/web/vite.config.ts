import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@wanxiang/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 本地联调时把 /api 代理到后端（生产由 nginx/同域处理）
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
  },
});
