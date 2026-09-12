import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 后端 AI 配置：从 server/data/ai-config.json 读取；若无则回退到 env（向后兼容 v1）。
 * 密钥只存在于此文件（服务端），前端永不持有。
 */

export interface AIServerConfig {
  provider: string; // 'claude' 或任意 OpenAI 兼容 provider key
  baseURL?: string;
  model: string;
  apiKey?: string;
}

const CONFIG_PATH = path.resolve(__dirname, 'data', 'ai-config.json');

let cache: AIServerConfig | null = null;

/** 加载配置：优先 ai-config.json，缺失时回退 env。 */
export function loadAIConfig(): AIServerConfig | null {
  if (cache) return cache;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as AIServerConfig;
      if (parsed && parsed.provider && parsed.model) {
        cache = parsed;
        return cache;
      }
    }
  } catch (e) {
    console.error('[aiConfig] 读取失败，回退 env：', e);
  }
  // 回退 v1 env（各 provider 独立判断，互不依赖 AI_PROVIDER 显式指定）
  const explicit = process.env.AI_PROVIDER as string | undefined;
  if (explicit === 'claude' && process.env.CLAUDE_API_KEY) {
    cache = {
      provider: 'claude',
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      apiKey: process.env.CLAUDE_API_KEY,
    };
    return cache;
  }
  if (explicit === 'openai' && process.env.OPENAI_API_KEY) {
    cache = {
      provider: 'openai',
      baseURL: undefined,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
    };
    return cache;
  }
  if (explicit === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
    cache = {
      provider: 'deepseek',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
    };
    return cache;
  }
  // 未显式指定时，自动挑选第一个已配置密钥
  if (process.env.OPENAI_API_KEY) {
    cache = {
      provider: 'openai',
      baseURL: undefined,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
    };
    return cache;
  }
  if (process.env.DEEPSEEK_API_KEY) {
    cache = {
      provider: 'deepseek',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
    };
    return cache;
  }
  if (process.env.CLAUDE_API_KEY) {
    cache = {
      provider: 'claude',
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      apiKey: process.env.CLAUDE_API_KEY,
    };
    return cache;
  }
  return null;
}

/** 保存配置（密钥写入服务端文件）。 */
export function saveAIConfig(cfg: AIServerConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  cache = cfg;
}

/** 前端保存接口：apiKey 留空时不覆盖已有密钥。 */
export function saveAIConfigPayload(input: {
  provider: string;
  baseURL?: string;
  model: string;
  apiKey?: string;
}): void {
  const existing = loadAIConfig();
  const next: AIServerConfig = {
    provider: input.provider,
    baseURL: input.baseURL,
    model: input.model,
    apiKey:
      input.apiKey && input.apiKey.trim()
        ? input.apiKey.trim()
        : existing?.apiKey ?? undefined,
  };
  saveAIConfig(next);
}

/** 返回前端可读的非敏感视图。 */
export function getConfigView(): {
  provider: string;
  baseURL: string;
  model: string;
  hasKey: boolean;
} | null {
  const c = loadAIConfig();
  if (!c) return null;
  return {
    provider: c.provider,
    baseURL: c.baseURL ?? '',
    model: c.model,
    hasKey: Boolean(c.apiKey),
  };
}
