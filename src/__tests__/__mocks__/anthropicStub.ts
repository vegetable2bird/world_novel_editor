// 测试替身：替代真实 @anthropic-ai/sdk（仅测试用，由 vitest resolve.alias 注入）。
export default class Anthropic {
  constructor(_opts: any) {}
  messages = {
    create: async () => ({
      content: [{ type: 'text', text: 'mock' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  };
}
