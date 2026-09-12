import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// 测试替身（仅 vitest 使用）：把重型 AI SDK 别名到本地 stub，避免真实网络请求。
const openaiStub = fileURLToPath(new URL('./src/__tests__/__mocks__/openaiStub.ts', import.meta.url));
const anthropicStub = fileURLToPath(new URL('./src/__tests__/__mocks__/anthropicStub.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      openai: openaiStub,
      '@anthropic-ai/sdk': anthropicStub,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
