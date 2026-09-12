import type { AIProviderConfig } from '../../types/ai';

/**
 * OpenAI / DeepSeek 预设（DeepSeek 兼容 OpenAI 接口，通过 baseURL 区分）。
 * 此处仅作为"可选项配置"，密钥仍由后端持有。前端不保存任何密钥。
 */
export const OPENAI_DEFAULT: AIProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  maxTokens: 4096,
};

export const DEEPSEEK_DEFAULT: AIProviderConfig = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  baseURL: 'https://api.deepseek.com/v1',
  temperature: 0.8,
  maxTokens: 4096,
};

export const OPENAI_LABEL = 'OpenAI';
export const DEEPSEEK_LABEL = 'DeepSeek';
