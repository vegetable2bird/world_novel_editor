// 测试替身：替代真实 openai SDK（仅测试用，由 vitest resolve.alias 注入）。
// 捕获传给 chat.completions.create 的 messages，并返回固定正文，绝不发真实网络请求。
const captured = { messages: undefined as any };

export const __captured = captured;

export default class OpenAI {
  constructor(_opts: any) {}
  chat = {
    completions: {
      create: async (params: any) => {
        captured.messages = params.messages;
        return {
          choices: [{ message: { content: 'mock-ai-content' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        };
      },
    },
  };
}
