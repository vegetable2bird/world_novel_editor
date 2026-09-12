import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端开发服务器：默认 5173，将 /api 代理到后端轻代理（默认 8787）。
// 后端持有 AI 密钥，前端只通过 /api/ai/generate 与之通信，密钥绝不进前端 bundle。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
