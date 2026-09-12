import { z } from 'zod';

/**
 * AI 请求/响应 Zod 校验。前端组装请求与解析后端响应时使用。
 */

export const AIRequestSchema = z.object({
  worldId: z.string(),
  chapterId: z.string().optional(),
  contextBlock: z.string(),
  operationBlock: z.string(),
  styleBlock: z.string(),
  systemPrompt: z.string().optional(),
  providerHint: z.enum(['openai', 'deepseek', 'claude']).optional(),
  targetWords: z.number().optional(),
});

export const AIResponseSchema = z.object({
  content: z.string(),
  provider: z.string(),
  model: z.string(),
  usage: z
    .object({ promptTokens: z.number(), completionTokens: z.number() })
    .optional(),
});

/** AI 密钥缺失时的错误载荷（后端返回 501）。 */
export const AIKeyMissingSchema = z.object({
  error: z.literal('NO_API_KEY'),
  message: z.string().optional(),
});
