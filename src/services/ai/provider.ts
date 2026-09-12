import type { AIRequest, AIResponse } from '../../types/ai';

/**
 * AI Provider 抽象层（前端侧）。
 *
 * 红线约束：前端只通过 `fetch('/api/ai/generate')` 与后端通信，
 * 真实密钥只在后端 server/.env，绝不进入前端 bundle。
 * 因此前端 Provider 实际是一个"远程代理调用器"（RemoteAIProvider）。
 */
export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}

/** 后端未配置任何密钥时的错误（HTTP 501）。 */
export class AIKeyMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIKeyMissingError';
  }
}

/** 无法连接后端（如 server 未启动）时的错误。 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** 远程 Provider：把请求发往后端轻代理 /api/ai/generate。 */
export class RemoteAIProvider implements AIProvider {
  constructor(private readonly baseUrl: string) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    const url = `${this.baseUrl}/api/ai/generate`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch {
      throw new NetworkError('无法连接 AI 后端，请确认 server 已启动（npm run dev）。');
    }

    if (res.status === 501) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      throw new AIKeyMissingError(data.message ?? '后端未配置任何 AI 密钥');
    }
    if (!res.ok) {
      throw new Error(`AI 服务返回错误（HTTP ${res.status}），请检查后端密钥与模型配置。`);
    }
    return (await res.json()) as AIResponse;
  }
}

/** 工厂：根据前端可读变量 VITE_API_BASE 构造远程 Provider。 */
export function createAIProvider(baseUrl?: string): AIProvider {
  const base =
    baseUrl ?? (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
  return new RemoteAIProvider(base);
}
