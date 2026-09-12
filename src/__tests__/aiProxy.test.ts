import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// 'openai' 经 vitest resolve.alias 指向本地 stub（见 vitest.config.ts），不会真实发网络请求。
// 通过 stub 导出的 __captured 读取传给模型客户端的 messages，验证三段式请求体组装。
import { __captured } from 'openai';
import { handleGenerate, type AIRequestBody } from '../../server/aiProxy';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const ENV_KEYS = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'CLAUDE_API_KEY', 'AI_PROVIDER'];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
  __captured.messages = undefined;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const validBody: AIRequestBody = {
  worldId: 'w',
  contextBlock: '【世界观】玄天宗为正道魁首。',
  operationBlock: '本次操作推演摘要：玄天宗北伐。',
  styleBlock: '- 文风基调：雄浑',
  systemPrompt: '你是雄浑风格的小说代笔。',
};

describe('aiProxy', () => {
  it('无密钥时返回 501 NO_API_KEY', async () => {
    const req: any = { body: validBody };
    const res = makeRes();
    await handleGenerate(req, res);
    expect(res.statusCode).toBe(501);
    expect(res.body.error).toBe('NO_API_KEY');
  });

  it('请求体缺少必要字段时返回 400 INVALID_REQUEST', async () => {
    const req: any = { body: { foo: 'bar' } };
    const res = makeRes();
    await handleGenerate(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('INVALID_REQUEST');
  });

  it('配置 OPENAI 密钥时正确组装三段式请求体并返回正文', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const req: any = { body: validBody };
    const res = makeRes();
    await handleGenerate(req, res);

    // 成功路径不显示设置 status（Express 默认 200），故校验 body 而非 statusCode
    expect(res.statusCode).toBe(0);
    expect(res.body.content).toBe('mock-ai-content');
    expect(res.body.provider).toBe('openai');

    // 验证请求体被正确拼装进模型调用
    expect(__captured.messages).toBeDefined();
    const sys = __captured.messages.find((m: any) => m.role === 'system');
    const user = __captured.messages.find((m: any) => m.role === 'user');
    expect(sys?.content).toContain('雄浑风格的小说代笔');
    expect(user.content).toContain('【第一部分 · 世界观上下文 / Lorebook】');
    expect(user.content).toContain('玄天宗为正道魁首');
    expect(user.content).toContain('【第二部分 · 操作与叙事推演】');
    expect(user.content).toContain('玄天宗北伐');
    expect(user.content).toContain('【第三部分 · 描写风格】');
    expect(user.content).toContain('文风基调：雄浑');
    expect(user.content).toContain('【约束】');
  });
});
