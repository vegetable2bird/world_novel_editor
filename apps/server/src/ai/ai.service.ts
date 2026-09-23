import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface GenerateBody {
  prompt: string;
  system?: string;
  model?: string;
}

@Injectable()
export class AiService {
  /**
   * 代理到 OpenAI 兼容的聊天补全接口。
   * 密钥与 base URL 仅存于服务端环境变量（AI_API_KEY / AI_BASE_URL / AI_MODEL），
   * 浏览器永不持有密钥。
   */
  async generate(body: GenerateBody): Promise<{ text: string }> {
    const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const key = process.env.AI_API_KEY;
    const model = body.model || process.env.AI_MODEL || 'gpt-4o-mini';

    if (!key) {
      throw new HttpException(
        'AI 未配置：请在服务端设置环境变量 AI_API_KEY（可选 AI_BASE_URL / AI_MODEL）。',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    if (!body.prompt?.trim()) {
      throw new HttpException('prompt 不能为空', HttpStatus.BAD_REQUEST);
    }

    const messages: { role: string; content: string }[] = [];
    if (body.system?.trim()) messages.push({ role: 'system', content: body.system });
    messages.push({ role: 'user', content: body.prompt });

    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: 2000 }),
      });
    } catch (e) {
      throw new HttpException(
        '无法连接 AI 上游：' + (e instanceof Error ? e.message : String(e)),
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new HttpException('AI 上游返回 ' + res.status + '：' + text.slice(0, 300), HttpStatus.BAD_GATEWAY);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data?.choices?.[0]?.message?.content ?? '';
    return { text };
  }
}
