import type { Request, Response } from 'express';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { loadAIConfig } from './aiConfig';

/**
 * 后端 AI 代理：持有 env 中的密钥，接收前端的"三段式"请求体，
 * 拼装最终 prompt 并调用对应模型，返回纯正文。前端只与此端点通信，密钥绝不进前端。
 *
 * 若未配置任何密钥 -> 返回 501（前端据此降级为离线演示稿）。
 */

export interface AIRequestBody {
  worldId: string;
  chapterId?: string;
  contextBlock: string;
  operationBlock: string;
  styleBlock: string;
  systemPrompt?: string;
}

export interface AIResponseBody {
  content: string;
  provider: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

/** 未配置任何密钥时的错误（映射到 HTTP 501）。 */
class NoKeyError extends Error {}

// 提供方选择已迁移到 aiConfig（支持任意 OpenAI 兼容模型，含国产）。

/** 将三段式块拼装为最终 user prompt。 */
function assembleUserPrompt(body: AIRequestBody): string {
  return [
    '【第一部分 · 世界观上下文 / Lorebook】',
    body.contextBlock,
    '【第二部分 · 操作与叙事推演】',
    body.operationBlock,
    '【第三部分 · 描写风格】',
    body.styleBlock,
    '【约束】首尾不要解释、不输出元说明；严格回收 requiredForeshadows 中列出的伏笔；' +
      '保持文风与给定风格一致；输出纯正文（Markdown），不要附带"第X章"标题之外的解释文本。',
  ].join('\n\n');
}

/** 调用模型并返回统一响应。配置来源统一走 loadAIConfig（支持任意 OpenAI 兼容模型 + 国产模型）。 */
async function callModel(body: AIRequestBody): Promise<AIResponseBody> {
  const cfg = loadAIConfig();
  if (!cfg || !cfg.apiKey) throw new NoKeyError();

  const userPrompt = assembleUserPrompt(body);
  const provider = cfg.provider;
  const model = cfg.model;

  // Claude 走原生 SDK
  if (provider === 'claude') {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const resp = await client.messages.create({
      model,
      max_tokens: 4096,
      system: body.systemPrompt || undefined,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return {
      content: text,
      provider,
      model,
      usage: {
        promptTokens: resp.usage?.input_tokens ?? 0,
        completionTokens: resp.usage?.output_tokens ?? 0,
      },
    };
  }

  // 其余一律视为 OpenAI 兼容（openai / deepseek / 通义千问 / 智谱 / 豆包 / kimi / 阶跃 ...）
  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  const resp = await client.chat.completions.create({
    model,
    temperature: 0.8,
    max_tokens: 4096,
    messages: [
      ...(body.systemPrompt
        ? [{ role: 'system' as const, content: body.systemPrompt }]
        : []),
      { role: 'user', content: userPrompt },
    ],
  });
  return {
    content: resp.choices[0]?.message?.content ?? '',
    provider,
    model,
    usage: {
      promptTokens: resp.usage?.prompt_tokens ?? 0,
      completionTokens: resp.usage?.completion_tokens ?? 0,
    },
  };
}

/** POST /api/ai/generate 处理函数。 */
export async function handleGenerate(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = req.body as AIRequestBody;
    if (!body || typeof body.contextBlock !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: '请求体缺少必要字段' });
      return;
    }
    const result = await callModel(body);
    res.json(result);
  } catch (err) {
    if (err instanceof NoKeyError) {
      res.status(501).json({
        error: 'NO_API_KEY',
        message: '后端未配置任何 AI 密钥，前端将降级为离线演示稿。',
      });
      return;
    }
    console.error('[aiProxy] 生成失败：', err);
    res.status(500).json({
      error: 'GENERATION_FAILED',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
